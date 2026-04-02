import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = "http://192.168.0.12:8080";

const AUTH_KEY = "citysync.userId.v1";

//eeturns headers for all authenticated API calls *reads userId from AsyncStorageand sends it as X-User-Id and is read to authenticate the req
export async function authHeaders(): Promise<Record<string, string>> {
  const userId = await AsyncStorage.getItem(AUTH_KEY);
  return {
    "Content-Type": "application/json",
    ...(userId ? { "X-User-Id": userId } : {}),
  };
}

/**returns the current userId from AsyncStorage
 * throws if not logged in*/
export async function getUserId(): Promise<number> {

  const val = await AsyncStorage.getItem(AUTH_KEY);
  if (!val) throw new Error("not authenticated");
  return Number(val);
}

export async function delUserId(){
//user id is deleted and sesh cleared
await AsyncStorage.removeItem(AUTH_KEY);
}