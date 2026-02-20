import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "citysync.selectedCalendarIds.v1";

export async function getSelectedCalendarIds(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

export async function setSelectedCalendarIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(ids));
}

export async function clearSelectedCalendarIds(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}