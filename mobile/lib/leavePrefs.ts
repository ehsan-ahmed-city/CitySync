import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "citysync.leaveBufferMins.v1";

export async function getLeaveBufferMins(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 10; //default 10 mins
}

export async function setLeaveBufferMins(mins: number): Promise<void> {
  await AsyncStorage.setItem(KEY, String(mins));
}