import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, SafeAreaView, SectionList, Text, View } from "react-native";
import * as Calendar from "expo-calendar";

const API_BASE = "http://192.168.0.10:8080";//LAN ip
const USER_ID = 1;

type CourseworkDto = {
  id: number;
  moduleId: number;
  userId: number;
  title: string;
  dueDate: string;
  weighting: number | null;
};

type UnifiedItem = {
  key: string;
  source: "timetable" | "coursework";
  title: string;
  start: Date;
  end: Date;
  location?: string;
  meta?: string;
};

function startOfWeek(d: Date) {
  //monday-start week
  const x = new Date(d);
  const day = x.getDay(); // 0 sun and 6 is sat
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDueDateAsEndOfDay(yyyyMmDd: string) {
  //coursework deadline as 23:59 local time for display
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 23, 59, 0, 0);
  return dt;
}

export default function CalendarScreen() {
  const [status, setStatus] = useState("idle");
  const [sections, setSections] = useState<{ title: string; data: UnifiedItem[] }[]>([]);

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  async function loadUnifiedWeek() {
    setStatus("requesting calendar permission...");
    try {
      const perm = await Calendar.requestCalendarPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Calendar permission needed", "Enable calendar permission to import timetable events.");
        setStatus("calendar permission denied");
        return;
      }

      setStatus("loading device calendar events...");
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

      //read from all visible calendars
      const calIds = calendars.map((c) => c.id);

      //fetch all events within the week range
      const deviceEvents = await Calendar.getEventsAsync(calIds, weekStart, weekEnd);

      const timetableItems: UnifiedItem[] = deviceEvents.map((e) => ({
        key: `tt-${e.id}`,
        source: "timetable",
        title: e.title ?? "(no title)",
        start: new Date(e.startDate),
        end: new Date(e.endDate),
        location: e.location ?? undefined,
        meta: e.calendarId ? `Calendar: ${e.calendarId}` : undefined,
      }));

      setStatus("loading coursework from backend...");
      const cwRes = await fetch(`${API_BASE}/users/${USER_ID}/coursework`);
      if (!cwRes.ok) {
        const txt = await cwRes.text();
        Alert.alert("Coursework load failed", `${cwRes.status}\n${txt}`);
        setStatus(`coursework load failed ${cwRes.status}`);
        return;
      }
      const coursework = (await cwRes.json()) as CourseworkDto[];

      const courseworkItems: UnifiedItem[] = coursework.map((c) => {
        const end = parseDueDateAsEndOfDay(c.dueDate);
        const start = new Date(end);
        start.setMinutes(start.getMinutes() - 30);//show as a 30 min block
        return {
          key: `cw-${c.id}`,
          source: "coursework",
          title: c.title,
          start,
          end,
          meta: `Module ${c.moduleId}${c.weighting != null ? ` • ${c.weighting}%` : ""}`,
        };
      });

      const merged = [...timetableItems, ...courseworkItems].filter(//merge and filter to only items in the week
        (it) => it.start >= weekStart && it.start < weekEnd
      );

      merged.sort((a, b) => a.start.getTime() - b.start.getTime());

      const byDay = new Map<string, UnifiedItem[]>();
      for (const it of merged) {
        const k = ymd(it.start);
        const arr = byDay.get(k) ?? [];//group by day
        arr.push(it);
        byDay.set(k, arr);
      }

      const newSections = Array.from(byDay.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, data]) => ({
          title: day,
          data,
        }));

      setSections(newSections);
      setStatus(`loaded ${merged.length} items`);
    } catch (e: any) {
      setStatus("load error");
      Alert.alert("Unified calendar error", String(e?.message ?? e));
    }
  }

  useEffect(() => {
    loadUnifiedWeek();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: "600" }}>Unified Week</Text>
        <Text>Week: {ymd(weekStart)} → {ymd(addDays(weekStart, 6))}</Text>
        <Text>Status: {status}</Text>
        <Button title="Reload unified week" onPress={loadUnifiedWeek} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderSectionHeader={({ section }) => (

          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#eee" }}>
            <Text style={{ fontWeight: "700" }}>{section.title}</Text>

          </View>
        )}
        renderItem={({ item }) => (

          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: "600" }}>
              {item.source === "timetable" ? "📘" : "📝"} {item.title}
            </Text>
            <Text>

              {item.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} →{" "}
              {item.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}

            </Text>
            {item.location ? <Text>Location: {item.location}</Text> : null}
            {item.meta ? <Text>{item.meta}</Text> : null}
          </View>

        )}
        ListEmptyComponent={<Text style={{ padding: 16 }}>No items this week.</Text>}
      />
    </SafeAreaView>
  );
}