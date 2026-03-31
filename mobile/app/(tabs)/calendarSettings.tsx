import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Switch, Text, View } from "react-native";
import * as Calendar from "expo-calendar";
import { getSelectedCalendarIds, setSelectedCalendarIds, clearSelectedCalendarIds,} from "@/lib/calendarPrefs";

type CalRow = {
  id: string;
  title: string;
  source?: string;
  type?: string;
  allowsModifications?: boolean;
};

const colours = {bg: "#0B0B10",card: "#12121A",card2: "#161622",border: "rgba(255,255,255,0.08)",text: "#FFFFFF",
  sub: "rgba(255,255,255,0.72)",muted: "rgba(255,255,255,0.45)",primary: "#3B82F6",};

function Pill({ label }: { label: string }) {
  return (
    <View
      style={{

        paddingHorizontal: 10,paddingVertical: 6,borderRadius: 999, backgroundColor: colours.card2,borderWidth: 1, borderColor: colours.border,
        //^radius large for round look
      }}
    >
      <Text style={{ color: colours.sub, fontWeight: "600", fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colours.primary,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
        opacity: pressed ? 0.8 : 1,//visual feedback when touched
      })}
    >
      <Text style={{ color: colours.text, fontWeight: "800" }}>{title}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({//colours for the app ui
        backgroundColor: colours.card2,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colours.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: colours.text, fontWeight: "800" }}>{title}</Text>
    </Pressable>
  );
}

export default function CalendarSettingsScreen() {
  const [status, setStatus] = useState("idle");
  const [cals, setCals] = useState<CalRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

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

    const saved = await getSelectedCalendarIds();
    const nextSel: Record<string, boolean> = {};
    for (const r of rows) {nextSel[r.id] = saved ? saved.includes(r.id) : false;}

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
      Alert.alert("Select at least one","Pick your timetable calendar so CitySync knows what to include.");
      return;
    }

    await setSelectedCalendarIds(ids);
    Alert.alert("Saved", `Citysync will use ${ids.length} selected calendar(s) for your unified timetable :D`);
  }

  function confirmSave(){
  //funciton so that users know that their calendar perfs will be saved
    Alert.alert(
    "Use selected calendars?","Citysync reads events only form the calendars you selected to build the unified calendar",
    [{text: "cancel",style:"cancel",},{
        text:"continue", onPress: () => {
            save().catch((e) => Alert.alert("save error", String(e)));
        },
    },

    ]
    );
  }

  async function reset() {
    await clearSelectedCalendarIds();
    await loadCalendars();
    Alert.alert("Reset", "Cleared timetable calendar selection.");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colours.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/*header card */}
        <View
          style={{

            backgroundColor: colours.card,
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: colours.border,
            marginBottom: 12,

          }}

        >
          <Text style={{ color: colours.text, fontSize: 28, fontWeight: "900" }}>

            Timetable Calendars
          </Text>

          <Text style={{ color: colours.muted, marginTop: 6 }}>{status}</Text>

          <Text style={{ color: colours.sub, marginTop:10, lineHeight: 20 }}>
            Citysync reads events only form the calendars you selected to build the unified calendar
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>

            <Pill label={`Calendars: ${cals.length}`} />
            <Pill label={`Selected: ${selectedCount}`} />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={{ flex: 1 }}>

              <PrimaryButton title="Save selection" onPress={confirmSave}/>
            </View>
            <View style={{ flex: 1 }}>

              <SecondaryButton
                title="Reset"
                onPress={() => {
                  reset().catch((e) => Alert.alert("Reset error", String(e)));
                }}
              />
            </View>
          </View>
        </View>

        {/* List */}
        {cals.map((c) => (
          <View
            key={c.id}
            style={{

              backgroundColor: colours.card, borderRadius: 18, padding: 14,borderWidth: 1, borderColor: colours.border,
              marginBottom: 10,flexDirection: "row",gap: 12,alignItems: "center",justifyContent: "space-between",}}
          >
            <View style={{ flex: 1 }}>
            <Text style={{ color: colours.text, fontWeight: "900", fontSize: 16 }}>

              {c.title}
            </Text>

            <Text style={{ color: colours.sub, marginTop: 2 }}>

              {c.source ? `Source: ${c.source}` : "Source: n/a"}
              {c.type ? ` • Type: ${c.type}` : ""}
              {/*^show souce and calendar type if available, otherwise fallback */}
            </Text>

            <Text style={{ color: colours.muted, marginTop: 2 }}>
              {/*whether this calendar can be modified via api */}
              Writable: {c.allowsModifications ? "yes" : "no"}
            </Text>

            <Text
              style={{ color: colours.muted, fontSize: 11, marginTop: 6 }}
              numberOfLines={1} //truncate long calendar IDs to a single line
            >
              {c.id}
            </Text>

            </View>

            <Switch
              value={!!selected[c.id]}
              onValueChange={(v) => setSelected((prev) => ({ ...prev, [c.id]: v }))}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}