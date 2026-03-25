import React from "react";
import { View, Text} from "react-native";
import { SecBtn } from "./ActionButtions";

type = Props ={
    userId: number | null;
    status: string;
    stats: {modules: number; coursework: number; pending: number;};
    onRefresh: () => void;
    onLogout () => void;
    styles: any;
}


function Pill({ label }: { label: string }){
//using pill for stats for modules, cw, and pending
  return (

    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );

}

export default function headerCard({ userId, status, stats, onRefresh, onLogout, style}: Props){
    return(
        <View style={styles.header}>
            <Text style={styles.title}>CitySync</Text>
            <Text style={styles.subTitle}>User {userId ?? "?"} • {status}</Text>
            <View style={styles.pillRow}>
              <Pill label={`Modules: ${stats.modules}`} />
              <Pill label={`Coursework: ${stats.coursework}`} />
              <Pill label={`Pending: ${stats.pending}`} />
            </View>

            <View style={styles.headerBtns}>
              <SecBtn title="Refresh" onPress={() => { loadModules(); loadCoursework(); }} />
              <SecBtn title ="Logout" onPress = {logout} />
            </View>
        </View>
 );
}