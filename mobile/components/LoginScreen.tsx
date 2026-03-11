import React, { useState } from "react";
import { ActivityIndicator,Alert,KeyboardAvoidingView,Platform,Pressable,SafeAreaView,
  StyleSheet,Text,TextInput,View,} from "react-native";

const API_BASE = "http://192.168.0.10:8080";

type Props = {

  onLogin: (userId: number) => void;
};

/**two step login screen
 *1 enter email, tap send Codec to POST /auth/request-code
 *2 enter 6 digit code, tap verify to POST /auth/verify-code to returns userId */
export default function LoginScreen({ onLogin }: Props) {

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleRequestCode() {

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { Alert.alert("Email required", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {

      const res = await fetch(`${API_BASE}/auth/request-code`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) { Alert.alert("Error", json.error ?? "Failed to send code.");
        return;
      }
      setSentTo(trimmed);
      setStep("code");
    } catch (e: any) {Alert.alert("Network error", String(e?.message ?? e));
    } finally {setLoading(false);}
  }

  async function handleVerifyCode() {
    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) { Alert.alert("invalid code", "please enter the 6 digit code from your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-code`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sentTo, code: trimmedCode }),

      });
      const json = await res.json();
      if (!res.ok) {Alert.alert("verification failed", json.error ?? "incorect/expired code.");
        return;
      }
      onLogin(Number(json.userId));
    } catch (e: any) {Alert.alert("Network error", String(e?.message ?? e));
    } finally {setLoading(false);}
  }

  return ();
}

