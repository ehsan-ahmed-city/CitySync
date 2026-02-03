import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, TextInput, Button, FlatList, View, Alert } from "react-native";

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
};

export default function HomeScreen() {
  //lists
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [coursework, setCoursework] = useState<CourseworkDto[]>([]);

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
    try {

      const res = await fetch(`${API_BASE}/users/${USER_ID}/modules`);
      if (!res.ok) {

        const txt = await res.text();
        Alert.alert("Load modules failed", `${res.status}\n${txt}`);
        return;

      }
      const json = (await res.json()) as ModuleDto[];
      setModules(json);
    } catch (e: any) {

      Alert.alert("Load modules error", String(e?.message ?? e));

    }
  }



  async function loadCoursework() { //get/users/{id}/coursework
    try {
      const res = await fetch(`${API_BASE}/users/${USER_ID}/coursework`);
      if (!res.ok) {

        const txt = await res.text();
        Alert.alert("Load coursework failed", `${res.status}\n${txt}`);

        return;
      }
      const json = (await res.json()) as CourseworkDto[];
      setCoursework(json);
    } catch (e: any) {


      Alert.alert("Load coursework error", String(e?.message ?? e));

    }
  }



  async function createModule() {//POST/users/{id}/modules
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

      if (!res.ok) {

        const txt = await res.text();
        Alert.alert("Create Module failed", `${res.status}\n${txt}`);
        return;

      }

      await loadModules();//refresh list after succesful create

    } catch (e: any) {

      Alert.alert("Creaet Module error", String(e?.message ?? e));

    }
  }



  async function createCoursework() {//POST/users/{id}/modules/{moduleId}/coursework
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

      if (!res.ok) {

        const txt = await res.text();
        Alert.alert("Create Coursework failed", `${res.status}\n${txt}`);
        return;

      }

      await loadCoursework();//refresh list after successful create

    } catch (e: any) {

      Alert.alert("Create Coursework error", String(e?.message ?? e));

    }
  }



  //on screen load, fetch both lists
  useEffect(() => {
    loadModules();
    loadCoursework();
  }, []);

  return (
    <SafeAreaView style={{ padding: 16, marginTop: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        CitySync (User {USER_ID})
      </Text>

      {/* Create module */}
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 6 }}>Add Module</Text>
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
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 6 }}>Modules</Text>
      <FlatList
        data={modules}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderWidth: 1, marginBottom: 8 }}>
            <Text>{item.code} — {item.name}</Text>
            <Text>Credits: {item.credits ?? "n/a"} | Module ID: {item.id}</Text>
          </View>
        )}
      />

      {/* Create coursework */}

      <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 14, marginBottom: 6 }}>Add Coursework</Text>
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

      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 6 }}>Coursework</Text>
      <FlatList
        data={coursework}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderWidth: 1, marginBottom: 8 }}>
            <Text>{item.title}</Text>
            <Text>Due: {item.dueDate} | Weighting: {item.weighting ?? "n/a"}%</Text>
            <Text>Module ID: {item.moduleId}</Text>
          </View>

        )}

      />

      <Text>Modules loaded: {modules.length}</Text>
      <Text>Coursework loaded: {coursework.length}</Text>
    </SafeAreaView>

  );
}
