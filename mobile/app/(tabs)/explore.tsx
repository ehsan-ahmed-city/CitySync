import React, { useEffect, useState } from "react";
import {Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView,StyleSheet,
  Text, TextInput, View,} from "react-native";
import { getUserId, authHeaders } from "@/lib/api";

const API_BASE = "http://192.168.0.12:8080";
// const USER_ID = 1;

const C = { bg: "#0B0B10", card: "#12121A", card2: "#161622", border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF", sub: "rgba(255,255,255,0.72)",muted: "rgba(255,255,255,0.45)",primary: "#3B82F6",
  danger: "#EF4444",success: "#22C55E",};//colour pallete for settings

type Prefs = { //from backend preferences
  homeAddress: string | null;
  UniLoc: string | null;
  bufferMins: number | null;
};



function PrimBtn({ title, onPress, disabled }: {title: string; onPress: () => void; disabled?: boolean }){
//^primary action button
  return (

    <Pressable
      onPress={onPress}
      disabled={disabled}

      style={({ pressed }) => ({

        backgroundColor: disabled ? C.muted : C.primary,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        opacity: pressed ? 0.8 : 1,//opacity lower for feedback

      })}
    >
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
//card wrpper for each section
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {

//for from fields
  return <Text style={styles.fieldLabel}>{label}</Text>;
}



export default function SettingsScreen() {

  const [homeAddress, setHomeAddress] = useState("");//what the user can change is home address
  const [uniAddress, setUniAddress] = useState(
    "City St George's, University of London, Northampton Square, London EC1V 0HB"//uni address is fixed
  );
  const [bufferMins, setBufferMins] = useState("10");

  //shows status to user like loading or ok or error
  const [status, setStatus] = useState<{ msg: string; type: "idle" | "ok" | "error" | "loading" }>({
    msg: "",
    type: "idle",
  });



  useEffect(() => {
    loadPrefs();  //load saved prefs from backend on mount
  }, []);

  async function loadPrefs() {
    setStatus({ msg: "Loading preferences...", type: "loading" });
    try {

      const USER_ID = await getUserId();

      const res = await fetch(`${API_BASE}/users/${USER_ID}/preferences`, {
        headers: await authHeaders(),
      });
      if (!res.ok) {

        setStatus({ msg: `Failed to load (${res.status})`, type: "error" });
        return;
      }
      const data = (await res.json()) as Prefs;

      //Ui shows data it got from backend
      if (data.homeAddress) setHomeAddress(data.homeAddress);
      if (data.UniLoc) setUniAddress(data.UniLoc);
      if (data.bufferMins != null) setBufferMins(String(data.bufferMins));

      setStatus({ msg: "Preferences loaded", type: "ok" });

    } catch (e: any) {

      setStatus({ msg: `Load error: ${e?.message ?? e}`, type: "error" });
        //^only if it cant load the data
    }
  }

  async function savePrefs() {
    const bufferNum = parseInt(bufferMins, 10);//parsing buffer string to num for backend

    if (isNaN(bufferNum) || bufferNum < 0 || bufferNum > 300) {
      Alert.alert("Buffer has to be a number", "Buffer can be between 0 and 300 minutes");
      return;
    }

    if (!homeAddress.trim()) {
      Alert.alert("Home address required", "Enter your home address/postcode to get travel time");
      return;
    }

    setStatus({ msg: "Saving...", type: "loading" });

    try {

      const USER_ID = await getUserId();

      const res = await fetch(`${API_BASE}/users/${USER_ID}/preferences`, {

        method: "PUT",
        headers: {
          ...(await authHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeAddress: homeAddress.trim(),
          UniLoc: uniAddress.trim(),
          bufferMins: bufferNum,
        }),

        //uses the values from user preferences via await
      });

      if (!res.ok) {//error message if invalid response form bakcend
        const txt = await res.text();
        setStatus({ msg: `Save failed (${res.status})`, type: "error" });
        Alert.alert("Save failed", `${res.status}\n${txt}`);
        return;
      }

      const saved = (await res.json()) as Prefs;
      if (saved.bufferMins != null) setBufferMins(String(saved.bufferMins));
      setStatus({ msg: "Preferences saved ", type: "ok" });
      Alert.alert("Saved", "Your preferences have been updated reload the Calendar tab to recalculate leave times.");
    } catch (e: any) {
      setStatus({ msg: `Save error: ${e?.message ?? e}`, type: "error" });
    }
  }

  function adjustBuffer(delta: number) {
    const current = parseInt(bufferMins, 10) || 0;
    const next = Math.max(0, Math.min(300, current + delta));
    setBufferMins(String(next));
  }

  const statusColour =
    status.type === "ok" ? C.success : status.type === "error" ? C.danger : C.muted;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/*Header */}
          <Text style={styles.heading}>Settings</Text>
          {status.msg ? (
            <Text style={[styles.statusText, { color: statusColour }]}>{status.msg}</Text>
          ) : null}

          {/*Travel settings */}
          <SectionCard title="Travel Settings">

            <FieldLabel label="Home address or postcode" />

            <TextInput

              value={homeAddress}
              onChangeText={setHomeAddress}
              placeholder="e.g. LU4 8AY or 123 Portland road, Luton"
              //^example address for users which is mine
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}

            />
            <Text style={styles.hint}>
              Used to calculate your travel time to City University A postcode also works.
            </Text>

            <FieldLabel label="Destination (pre-filled)" />

            <TextInput

              value={uniAddress}
              onChangeText={setUniAddress}
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Change this if your lectures are at different location.
            </Text>
          </SectionCard>

          {/* Buffer settings */}
          <SectionCard title="Leave buffer">

            <Text style={styles.sub}>
              Extra minutes added on top of travel time before your lecture starts.
            </Text>

            <View style={styles.bufferRow}>
              <Pressable
                onPress={() => adjustBuffer(-5)}
                style={({ pressed }) => [styles.bufferBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.bufferBtnText}>−5</Text>
              </Pressable>

              <View style={styles.bufferDisplay}>
                <Text style={styles.bufferValue}>{bufferMins}</Text>
                <Text style={styles.bufferUnit}>mins</Text>
              </View>

              <Pressable
                onPress={() => adjustBuffer(5)}
                style={({ pressed }) => [styles.bufferBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.bufferBtnText}>+5</Text>
              </Pressable>
            </View>

            <TextInput
              value={bufferMins}
              onChangeText={setBufferMins}
              keyboardType="numeric"
              placeholder="or type a number"
              placeholderTextColor={C.muted}
              style={[styles.input, { textAlign: "center" }]}
            />
            <Text style={styles.hint}>Max 300 minutes(5 hours), default is 10 mins.</Text>
          </SectionCard>

          {/*talks how leave-soon works */}
          <SectionCard title="How leave soon alerts work">
            <Text style={styles.sub}>
              {"CitySync calculates your leave time as:\n\n"}
            </Text>

            <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>
              {"Lecture start − (travel time + your buffer)"}
            </Text>

            <Text style={styles.sub}>
              {"\nA push notification fires at exactly that time, even if the app is closed. Travel time is fetched live from Google Routes API. If unavailable, CitySync uses a static estimate based on your postcode."}
            </Text>
          </SectionCard>

          {/*Save button */}
          <PrimBtn title="Save Preferences" onPress={savePrefs} disabled={status.type === "loading"} />

          <View style={{ height: 40 }} />
        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  safe: {flex: 1,backgroundColor: C.bg,},
  scroll: {padding: 20,gap: 16,},
  heading: {fontSize: 28,fontWeight: "800",color: C.text,marginBottom: 4,},
  statusText: {
    fontSize: 13,
    marginBottom: 8,
  },

  card: {backgroundColor: C.card,borderRadius: 16,padding: 16,gap: 10,borderWidth: 1,borderColor: C.border,},
  cardTitle: {fontSize: 16,fontWeight: "700",color: C.text, marginBottom: 4,
  },fieldLabel: {fontSize: 13,fontWeight: "600",color: C.sub,},

  input: {backgroundColor: C.card2,borderWidth: 1,borderColor: C.border,borderRadius: 10,padding: 12,color: C.text,fontSize: 14,},
  hint: {fontSize: 12,color: C.muted,},
  sub: {fontSize: 13,color: C.sub,lineHeight: 20,},

  bufferRow: {flexDirection: "row",alignItems: "center",justifyContent: "center",gap: 20,marginVertical: 8,},
  bufferBtn: {backgroundColor: C.card2,borderWidth: 1,borderColor: C.border,borderRadius: 12,width: 56,height: 56,
    alignItems: "center",justifyContent: "center",},
  bufferBtnText: {color: C.text,fontSize: 20,fontWeight: "700",},

  bufferDisplay: {alignItems: "center",minWidth: 80,},
  bufferValue: {color: C.primary,fontSize: 40,fontWeight: "800",},
  bufferUnit: {color: C.muted, fontSize: 13,},
});