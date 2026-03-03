import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, TextInput, Button, FlatList, View, Alert, ScrollView } from "react-native";

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



  //on screen load fetch both lists
  useEffect(() => {
    loadModules();
    loadCoursework();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
          CitySync (User {USER_ID})
        </Text>

        <Text>API: {API_BASE}</Text>
        <Text>Status: {status}</Text>

        {/* Create module */}
        <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 6 }}>
          Add Module
        </Text>

        <View style={{ gap: 8, marginBottom: 12 }}>
          <TextInput value={mCode} onChangeText={setMCode} placeholder="Code" style={{ borderWidth: 1, padding: 10 }} />
          <TextInput value={mName} onChangeText={setMName} placeholder="Name" style={{ borderWidth: 1, padding: 10 }} />
          <TextInput
            value={mCredits}
            onChangeText={setMCredits}
            placeholder="Credits"
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 10 }}
          />
          <Button title="Create Module" onPress={createModule} />
          <Button title="Refresh Modules" onPress={loadModules} />
        </View>

        {/* Module list */}
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 6 }}>
          Modules ({modules.length})
        </Text>

        <FlatList
          data={modules}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
//           scrollView for scrolling
          renderItem={({ item }) => (
            <View style={{ padding: 10, borderWidth: 1, marginBottom: 8 }}>
              <Text>{item.code} — {item.name}</Text>
              <Text>Credits: {item.credits ?? "n/a"} | Module ID: {item.id}</Text>

              <View style={{ marginTop: 8, gap: 8 }}>
                <Button

                  title="Quick Rename to 'Updated'"
                  onPress={() => updateModule(item.id, { name: "Updated" })}
                />
                <Button

                  title="Delete Module"
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
          ListEmptyComponent={<Text>No modules yet.</Text>}
        />

        {/* Create coursework */}

        <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 14, marginBottom: 6 }}>
          Add Coursework
        </Text>

        <View style={{ gap: 8, marginBottom: 12 }}>
          <TextInput
            value={cwModuleId}
            onChangeText={setCwModuleId}
            placeholder="Module ID"
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 10 }}
          />

          <TextInput value={cwTitle} onChangeText={setCwTitle} placeholder="Title" style={{ borderWidth: 1, padding: 10 }} />
          <TextInput
            value={cwDueDate}
            onChangeText={setCwDueDate}
            placeholder="Due Date (YYYY-MM-DD)"
            style={{ borderWidth: 1, padding: 10 }}

          />

          <TextInput
            value={cwWeighting}
            onChangeText={setCwWeighting}
            placeholder="Weighting"
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 10 }}
          />

          <Button title="Create Coursework" onPress={createCoursework} />
          <Button title="Refresh Coursework" onPress={loadCoursework} />
        </View>


        {/* Coursework list */}

        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 6 }}>
          Coursework ({coursework.length})
        </Text>

        <FlatList
          data={coursework}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={{ padding: 10, borderWidth: 1, marginBottom: 8 }}>
              <Text>{item.title}</Text>
              <Text>Due: {item.dueDate} | Weighting: {item.weighting ?? "n/a"}%</Text>
              <Text>Module ID: {item.moduleId}</Text>

              {/*completion UI */}
              <Text>Status: {item.completed ? "completed" : "pending"}</Text>

              {!item.completed ? (
                (() => {
                  const dl = daysUntil(item.dueDate);
                  const lvl = getReminderLevel(dl);
                  return (
                    <Text>
                      Reminder: {lvl.label} ({lvl.freq})
                    </Text>
                  );
                })()
              ) : null}

              <Button
                title={item.completed ? "Mark Incomplete" : "Mark Complete"}
                onPress={() => setCourseworkCompleted(item, !item.completed)}
              />

              <Button
                title="Delete"
                onPress={async () => {
                  try {
                    const res = await fetch(
                      `${API_BASE}/users/${USER_ID}/modules/${item.moduleId}/coursework/${item.id}`,
                      { method: "DELETE" }
                    );

                    if (!res.ok) {
                      const txt = await res.text();
                      Alert.alert("Delete failed", `${res.status}\n${txt}`);
                      return;
                    }

                    await loadCoursework();
                    setStatus(`deleted coursework ${item.id}`);
                  } catch (e: any) {
                    Alert.alert("Delete error", String(e?.message ?? e));
                  }
                }}
              />

            </View>

          )}
          ListEmptyComponent={<Text>No coursework yet.</Text>}
        />

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>

  );
}