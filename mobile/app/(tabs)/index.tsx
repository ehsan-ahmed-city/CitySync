import React, { useState } from "react";
import { SafeAreaView, Text } from "react-native";

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

  const [cwModuleId, setCwModuleId] = useState("1");//coursework form
  const [cwTitle, setCwTitle] = useState("PDD submission");
  const [cwDueDate, setCwDueDate] = useState("2026-02-09");
  const [cwWeighting, setCwWeighting] = useState("30");

  return (
    <SafeAreaView style={{ padding: 16, marginTop: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        CitySync (User {USER_ID})
      </Text>

      <Text>Module draft: {mCode} - {mName} ({mCredits})</Text>
      <Text>Coursework draft: {cwTitle} due {cwDueDate}</Text>

      <Text>Modules loaded: {modules.length}</Text>
      <Text>Coursework loaded: {coursework.length}</Text>
    </SafeAreaView>
  );
}
