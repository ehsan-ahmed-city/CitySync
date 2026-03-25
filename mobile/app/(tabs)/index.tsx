import React, { useEffect, useMemo, useState } from "react";
import {Alert,FlatList,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,Button, View,} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/hooks/useAuth";

import {checkNotifPerms, scheduleCourseworkReminders, cancelCourseworkReminders} from "../../src/notifications/cwReminders";
//^importing to index from cwreminder
import { getUserId, authHeaders, API_BASE } from "@/lib/api";


//type helpers
type ModuleDto = { id: number; userId: number; code: string; name: string; credits: number | null };
type CourseworkDto = {
  id: number;
  moduleId: number;
  userId: number;
  title: string;
  dueDate: string;
  weighting: number | null;

  //completion fields
  completed?: boolean;
  completedAt?: string | null;
  scorePercent?: number | null;
};

function calcGrade(cwItems: CourseworkDto[]) {
  //uses only coursework with weightings
  const withWeight = cwItems.filter((c) => c.weighting != null && c.weighting > 0);
  if (withWeight.length === 0) return null;

  const allocWeight = withWeight.reduce((sum, c) => sum + c.weighting!, 0); //allocated weight

  const confirmedMark = withWeight .filter((c) => c.scorePercent != null) .reduce((sum,c)=> sum + (c.weighting! * c.scorePercent! / 100), 0);
  const completedWeight = withWeight
    .filter((c) => c.completed)
    .reduce((sum, c) => sum + c.weighting!, 0);

  const remainingWeight = Math.max(0,allocWeight - completedWeight);

  //minimum is 0 on remaining coursework
  const predictedMin = Math.round(confirmedMark);
  //max is 100 on remaining coursework
  const predictedMax = Math.min(100, Math.round(confirmedMark + remainingWeight));

  return {
    allocWeight, confirmedMark ,completedWeight,
    remainingWeight, predictedMin,predictedMax,
  };

}

function getModuleWeightTotal(moduleId: number, coursework: CourseworkDto[], excludeCourseworkId?: number){
    return coursework.filter(c => c.moduleId === moduleId).filter(c => excludeCourseworkId == null || c.id !== excludeCourseworkId)
    .reduce((sum, c) => sum + (c.weighting ?? 0), 0);

}

function formatDate(date: Date){
//^js date object to datetime string for backend
    const year = date.getFullYear();

    const month = String(date.getMonth() +1).padStart(2, "0");//using pastart sp it's like 01 or 03 instead of 1 or 3

    const day = String(date.getDate()).padStart(2, "0");
    //^this also padded to 2 digits

    const hours = String(date.getHours()).padStart(2,"0");
    const mins = String(date.getMinutes()).padStart(2,"0");
    const secs="00";//seconds dont matter

    return `${year}-${month}-${day}T${hours}:${mins}:${secs}`;

}

function gradeLabel(pct: number) {

  if (pct >= 70) return "First (1st)";
  if (pct >= 60) return "2:1";
  if (pct >= 50) return "2:2";
  if (pct >= 40) return "Third";
  return "Fail";
}

function gradeColour(pct: number) {

  if (pct >= 70) return "#22C55E";
  if (pct >= 60) return "#3B82F6";
  if (pct >= 50) return "#F59E0B";
  if (pct >= 40) return "#F97316";
  return "#EF4444";

}

function GradeCard({ moduleId, coursework }: { moduleId: number; coursework: CourseworkDto[] }) {
  const cwForModule = coursework.filter((c) => c.moduleId === moduleId);
  const grade = calcGrade(cwForModule);

  if (!grade) {

    return (

      <View style={gradeStyles.container}>
        <Text style={gradeStyles.heading}>Grade Prediction</Text>
        <Text style={gradeStyles.hint}>
          Add coursework with weightings to see your predicted grade.
        </Text>
      </View>

    );
  }

  const { allocWeight, confirmedMark ,completedWeight, remainingWeight, predictedMin, predictedMax } = grade;
  //^calculated vals for display

  const progressFraction = allocWeight > 0 ? completedWeight / allocWeight : 0;
  //^completed weighting shown as fraction of allocated weighting

  return (
    <View style={gradeStyles.container}>
      <Text style={gradeStyles.heading}>Grade Prediction</Text>

      <View style={gradeStyles.barTrack}>
        <View style={[gradeStyles.barFill, { flex: progressFraction }]} />
        <View style={{ flex: 1 - progressFraction }} />
      </View>

      <Text style={gradeStyles.barLabel}>
        {completedWeight}% of {allocWeight}% submitted
        {remainingWeight > 0 ? ` • ${remainingWeight}% remaining` : " all submitted"}
      </Text>

      <View style={gradeStyles.rangeRow}>
        <View style={gradeStyles.rangeBox}>

          <Text style={gradeStyles.rangeValue}>{predictedMin}%</Text>
          <Text style={[gradeStyles.rangeLabel, { color: gradeColour(predictedMin) }]}>

            {gradeLabel(predictedMin)}

          </Text>
          <Text style={gradeStyles.rangeHint}>Minimum{"\n"}(0% on rest)</Text>
        </View>

        <Text style={gradeStyles.rangeSep}>to</Text>

        <View style={gradeStyles.rangeBox}>
          <Text style={gradeStyles.rangeValue}>{predictedMax}%</Text>

          <Text style={[gradeStyles.rangeLabel, { color: gradeColour(predictedMax) }]}>
            {gradeLabel(predictedMax)}
          </Text>

          <Text style={gradeStyles.rangeHint}>Maximum{"\n"}(100% on rest)</Text>
        </View>
      </View>

      {allocWeight > 100 &&( //if saved weighting > 100
        <Text style = {[gradeStyles.hint, {color: "#EF4444"}]}>
            Invalid module input: coursework weighting exceeds 100%
        </Text>
      )}

      {remainingWeight === 0 && (

        <Text style={[gradeStyles.hint, { color: "#22C55E" }]}>

          All coursework submitted, final grade is {Math.round(confirmedMark)}%
        </Text>
      )}
    </View>
  );
}

function Pill({ label }: { label: string }){
//using pill for stats for modules, cw, and pending
  return (

    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );

}

function PrimBtn({ title, onPress }: { title: string; onPress: () => void }){
//primary action button in app
  return (//reduces opacity when pressed

    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}>

      <Text style={styles.btnPrimaryText}>{title}</Text>
    </Pressable>

  );
}

function SecBtn({ title, onPress }: { title: string; onPress: () => void }){
//secondary button as neutral
  return (

    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.85 }]}>

      <Text style={styles.btnSecondaryText}>{title}</Text>
    </Pressable>

  );
}

function DangerBtn({ title, onPress }: { title: string; onPress: () => void }){
//for stuff like delete
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnDanger, pressed && { opacity: 0.85 }]}>

      <Text style={styles.btnDangerText}>{title}</Text>

    </Pressable>
  );
}

export default function HomeScreen() {
  //lists
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [coursework, setCoursework] = useState<CourseworkDto[]>([]);

  const [status, setStatus] = useState("idle");
  const [userId, setUserId] = useState<number | null>(null);

  //module form
  const [mCode, setMCode] = useState("IN3007");
  const [mName, setMName] = useState("Individual Project");
  const [mCredits, setMCredits] = useState("45");

  //coursework form
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [cwTitle, setCwTitle] = useState("PDD submission");
  const [cwDueDateObj, setCwDueDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [cwWeighting, setCwWeighting] = useState("30");
  const [editScorePercent, setEditScorePercent] = useState("");

  //cw edit state
  const [editingCwId, setEditingCwId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDateObj, setEditDueDateObj] = useState<Date | null>(null);
  const [editWeighting, setEditWeighting] = useState("");
  const [showEditDP, setEditDP] = useState(false); //editing date picker and setter
  const [showEditTP, setEditTP] = useState(false); //editing time picker and setter

  const { logout } = useAuth();

  async function loadModules() {//GET/users/{id}/modules
    setStatus("loading modules...");
    try {

      const USER_ID = await getUserId();
      setUserId(USER_ID);

      const res = await fetch(`${API_BASE}/users/${USER_ID}/modules`, {
        headers: await authHeaders(),
      });
      const txt = await res.text(); //read as text first for dbugging

      if (!res.ok) {
        setStatus(`Load modules failed ${res.status}`);
        Alert.alert("Load modules failed", `${res.status}\n${txt}`);
        return;
      }

      const json = JSON.parse(txt) as ModuleDto[];
      setModules(json);

      if (json.length > 0 && selectedModuleId == null) {

        setSelectedModuleId(json[0].id);
        //^defaults to first module if isnt selected
      }

      setStatus(`loaded ${json.length} modules`);
    } catch (e: any) {

      setStatus("load modules error");
      Alert.alert("Load modules error", String(e?.message ?? e));

    }
  }



  async function loadCoursework() { //get/users/{id}/coursework
    setStatus("loading coursework...");
    try {
      const USER_ID = await getUserId();
      setUserId(USER_ID);

      const res = await fetch(`${API_BASE}/users/${USER_ID}/coursework`, {
        headers: await authHeaders(),
      });
      if (!res.ok) {

        const txt = await res.text();
        setStatus(`load coursework failed ${res.status}`);
        Alert.alert("Load coursework failed", `${res.status}\n${txt}`);

        return;
      }
      const json = (await res.json()) as CourseworkDto[];
      setCoursework(json);
      setStatus(`loaded ${json.length} coursework`);
    } catch (e: any) {

      setStatus("load coursework error");
      Alert.alert("Load coursework error", String(e?.message ?? e));

    }
  }



  async function createModule() {//POST/users/{id}/modules
    setStatus("creating module...");
    try {

      const USER_ID = await getUserId();

      const res = await fetch(`${API_BASE}/users/${USER_ID}/modules`, {
        method: "POST",
        headers: {
          ...(await authHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: mCode,
          name: mName,
          credits: mCredits.trim() === "" ? null : Number(mCredits),
        }),
      });

      const txt = await res.text();

      if (!res.ok) {

        setStatus(`create module failed ${res.status}`);
        Alert.alert("Create Module failed", `${res.status}\n${txt}`);
        return;

      }

      setStatus("module created, refreshing...");
      await loadModules();//refresh list after succesful create

    } catch (e: any) {

      setStatus("create module error");
      Alert.alert("Creaet Module error", String(e?.message ?? e));

    }
  }



  async function createCoursework() {//POST/users/{id}/modules/{moduleId}/coursework

    if (selectedModuleId == null) {
      Alert.alert("No module selected", "Create a module first.");
      //cant create cw unless a module is selected
      return;
    }

    const newWeight= cwWeighting.trim() === "" ? null : Number(cwWeighting);
        if (newWeight != null){
            if (isNaN(newWeight) || newWeight<0 || newWeight >100){ //checks for crap or invalid num
                Alert.alert("Invalid weighting","Weighting must be between 0 and 100");
            return;
        }

        const currentTotal = getModuleWeightTotal(selectedModuleId,coursework);
        if (currentTotal + newWeight > 100) {
            Alert.alert(
                "Weighting exceeds 100%",
                `This module already has ${currentTotal}% allocated, so adding ${newWeight}% would make ${currentTotal + newWeight}%`
                //so user understands why excess
            );
        return;
       }
      }

    setStatus("creating coursework...");
    try {

      const USER_ID = await getUserId();

      const res = await fetch(`${API_BASE}/users/${USER_ID}/modules/${selectedModuleId}/coursework`, {
        method: "POST",
        headers: {
          ...(await authHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: cwTitle,
          dueDate: formatDate(cwDueDateObj),
          weighting: newWeight,
        }),
      });

      if (!res.ok) {//for backend failurs

        const txt = await res.text();
        setStatus(`create coursework failed ${res.status}`);
        Alert.alert("Create coursework failed", `${res.status}\n${txt}`);
        return;
      }

      const created = (await res.json()) as CourseworkDto;//new created cw parsed from backend

      const ok = await checkNotifPerms ();//to check notif permission and schedule reminders
      if(ok){
        await scheduleCourseworkReminders(created);
      }
      setStatus("coursework created, refreshing...");

      await loadCoursework();//refresh list after successful create
        } catch (e: any) {
          setStatus("Create Coursework error");
          Alert.alert("Create Coursework error", String(e?.message ?? e));

        }


  }

function formatTime(date: Date) {
    //only time portion of date for ui
    const hours = String(date.getHours()).padStart(2,"0");
    const mins = String(date.getMinutes()).padStart(2,"0");

    return `${hours}:${mins}`;

}


  async function updateModule(
  //^updates an existing module
    moduleId: number,
    patch: Partial<{ code: string; name: string; credits: number | null }>
  ) {

    setStatus("updating module..."); //UI status feedback

    try {

      const USER_ID = await getUserId();

      const res = await fetch(//HTTP PUT request to backend
        `${API_BASE}/users/${USER_ID}/modules/${moduleId}`,
        {
          method: "PUT",
          headers: {
            ...(await authHeaders()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),//convert JS object to JSON string
        }
      );

      if (!res.ok) {

        //read any error message body
        const txt = await res.text();

        setStatus(`update module failed ${res.status}`);//Ui status show failure
        Alert.alert("Update Module failed", `${res.status}\n${txt}`);

        return;
      }

      //if success then reload module list to show new changes
      await loadModules();

      setStatus(`updated module ${moduleId}`);

    } catch (e: any) {

      setStatus("update module error");
      Alert.alert("Update Module error", String(e?.message ?? e));

    }
  }


  async function deleteModule(moduleId: number) { //deletes a module by ID

    //ui status feedback
    setStatus("deleting module...");

    try {

      const USER_ID = await getUserId();

      //HTTP delete request
      const res = await fetch(
        `${API_BASE}/users/${USER_ID}/modules/${moduleId}`,
        {
          method: "DELETE", //
          headers: await authHeaders(),
        }
      );

      //if backend returns failure
      if (!res.ok) {

        const txt = await res.text();

        setStatus(`delete module failed ${res.status}`);

        Alert.alert("Delete Module failed", `${res.status}\n${txt}`);

        return;
      }


      await loadModules();//refreshes modules list after deletion
      await loadCoursework();//reload coursework after module and coursework deletion

      setStatus(`deleted module ${moduleId}`);

    } catch (e: any) {
      setStatus("delete module error");
      Alert.alert("Delete Module error", String(e?.message ?? e));
    }
  }


  async function updateCoursework(item: CourseworkDto) {//updates title, due date and weighting for coursework

    const newTitle = editTitle.trim() || item.title;
    const newDueDate = editDueDateObj ?? new Date(item.dueDate);
    //obj because not keeping as string now^
    const newWeighting = editWeighting.trim() === "" ? item.weighting : Number(editWeighting.trim());


    if (newWeighting != null){
        if (isNaN(newWeighting) || newWeighting < 0 || newWeighting > 100) {
            Alert.alert("Invalid weighting","Weighting must be between 0 and 100");//invalid weighting edit gets rejected
            return;
        }

        const currentTotal = getModuleWeightTotal(item.moduleId, coursework, item.id);//doesn't count current item when editing
        if (currentTotal + newWeighting > 100){
           Alert.alert("Weighting exceeds 100%",
                `This module already has ${currentTotal}% allocated excluding this coursework, setting it to ${newWeighting}% would make ${currentTotal + newWeighting}%`);
           return;
        }
    }

    setStatus("updating coursework...");
    try {

      const USER_ID = await getUserId();

      const res = await fetch(
        `${API_BASE}/users/${USER_ID}/modules/${item.moduleId}/coursework/${item.id}`,
        {

          method: "PUT",
          headers: {

            ...(await authHeaders()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({

            title: newTitle,dueDate: formatDate(newDueDate),weighting: newWeighting,
            scorePercent: editScorePercent.trim() === "" ? null : Number(editScorePercent.trim()),
          }),

        }
      );

      if (!res.ok) {

        const txt = await res.text();
        setStatus(`update coursework failed ${res.status}`);
        Alert.alert("Update Coursework failed", `${res.status}\n${txt}`);
        return;
      }

      const updated = (await res.json()) as CourseworkDto;

      const ok = await checkNotifPerms();
      if (ok && !updated.completed) {

        await cancelCourseworkReminders(updated.id);
        //^cancel old reminders before rescheduling for new due date
        await scheduleCourseworkReminders(updated);
      }



      setEditingCwId(null);
      //^closes inline edit panel after save

      setStatus(`updated coursework ${item.id}`);
      await loadCoursework();

    } catch (e: any) {

      setStatus("update coursework error");
      Alert.alert("Update Coursework error", String(e?.message ?? e));

    }
  }


  async function setCourseworkCompleted(item: CourseworkDto, completed: boolean) {//toggle completion helper

    setStatus(completed ? "marking complete..." : "marking incomplete...");

    try {

      const USER_ID = await getUserId();

      const res = await fetch(
        `${API_BASE}/users/${USER_ID}/modules/${item.moduleId}/coursework/${item.id}`,
        {

          method: "PUT",
          headers: {
            ...(await authHeaders()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ completed }),
        }
      );

      if (!res.ok) {

        const txt = await res.text();
        Alert.alert("Update failed", `${res.status}\n${txt}`);
        return;

      }

      const updated = (await res.json()) as CourseworkDto;//parse updated cw from backend

      const ok = await checkNotifPerms();//to check notification perms enabled
      if(ok){

        if(updated.completed){
            await cancelCourseworkReminders(updated.id);
            //if cw complete then cancel all scheduled reminders for it
        }else{
            await scheduleCourseworkReminders(updated)//else if still incomplete then rechedule reminders for due date
        }

      }

      await loadCoursework();//refreshs list after with backend state

      setStatus(`coursework ${item.id} completed=${completed}`);
    } catch (e: any) {
      Alert.alert("Update error", String(e?.message ?? e));

    }

  }


  function getReminderLevel(daysLeft: number) {
  //reminders for how close a coursework is
    if (daysLeft <= 0) return { label: "OVERDUE", freq: "every 4 hours" };
    if (daysLeft <= 1) return { label: "URGENT", freq: "daily" };
    if (daysLeft <= 5) return { label: "SOON", freq: "every 2 days" };
    return { label: "NORMAL", freq: "weekly" };
  }

  function daysUntil(dateTimeString: string) {
    const due = new Date(dateTimeString);
    const ms = due.getTime() - Date.now();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function startEditingCw(item: CourseworkDto) {//opens edit panel and fills current coursework vals

    setEditingCwId(item.id);
    setEditTitle(item.title);
//     setEditDueDate(item.dueDate);
    setEditDueDateObj(new Date(item.dueDate));
    setEditWeighting(item.weighting != null ? String(item.weighting) : "");
    setEditScorePercent(item.scorePercent != null ? String(item.scorePercent) : "");
  }

  const stats = useMemo(() => {
    const completedCount = coursework.filter((c) => c.completed).length;
    return {
      modules: modules.length,
      coursework: coursework.length,
      completed: completedCount,
      pending: coursework.length - completedCount,
    };
  }, [modules.length, coursework]);

  //on screen load fetch both lists
  useEffect(() => {
    loadModules();
    loadCoursework();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}

          <View style={styles.header}>
            <Text style={styles.title}>CitySync</Text>
            <Text style={styles.subTitle}>User {userId ?? "?"} • {status}</Text>
            <View style={styles.pillRow}>

              <Pill label={`Modules: ${stats.modules}`} />
              <Pill label={`Coursework: ${stats.coursework}`} />
              <Pill label={`Pending: ${stats.pending}`} />
            </View>

            <View style={styles.headerBtns}>
              <SecBtn title="Refresh" onPress={() => { loadModules(); loadCoursework(); }} />
              <SecBtn title ="Logout" onPress = {logout} />
            </View>
          </View>

          {/* Add Module */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add module</Text>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Code</Text>
                <TextInput value={mCode} onChangeText={setMCode} style={styles.input} placeholder="e.g. IN3007" placeholderTextColor="#555" />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Credits</Text>
                <TextInput value={mCredits} onChangeText={setMCredits} style={styles.input} keyboardType="numeric" placeholderTextColor="#555" />
              </View>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput value={mName} onChangeText={setMName} style={styles.input} placeholder="Module name" placeholderTextColor="#555" />

            <View style={styles.rowGap}>
              <PrimBtn title="Create module" onPress={createModule} />
            </View>
          </View>

          {/* Modules list */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Modules</Text>

            <FlatList
              data={modules}
              keyExtractor={(m) => String(m.id)}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => (

                <View style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.code}</Text>
                    <Text style={styles.itemSub}>{item.name}</Text>
                    <Text style={styles.muted}>Credits: {item.credits ?? "n/a"} • ID: {item.id}</Text>

                    <GradeCard moduleId={item.id} coursework={coursework} />
                  </View>

                  <View style={{ gap: 8 }}>
                    <Button title="Rename" onPress={() =>
                        Alert.prompt(
                          "Rename module",
                          "Enter a new module name",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Save",
                              onPress: (value) => {

                                const nextName = value?.trim();
                                if (!nextName) return;
                                updateModule(item.id, { name: nextName });
                              },

                            },
                          ],
                          "plain-text",
                          item.name
                        )
                      }
                    />
                    <DangerBtn
                      title="Delete"
                      onPress={() =>
                        Alert.alert(
                          "Delete module?",
                          "This will also delete it's coursework",
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => deleteModule(item.id) },
                          ]
                        )
                      }
                    />
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.muted}>No modules yet.</Text>}
            />
          </View>

          {/*Add cw */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add coursework</Text>

            {/*changing module dropdown from id to text*/}
            <View style={{ borderWidth: 1, borderColor: "#2a2a3a", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
              <Picker
                selectedValue={selectedModuleId}
                onValueChange={(v) => setSelectedModuleId(v)}
              >
              {/*dropdown optins from the modules*/}
                {modules.map((m) => (

                  <Picker.Item
                    key={m.id}//for react list

                    label={`${m.code} — ${m.name} (ID ${m.id})`}
                    //^what user sees
                    value={m.id}//set into the module thats selected
                  />

                ))}
              </Picker>
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>

                <Text style={styles.label}>Due date</Text>

                <Pressable onPress = {() => setShowDatePicker(true)} style={styles.input}>
                    <Text style={{ color: "white" }}> {formatDate(cwDueDateObj).split("T")[0]} </Text>
                    {/* shows current selected date */}
                </Pressable>

                <Text style = {styles.label}> Due time  </Text>
                <Pressable onPress = {() => setShowTimePicker(true)} style={styles.input}>
                {/*should open time picker when press*/}
                    <Text style={{ color: "white" }}>{formatTime(cwDueDateObj)}</Text>
                    {/* shos current sleected time*/}
                </Pressable>
              </View>
              <View style={{ width: 110 }}>

                <Text style={styles.label}>Weight %</Text>
                <TextInput value={cwWeighting} onChangeText={setCwWeighting} style={styles.input} keyboardType="numeric" placeholderTextColor="#555" />
              </View>
            </View>

            {showDatePicker && (
                <DateTimePicker value ={cwDueDateObj} mode = "date"
                    display = "default" onChange={(event, selectedDate) =>{
                        setShowDatePicker(false);
                        if(selectedDate){setCwDueDateObj(selectedDate);}
                    }}/>
            )}

            {showTimePicker &&(
                <DateTimePicker value={cwDueDateObj} mode = "time" display ="default"
                //shows full datetime but only allowed to pick time
                onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    //close picker after selecting
                    if (selectedTime){
                        const next = new Date(cwDueDateObj);
                        //same existing date only time change

                        next.setHours(selectedTime.getHours());
                        next.setMinutes(selectedTime.getMinutes());
                        next.setSeconds(0); next.setMilliseconds(0);
                        //hours and seconds applied, miliseconds not needed

                        setCwDueDateObj(next);
                        //updated with new time

                        }
                    }}
                />
            )}

            <Text style={styles.label}>Title</Text>
            <TextInput value={cwTitle} onChangeText={setCwTitle} style={styles.input} placeholder="Coursework title" placeholderTextColor="#555" />

            <View style={styles.rowGap}>
              <PrimBtn title="Create coursework" onPress={createCoursework} />
            </View>
          </View>

          {/* Coursework list */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coursework</Text>

            <FlatList
              data={coursework}
              keyExtractor={(c) => String(c.id)}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => {

                const dl = daysUntil(item.dueDate);
                const lvl = getReminderLevel(dl);

                const isEditing = editingCwId === item.id;
                return (

                  <View style={styles.itemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.muted}>
                        Due: {item.dueDate} • Module: {item.moduleId} • Weight: {item.weighting ?? "n/a"}%
                        {item.scorePercent != null ? `•Mark: ${item.scorePercent}%` : ""}
                      </Text>

                      <Text style={styles.badge}>
                        {item.completed ? "completed" : "pending"}
                      </Text>

                      {!item.completed ? (
                        (() => {
                          return (

                            <Text style={styles.muted}>
                              Reminder: {lvl.label} ({lvl.freq})
                            </Text>

                          );
                        })()
                      ) : null}

                      {isEditing ? (

                        <View style={styles.editPanel}>
                          <Text style={styles.editLabel}>Title</Text>
                          <TextInput

                            value={editTitle}
                            onChangeText={setEditTitle}
                            style={styles.editInput}
                            placeholderTextColor="#555"
                          />

                          <Text style={styles.editLabel}>Due date</Text>
                          <Pressable onPress={() => setEditDP(true)} style={styles.editInput}>
                            <Text style = {{ color : "white" }}>
                                {editDueDateObj ? formatDate(editDueDateObj).split("T")[0] : ""}
                            </Text>
                          </Pressable>

                          <Text style={styles.editLabel}>Due timee</Text>
                          <Pressable onPress={() => setEditTP(true)} style={styles.editInput}>
                            <Text style = {{ color : "white" }}>
                                {editDueDateObj ? formatTime(editDueDateObj) : ""}
                            </Text>
                          </Pressable>

                            {/*the edit date picker*/}
                            {showEditDP && editDueDateObj &&(
                            //mode only for editing the date part
                                <DateTimePicker value={editDueDateObj} mode ="date" display = "default"
                                onChange={(event, selectedDate) => {
                                    setEditDP(false);//closes picker after seletcing/canceling
                                    if (selectedDate){
                                        const next = new Date(editDueDateObj);
                                        next.setFullYear(selectedDate.getFullYear(),selectedDate.getMonth(),selectedDate.getDate());
                                        setEditDueDateObj(next);
                                        //if selected them only date is changed and not time and is saved
                                    }
                                 }}
                              />)}

                            {/*dit time picker*/}
                            {showEditTP && editDueDateObj &&(
                                //mode only for editing the time part like hour/min
                                <DateTimePicker value={editDueDateObj} mode ="time" display = "default"
                                onChange={(event, selectedTime) => {
                                    setEditTP(false);//closes picker after seletcing/canceling
                                    if (selectedTime){
                                        const next = new Date(editDueDateObj);
                                        next.setHours(selectedTime.getHours());
                                        next.setMinutes(selectedTime.getMinutes());
                                        //^same date only time is changed

                                        next.setSeconds(0);
                                        next.setMilliseconds(0);
                                        //seconds and miliseconds not needed for cw deadline
                                        setEditDueDateObj(next);
                                        //if selected them only date is changed and not time and is saved
                                    }
                                 }}
                              />)}
                          <Text style={styles.editLabel}>Weight %</Text>
                          <TextInput

                            value={editWeighting}
                            onChangeText={setEditWeighting}
                            style={styles.editInput}
                            keyboardType="numeric"
                            placeholderTextColor="#555"

                          />

                          <Text style = {styles.editLabel}>Score %</Text>
                          <TextInput
                            value={editScorePercent}
                            onChangeText={setEditScorePercent}
                            style={styles.editInput}
                            keyboardType="numeric"
                            placeholder= "e.g 65"
                            placeholderTextColor= "#555"
                          />

                          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>

                            <PrimBtn title="Save" onPress={() => updateCoursework(item)} />
                            <SecBtn title="Cancel" onPress={() => setEditingCwId(null)} />

                          </View>
                        </View>

                      ) : null}
                    </View>

                    <View style={{ gap: 8 }}>
                      <SecBtn
                        title={item.completed ? "Mark Incomplete" : "Mark Complete"}
                        onPress={() => setCourseworkCompleted(item, !item.completed)}
                      />

                      {!isEditing ? (

                        <SecBtn
                          title="Edit"
                          onPress={() => startEditingCw(item)}
                        />
                      ) : null}
                    </View>
                  </View>
                );}}
              ListEmptyComponent={<Text style={styles.muted}>No coursework yet.</Text>}/>
          </View>

        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: "#0b0b0f" },container: { padding: 16, paddingBottom: 40, gap: 14 },//page padding/spacing
                   //^app bg
  header: { padding: 16, borderRadius: 18, backgroundColor: "#14141a", borderWidth: 1, borderColor: "#232331" },
  title: { fontSize: 28, fontWeight: "800", color: "white" },//title text
  subTitle: { marginTop: 6, color: "#a9a9b6" }, //subtitle text

  pillRow: { marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#1f1f2a", borderWidth: 1, borderColor: "#2b2b3b" },//container
  pillText: { color: "#d6d6df", fontWeight: "600" },//pill label

  headerBtns: { marginTop: 12, flexDirection: "row", gap: 10 },
  //^header button row

  card: { padding: 16, borderRadius: 18, backgroundColor: "#14141a", borderWidth: 1, borderColor: "#232331" },//sectn card container
  cardTitle: { color: "white", fontSize: 16, fontWeight: "800", marginBottom: 10 },
  label: { color: "#a9a9b6", marginBottom: 6, fontWeight: "600" },//the input label
  input: { backgroundColor: "#0f0f14", borderWidth: 1, borderColor: "#2a2a3a", borderRadius: 12, padding: 12, color: "white" },
  formRow: { flexDirection: "row", gap: 10, marginBottom: 12 },//row layot for grouped inputs
  rowGap: { marginTop: 12, gap: 10 },//spacing between button/rows

  itemCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "#0f0f14", borderWidth: 1, borderColor: "#262638" }, // list item card
  itemTitle: { color: "white", fontSize: 15, fontWeight: "800" },//title
  itemSub: { color: "#d6d6df", marginTop: 3, fontWeight: "600" },//item subtitle

  muted: { color: "#a9a9b6", marginTop: 6 },
  //^any text underneath

  btnPrimary: { backgroundColor: "#3b82f6", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnPrimaryText: { color: "white", fontWeight: "800" },//primary button text

  btnSecondary: { backgroundColor: "#1f1f2a", borderWidth: 1, borderColor: "#2b2b3b", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignItems: "center" }, // secondary button
  btnSecondaryText: { color: "white", fontWeight: "700" }, //secondary button text

  btnDanger: { backgroundColor: "#2a1214", borderWidth: 1, borderColor: "#4b1c21", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignItems: "center" }, // destructive button
  btnDangerText: { color: "#ffb4bc", fontWeight: "800" },//delete buttons so it stands out

  badge: { marginTop: 10, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, overflow: "hidden", fontWeight: "800", backgroundColor: "#1f1f2a", color: "white" }, // status chip (completed/pending etc)

  editPanel: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#12121c", borderWidth: 1, borderColor: "#2a2a40", gap: 6 }, // inline edit box
  editLabel: { color: "#a9a9b6", fontSize: 12, fontWeight: "600" },//edit label
  editInput: { backgroundColor: "#0f0f14", borderWidth: 1, borderColor: "#2a2a3a", borderRadius: 10, padding: 10, color: "white", fontSize: 14 }, // inline edit input


});

const gradeStyles = StyleSheet.create({

  container: {marginTop: 12,padding: 12,borderRadius: 12,backgroundColor: "#0a0a12",borderWidth: 1,
  borderColor: "#2a2a40", gap: 8,},

  heading: {color: "#d6d6df",fontWeight: "700",fontSize: 13,},

  barTrack: { flexDirection: "row", height: 8, borderRadius: 99, overflow: "hidden", backgroundColor: "#1f1f30",},
  barFill: { backgroundColor: "#3B82F6", borderRadius: 99,},
  barLabel: { color: "#a9a9b6", fontSize: 11,},

  rangeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 4,},
  rangeBox: {alignItems: "center",flex: 1,},
  rangeValue: { color: "white", fontSize: 22, fontWeight: "800",},
  rangeLabel: {fontSize: 12, fontWeight: "700", marginTop: 2,},

  rangeHint: {color: "#a9a9b6", fontSize: 10, textAlign: "center", marginTop: 2,},
  rangeSep: {color: "#a9a9b6", fontSize: 18, paddingHorizontal: 8,},
  hint: {color: "#a9a9b6", fontSize: 11,},

});