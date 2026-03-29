import React, { useEffect, useMemo, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/hooks/useAuth";
import HeaderCard from "@/components/home/HeaderCard";
import { PrimBtn, SecBtn, DangerBtn } from "@/components/home/ActionBtns";
import type {CourseworkDto} from "@/lib/CwHelpers";
import GradeCard from "@/components/home/GradeCard";
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet,} from "react-native";
import ModuleCard from "@/components/home/ModuleCard";
import CwCard from "@/components/home/CwCard";
import { getModuleWeightTotal, formatDate, } from "@/lib/CwHelpers"


import {checkNotifPerms, scheduleCourseworkReminders, cancelCourseworkReminders} from "../../src/notifications/cwReminders";
//^importing to index from cwreminder
import { getUserId, authHeaders, API_BASE } from "@/lib/api";


//type helpers
type ModuleDto = { id: number; userId: number; code: string; name: string; credits: number | null };


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

 async function deleteCw(item: CourseworkDto){
    setStatus("deleteing coursework..");
    try{
        const USER_ID = await getUserId();//gets user id
        const res = await fetch (
        `${API_BASE}/users/${USER_ID}/modules/${item.moduleId}/coursework/${item.id}`,
            {//delete req to backend with auth token added
                method: "DELETE",
                headers: await authHeaders(),
            }
        );

        if(!res.ok){
            const txt = await res.text();
            setStatus(`delete coursewrok failed ${res.status}` );
            Alert.alert("Delete coursework failed", `${res.status}\n${txt}`);
            return;//stops executing if error returned
        }

        await cancelCourseworkReminders(item.id); //removes reminders for cw deleted
        setStatus(`deleted coursework ${item.id}`);
        await loadCoursework();
        //ui updates and cw lisr reloaded

        } catch (e: any){//for network erros /crashes
            setStatus("delete cw error");
            Alert.alert("Delete cw error",String(e?.message ?? e));
        }

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
          <HeaderCard
            userId={userId}
            status={status}
            stats={stats}
            onRefresh={() => { loadModules(); loadCoursework(); }}
            onLogout={logout}
          />

          <ModuleCard
            modules={modules}
            coursework={coursework}
            mCode={mCode}
            setMCode={setMCode}
            mName={mName}
            setMName={setMName}
            mCredits={mCredits}
            setMCredits={setMCredits}
            createModule={createModule}
            updateModule={updateModule}
            deleteModule={deleteModule}
          />

          <CwCard
            modules={modules}
            coursework={coursework}
            selectedModuleId={selectedModuleId}
            setSelectedModuleId={setSelectedModuleId}
            cwTitle={cwTitle}
            setCwTitle={setCwTitle}
            cwDueDateObj={cwDueDateObj}
            setCwDueDateObj={setCwDueDateObj}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            showTimePicker={showTimePicker}
            setShowTimePicker={setShowTimePicker}
            cwWeighting={cwWeighting}
            setCwWeighting={setCwWeighting}
            createCoursework={createCoursework}
            editingCwId={editingCwId}
            setEditingCwId={setEditingCwId}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editDueDateObj={editDueDateObj}
            setEditDueDateObj={setEditDueDateObj}
            editWeighting={editWeighting}
            setEditWeighting={setEditWeighting}
            editScorePercent={editScorePercent}
            setEditScorePercent={setEditScorePercent}
            updateCoursework={updateCoursework}
            setCourseworkCompleted={setCourseworkCompleted}
            startEditingCw={startEditingCw}
            deleteCw = {deleteCw}
          />

        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0b0f",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
});

