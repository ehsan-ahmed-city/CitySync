import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, SafeAreaView, SectionList, Text, TextInput, View } from "react-native";
import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";

import { getLeaveBufferMins, setLeaveBufferMins } from "../../lib/leavePrefs";
import { getHomeLocation, setHomeLocation } from "../../lib/locationPrefs";
import { getSelectedCalendarIds } from "@/lib/calendarPrefs";
import { getUserId, authHeaders } from "@/lib/api";

const API_BASE = "http://192.168.0.12:8080";//LAN ip
// const USER_ID = 1;

const CITY_CAMPUS_DESTINATION = "City, University of London, Northampton Square, London EC1V 0HB";

//stores leave notification ids so we can cancel them on reload
const leavenotif = "citysync.leaveSoonNotifIds.v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

async function fetchTravelMins(home: string) {
  //calls backend /travel which proxies to google routes and returns seconds + fallback flag
  if (!home || home.trim() === "") return null;

  try {

    const url =
      `${API_BASE}/travel` +
      `?origin=${encodeURIComponent(home.trim())}` + //encode so spaces/postcodes work in a URL
      `&destination=${encodeURIComponent(CITY_CAMPUS_DESTINATION)}`;

    const res = await fetch(url, {
      headers: await authHeaders(),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { seconds: number; fallback: boolean };

    //if backend says fallback=true, it couldn't reach google -> return null so our local estimator is used
    if (json.fallback || json.seconds <= 0) return null;

    return Math.ceil(json.seconds / 60); // seconds -> mins (round up so you don't underestimate)
  } catch {

    return null;
  }
}

function estimateTravelMinsHomeToCampusFallback(home: string) {
  if (!home || home.trim() === "") return null;

  /**for now until GMatrix so if they only postcode, assume 45 mins
    else full address = 50 mins*/
  const looksLikePostcode = home.length <= 10;
  return looksLikePostcode ? 45 : 50;
}

function calcLeaveTime(eventStart: Date, travelMins: number, bufferMins: number) {
  const ms = (travelMins + bufferMins) * 60_000;
  return new Date(eventStart.getTime() - ms);
}

async function cancelAllLeaveSoonNotifs() {
  //cancel all previous leave-soon notifications so we don't stack duplicates on every reload
  try {

    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");

    const raw = await AsyncStorage.getItem(leavenotif);
    if (!raw) return;

    const ids = JSON.parse(raw) as string[];

    await Promise.all(
      ids.map(async (id) => {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          //ignore if already cancelled/expired
        }
      })
    );

    await AsyncStorage.removeItem(leavenotif);

  } catch {
    //ignore storage errors
  }
}

async function scheduleLeaveSoonNotif(
  eventTitle: string,
  leaveAt: Date,
  travelMins: number,
  bufferMins: number
) {
  //dont schedule if time already passed (or is basically now)
  if (leaveAt.getTime() <= Date.now()) {
    console.log(
      `[CitySync] skipped leave notif for "${eventTitle}", leave time already passed`
    );
    return null;
  }

  try {

    // const perms = await Notifications.getPermissionsAsync();
    // let granted =
    //   perms.granted ||
    //   perms.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    //
    // if (!granted) {
    //   const req = await Notifications.requestPermissionsAsync();
    //   granted =
    //     req.granted ||
    //     req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    // }
    //
    // if (!granted) {
    //   console.log(`[CitySync] Notifications not permitted for "${eventTitle}"`);
    //   return null;
    // }

    let perms = await Notifications.getPermissionsAsync();

    if (!perms.granted) {
      perms = await Notifications.requestPermissionsAsync();
    }

    if (!perms.granted) {
      console.log("[CitySync] notifications NOT granted");
      return null;
    }

    console.log(
      `[CitySync] Scheduling leave notif for "${eventTitle}" at ${leaveAt.toISOString()}, now is ${new Date().toISOString()}`
    );

    const id = await Notifications.scheduleNotificationAsync({

      content: {

        title: "CitySync: Time to leave!",
        body: `Leave now for "${eventTitle}" — ${travelMins} min journey + ${bufferMins} min buffer`,
        data: { type: "leave_soon", eventTitle },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: leaveAt, //activates at leaveAt Date
      },
    });

    console.log(`[CitySync] Scheduled notif id: ${id}`);
    return id;

  } catch (e) {

    console.log(`[CitySync] Failed to schedule notif for "${eventTitle}":`, e);
    return null;
  }
}

export default function CalendarScreen() {
  const [status, setStatus] = useState("idle");
  const [sections, setSections] = useState<{ title: string; data: UnifiedItem[] }[]>([]);

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const [buffer, setBuffer] = useState<number>(10);
  const [homeLocation, setHomeLocationState] = useState<string>("");

  const [travelSource, setTravelSource] = useState<"google" | "fallback" | "none">("none");
  useEffect(() => {
    (async () => {
      setBuffer(await getLeaveBufferMins());
      setHomeLocationState(await getHomeLocation());
    })();
  }, []);

  async function saveBuffer(next: number) {
    setBuffer(next);
    await setLeaveBufferMins(next);
    Alert.alert("Saved", `Leave buffer set to ${next} minutes`);
    loadUnifiedWeek(); // refreshs the leaveat time
  }

  async function saveHomeLocation(next: string) {
    setHomeLocationState(next);
    await setHomeLocation(next);
  }

  async function loadUnifiedWeek() {
    setStatus("requesting calendar permission...");
    try {
      const USER_ID = await getUserId();

      const perm = await Calendar.requestCalendarPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Calendar permission needed", "Enable calendar permission to import timetable events.");
        setStatus("calendar permission denied");
        return;
      }

      setStatus("loading device calendar events...");
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

      //read from all visible calendars
      // const calIds = calendars.map((c) => c.id);

      //read saved calendar selection first, else fall back to all calendars
      const savedIds = await getSelectedCalendarIds();
      let calIds: string[];

      if (savedIds && savedIds.length > 0) {

        const existingIds = new Set(calendars.map((c) => c.id));
        calIds = savedIds.filter((id) => existingIds.has(id));
        //^keeps only saved calendars that still exist on the device

        if (calIds.length === 0) {

          calIds = calendars.map((c) => c.id);
          setStatus("saved calendars unavailable, using all calendars...");
          //^fallback if previously saved calendars were removed from device

        } else {

          setStatus(`using ${calIds.length} selected calendar(s)...`);
        }

      } else {

        calIds = calendars.map((c) => c.id);
        setStatus("no calendars selected — using all. Pick calendars in the Cal. Source tab.");
        //^uses all calendars until user makes a selection in the calendar source tab
      }

      //fetch all events within the week range
      const deviceEvents = await Calendar.getEventsAsync(calIds, weekStart, weekEnd);

      const bufferMins = buffer;

      //try backend google routes first, else fallback estimate
      setStatus("fetching travel time...");

      let travelMins = await fetchTravelMins(homeLocation);
      let nextTravelSource: "google" | "fallback" | "none";

      if (travelMins != null) {

        nextTravelSource = "google";
        setTravelSource("google");

      } else {

        travelMins = estimateTravelMinsHomeToCampusFallback(homeLocation);
        nextTravelSource = travelMins != null ? "fallback" : "none";
        setTravelSource(nextTravelSource);

      }

      //cancel old leave alerts before we schedule new ones
      await cancelAllLeaveSoonNotifs();

      //ask notif perms if needed (so leave alerts can actually fire)
      // const notifPerm = await Notifications.getPermissionsAsync();
      // const canNotify =
      //   notifPerm.granted || notifPerm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      //
      // if (!canNotify) {
      //
      //   await Notifications.requestPermissionsAsync();
      // }

      let perms = await Notifications.getPermissionsAsync();

      if (!perms.granted) {
        perms = await Notifications.requestPermissionsAsync();
      }

      if (!perms.granted) {
        console.log("[CitySync] notifications not granted");
        return;
      }

      const scheduledNotifIds: string[] = [];

      const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");

      const timetableItems: UnifiedItem[] = await Promise.all(
        deviceEvents.map(async (e) => {
          const start = new Date(e.startDate);
          const end = new Date(e.endDate);
          const location = e.location ?? undefined;

          let leaveMeta = "";
          let routeMeta = "";

          //fixed destination so travel should be Home to City campus
          if (travelMins != null) {

            const leaveAt = calcLeaveTime(start, travelMins, bufferMins);

            const notifId = await scheduleLeaveSoonNotif(

              e.title ?? "Lecture",leaveAt,travelMins,bufferMins
            );

            if (notifId) {
              scheduledNotifIds.push(notifId);
            }

            leaveMeta = `Leave at ${leaveAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

            // routeMeta = `Route: Home to city campus (${travelMins} mins${travelSource === "fallback" ? " est." : ""})`;
            routeMeta = `Route: Home -> City campus (${travelMins} mins${nextTravelSource === "fallback" ? " est." : ""})`;

          } else {

            routeMeta = "Set home address in settings to get leave time";
          }

          // const calMeta = e.calendarId ? `Calendar: ${e.calendarId}` : "";
          const calName = calendars.find((c) => c.id === e.calendarId)?.title ?? e.calendarId;
          const calMeta = calName ? `Calendar ${calName}` : "";
          //^shows which selected calendar the event came from

          const meta = [leaveMeta, routeMeta, calMeta].filter(Boolean).join(" • ") || undefined;

          return {

            key: `tt-${e.id}`,source: "timetable", title: e.title ?? "(no title)",start,end,location,meta,
          };
        })
      );

      if (scheduledNotifIds.length > 0) {
        await AsyncStorage.setItem(leavenotif, JSON.stringify(scheduledNotifIds));
      }

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

//       Alert.alert(
//         "Scheduled notifications",
//         JSON.stringify(
//           scheduled.map((n) => ({id: n.identifier, title: n.content.title,
//             body: n.content.body,trigger: n.trigger,
//           })),
//           null,2
//         ).slice(0, 1500)
//       );

      // const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      // console.log("[CitySync] scheduled notifications:", JSON.stringify(scheduled, null, 2));

      console.log("[CitySync] All scheduled:", JSON.stringify(scheduled, null, 2));

      setStatus("loading coursework from backend...");
      const cwRes = await fetch(`${API_BASE}/users/${USER_ID}/coursework`, {
        headers: await authHeaders(),
      });
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

      const notifNote = scheduledNotifIds.length > 0 ? ` • ${scheduledNotifIds.length} leave alerts set` : "";
      // setStatus(`loaded ${merged.length} items (travel: ${travelSource})${notifNote}`);
      setStatus(`loaded ${merged.length} items (travel: ${nextTravelSource})${notifNote}`);

    } catch (e: any) {
      setStatus("load error");
      Alert.alert("Unified calendar error", String(e?.message ?? e));
    }
  }

  useEffect(() => {
    loadUnifiedWeek();
  }, []);

  return (
    // <SafeAreaView style={{ flex: 1 }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0b0f" }}>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: "600", color: "white" }}>Unified Week</Text>
        <Text style={{ color: "#d6d6df" }}>Week: {ymd(weekStart)} to {ymd(addDays(weekStart, 6))}</Text>
        <Text style={{ color: "#d6d6df" }}>Status: {status}</Text>

        {travelSource === "fallback" && (
          <Text style={{ color: "orange", fontSize: 12 }}>
            Using estimated travel time(google API unavailable)
          </Text>
        )}

        {travelSource === "google" && (
          <Text style={{ color: "green", fontSize: 12 }}>
            Live travel time from Google routes
          </Text>
        )}

        <Button title="Reload unified week" onPress={loadUnifiedWeek} />

        {/*
        <Button
          title="Test Notification (5s)"
          onPress={async () => {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "TEST",
                body: "should fire in 5 secs",
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 5,
              },
            });
          }}
        />
        */}
      </View>

      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>Leave buffer</Text>
        <Text style={{ color: "#d6d6df" }}>Current: {buffer} minutes</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>

          <Button title="-5" onPress={() => saveBuffer(Math.max(0, buffer - 5))} />
          <Button title="+5" onPress={() => saveBuffer(buffer + 5)} />

        </View>
      </View>


      <View style={{ padding: 16, gap: 8 }}>

        <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>Home location</Text>
        <TextInput

          value={homeLocation}
          onChangeText={saveHomeLocation}
          placeholder="e.g. LU48AY or full address"
          placeholderTextColor="#777"
          autoCapitalize="none"
          style={{ borderWidth: 1, padding: 10, color: "white", borderColor: "#2a2a3a", backgroundColor: "#14141a" }}

        />
        <Text style={{ opacity: 0.7, color: "#a9a9b6" }}>
          Destination: City Uni of London campus
        </Text>

      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        renderSectionHeader={({ section }) => (
          // <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#eee" }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#14141a" }}>
            {/* <Text style={{ fontWeight: "700" }}>{section.title}</Text> */}
            <Text style={{ fontWeight: "700", color: "white" }}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {

          const past = item.end.getTime() < Date.now();
          //^dims events that have already finished

          return (

            // <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 }}>
            <View
              style={{paddingHorizontal: 16,paddingVertical: 10,borderBottomWidth: 1,backgroundColor: past ? "#101015" : "#0b0b0f",
                borderBottomColor: "#262638",opacity: past ? 0.45 : 1,
              }}
            >
              {/* <Text style={{ fontWeight: "600" }}> */}
              <Text style={{ fontWeight: "600", color: past ? "#7f7f8f" : "white" }}>
                [{item.source === "timetable" ? "Lecture" : "Coursework"}] {item.title}
              </Text>

              {/* <Text> */}
              <Text style={{ color: past ? "#7f7f8f" : "#d6d6df" }}>
                {item.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to{" "}
                {item.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>

              {/* {item.location ? <Text>Location: {item.location}</Text> : null} */}
              {item.location ? (
                <Text style={{ color: past ? "#6d6d7c" : "#a9a9b6" }}>
                  Location: {item.location}
                </Text>
              ) : null}

              {/* {item.meta ? <Text style={{ fontSize: 12, opacity: 0.75 }}>{item.meta}</Text> : null} */}
              {item.meta ? (
                <>
                  {item.meta.split(" • ").map((part, i) => (
                    <Text
                      key={i}
                      style={{fontSize: 12,color: past
                          ? "#6d6d7c" : part.startsWith("Leave at") ? "#22C55E" : "#a9a9b6",
                        marginTop: i === 0 ? 4 : 1,
                      }}
                    >
                      {part}
                    </Text>
                  ))}
                </>
              ) : null}
            </View>

          );
        }}
        ListEmptyComponent={<Text style={{ padding: 16, color: "#d6d6df" }}>No items this week.</Text>}
      />
    </SafeAreaView>
  );
}