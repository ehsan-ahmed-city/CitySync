import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, SafeAreaView, ScrollView, Switch, Text, View } from "react-native";
import * as Calendar from "expo-calendar";
import { getSelectedCalendarIds, setSelectedCalendarIds, clearSelectedCalendarIds } from "@/lib/calendarPrefs";

type CalRow = {
  id: string;
  title: string;
  source?: string;
  type?: string;
  allowsModifications?: boolean;
};

export default function CalendarSettingsScreen() {
  const [status, setStatus] = useState("idle");
  const [cals, setCals] = useState<CalRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  async function loadCalendars() {
    setStatus("requesting calendar permission...");
    const perm = await Calendar.requestCalendarPermissionsAsync();
    if (perm.status !== "granted") {
      setStatus("permission denied");
      Alert.alert("Permission needed", "Enable calendar permission to select timetable calendars..");
      return;
    }

    setStatus("loading calendars...");
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    const rows: CalRow[] = calendars.map((c) => ({
      id: c.id,
      title: c.title ?? "(no title)",
      source: (c as any).source?.name ?? undefined,
      type: String((c as any).type ?? ""),
      allowsModifications: c.allowsModifications,
    }));

    //loads existing selection(if any)
    const saved = await getSelectedCalendarIds();
    const nextSel: Record<string, boolean> = {};
    for (const r of rows) nextSel[r.id] = saved ? saved.includes(r.id) : false;

    setCals(rows);
    setSelected(nextSel);
    setStatus(`loaded ${rows.length} calendars`);
  }

  useEffect(() => {
    loadCalendars().catch((e) => Alert.alert("Error", String(e?.message ?? e)));
  }, []);

  async function save() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (ids.length === 0) {
      Alert.alert("Select at least one", "Pick your timetable calendar so CitySync knows waht to include.");
      return;
    }

    await setSelectedCalendarIds(ids);
    Alert.alert("Saved", `Selected ${ids.length} calendar(s).`);
  }

  async function reset() {
    await clearSelectedCalendarIds();
    await loadCalendars();
    Alert.alert("Reset", "Cleared timetable calendar selection.");
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Timetable Calendars</Text>
        <Text>Status: {status}</Text>
        <Text>Selected: {selectedCount}</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Save selection" onPress={() => save().catch((e) => Alert.alert("Save error", String(e)))} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Reset" onPress={() => reset().catch((e) => Alert.alert("Reset error", String(e)))} />
          </View>
        </View>

        {cals.map((c) => (
          <View
            key={c.id}
            style={{
              borderWidth: 1,
              padding: 12,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{c.title}</Text>
              <Text>Source: {c.source ?? "n/a"}</Text>
              <Text>Type: {c.type || "n/a"} | Writable: {c.allowsModifications ? "yes" : "no"}</Text>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>{c.id}</Text>
            </View>

            <Switch
              value={!!selected[c.id]}
              onValueChange={(v) => setSelected((prev) => ({ ...prev, [c.id]: v }))}
            />
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}