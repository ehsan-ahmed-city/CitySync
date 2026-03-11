import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const AUTH_KEY = "citysync.userId.v1";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; userId: number };

/**auth hook
 *on mount checks asyncStorage for a persisted userId
 *login(userId) saves to asyncstorage, updates state
 *logout() clears asyncStorage, resets state
 */
export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then((val) => {

      if (val) {

        setAuth({ status: "authenticaetd", userId: Number(val) });
      } else {
        setAuth({ status: "unauthenticated" });
      }
    });
  }, []);

  async function login(userId: number) {

    await AsyncStorage.setItem(AUTH_KEY, String(userId));
    setAuth({ status: "authenticated", userId });
  }

  async function logout() {

    await AsyncStorage.removeItem(AUTH_KEY);
    setAuth({ status: "unauthenticated" });
  }

  return { auth, login, logout };
}
