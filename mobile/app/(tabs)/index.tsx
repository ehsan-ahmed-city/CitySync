import React, { useEffect, useMemo, useState } from "react";
import {Alert,FlatList,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View,} from "react-native";

import {checkNotifPerms, scheduleCourseworkReminders, cancelCourseworkReminders} from "../../src/notifications/cwReminders";
//^importing to index from cwreminder

const API_BASE = "http://192.168.0.10:8080";//my laptop LAN ip
const USER_ID = 1;

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
};

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

  //module form
  const [mCode, setMCode] = useState("IN3007");
  const [mName, setMName] = useState("Individual Project");
  const [mCredits, setMCredits] = useState("45");

  //coursework form
  const [cwModuleId, setCwModuleId] = useState("1");
  const [cwTitle, setCwTitle] = useState("PDD submission");
  const [cwDueDate, setCwDueDate] = useState("2026-02-09");
  const [cwWeighting, setCwWeighting] = useState("30");

  async function loadModules() {//GET/users/{id}/modules
    setStatus("loading modules...");
    try {

      const res = await fetch(`${API_BASE}/users/${USER_ID}/modules`);
      const txt = await res.text(); //read as text first for dbugging

      if (!res.ok) {

        setStatus(`load modules failed ${res.status}`);
        Alert.alert("Load modules failed", `${res.status}\n${txt}`);
        return;

      }

      const json = JSON.parse(txt) as ModuleDto[];
      setModules(json);
      setStatus(`loaded ${json.length} modules`);
    } catch (e: any) {

      setStatus("load modules error");
      Alert.alert("Load modules error", String(e?.message ?? e));

    }
  }



  async function loadCoursework() { //get/users/{id}/coursework
    setStatus("loading coursework...");
    try {
      const res = await fetch(`${API_BASE}/users/${USER_ID}/coursework`);
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

      const res = await fetch(`${API_BASE}/users/${USER_ID}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      setStatus("create module ok :), refreshing...");
      await loadModules();//refresh list after succesful create

    } catch (e: any) {

      setStatus("create module error");
      Alert.alert("Creaet Module error", String(e?.message ?? e));

    }
  }



  async function createCoursework() {//POST/users/{id}/modules/{moduleId}/coursework
    setStatus("creating coursework...");
    try {

      const moduleIdNum = Number(cwModuleId);

      const res = await fetch(`${API_BASE}/users/${USER_ID}/modules/${moduleIdNum}/coursework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cwTitle,
          dueDate: cwDueDate,
          weighting: cwWeighting.trim() === "" ? null : Number(cwWeighting),
        }),
      });

      if (!res.ok) {//for backend failurs

        const txt = await res.text();
        setStatus(`create coursework failed ${res.status}`);
        Alert.alert("Create Coursework failed", `${res.status}\n${txt}`);
        return;

      }

      const created = (await res.json()) as CourseworkDto;//new created cw parsed from backend

      const ok = await checkNotifPerms ();//to check notif permission and schedule reminders
      if(ok){
        await scheduleCourseworkReminders(created);
      }

      setStatus("create coursework ok, refreshing...");
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

      const res = await fetch(//HTTP PUT request to backend
        `${API_BASE}/users/${USER_ID}/modules/${moduleId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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

      //HTTP delete request
      const res = await fetch(
        `${API_BASE}/users/${USER_ID}/modules/${moduleId}`,
        {
          method: "DELETE", //
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


  async function setCourseworkCompleted(item: CourseworkDto, completed: boolean) {//toggle completion heper

    setStatus(completed ? "marking complete..." : "marking incomplete...");

    try {

      const res = await fetch(
        `${API_BASE}/users/${USER_ID}/modules/${item.moduleId}/coursework/${item.id}`,
        {

          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        }
      );

      if (!res.ok) {

        const txt = await res.text();
        Alert.alert("Update falied", `${res.status}\n${txt}`);
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
    if (daysLeft <= 0) return { label: "OVERDUE", freq: "every 4 hours" };
    if (daysLeft <= 1) return { label: "URGENT", freq: "daily" };
    if (daysLeft <= 3) return { label: "SOON", freq: "every 2 days" };
    return { label: "NORMAL", freq: "weekly" };
  }

  function daysUntil(yyyyMmDd: string) {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const due = new Date(y, m - 1, d, 23, 59, 0, 0);
    const now = new Date();
    const ms = due.getTime() - now.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
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
            <Text style={styles.subTitle}>User {USER_ID} • {status}</Text>
            <View style={styles.pillRow}>
              <Pill label={`Modules: ${stats.modules}`} />
              <Pill label={`Coursework: ${stats.coursework}`} />
              <Pill label={`Pending: ${stats.pending}`} />
            </View>

            <View style={styles.headerBtns}>
              <SecondaryButton title="Refresh" onPress={() => { loadModules(); loadCoursework(); }} />
            </View>
          </View>

          {/* Add Module */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add module</Text>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Code</Text>
                <TextInput value={mCode} onChangeText={setMCode} style={styles.input} placeholder="e.g. IN3007" />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Credits</Text>
                <TextInput value={mCredits} onChangeText={setMCredits} style={styles.input} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput value={mName} onChangeText={setMName} style={styles.input} placeholder="Module name" />

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
                  </View>

                  <View style={{ gap: 8 }}>
                    <SecBtn title="Rename" onPress={() => updateModule(item.id, { name: "Updated" })} />
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

          {/* Add Coursework */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add coursework</Text>

            <View style={styles.formRow}>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Module ID</Text>
                <TextInput value={cwModuleId} onChangeText={setCwModuleId} style={styles.input} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Due date</Text>
                <TextInput value={cwDueDate} onChangeText={setCwDueDate} style={styles.input} placeholder="YYYY-MM-DD" />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Weight %</Text>
                <TextInput value={cwWeighting} onChangeText={setCwWeighting} style={styles.input} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput value={cwTitle} onChangeText={setCwTitle} style={styles.input} placeholder="Coursework title" />

            <View style={styles.rowGap}>
              <PrimaryBtn title="Create coursework" onPress={createCoursework} />
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

                return (
                  <View style={styles.itemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.muted}>
                        Due: {item.dueDate} • Module: {item.moduleId} • Weight: {item.weighting ?? "n/a"}%
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
                    </View>

                    <View style={{ gap: 8 }}>
                      <SecBtn
                        title={item.completed ? "Mark Incomplete" : "Mark Complete"}
                        onPress={() => setCourseworkCompleted(item, !item.completed)}
                      />
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.muted}>No coursework yet.</Text>}
            />
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
  btnDangerText: { color: "#ffb4bc", fontWeight: "800" },//delete buttons so it standss out

  badge: { marginTop: 10, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, overflow: "hidden", fontWeight: "800", backgroundColor: "#1f1f2a", color: "white" }, // status chip (completed/pending etc)
});