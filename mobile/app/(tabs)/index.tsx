import React from "react";
import { SafeAreaView, Text } from "react-native";

const API_BASE = "http://192.168.0.10:8080";//my laptop LAN ip
const USER_ID = 1;

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ padding: 16, marginTop: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        CitySync (User {USER_ID})
      </Text>
    </SafeAreaView>
  );
}
