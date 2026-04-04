import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const storageKey = "citysync_has_onboarded";//key to flag is user completes onboarding

export default function Index() {
    useEffect(() => {

        async function decideRoute(){
        //^Async function for user's route
            const hasOnboard = await AsyncStorage.getItem(storageKey);

            if(hasOnboard === "true"){
                router.replace("/(tabs)");//if onboarding done already then go to tabs
            } else {
                router.replace("/onboarding");
            }
        }

        decideRoute();
        },[]);

    return (
        <View
            style={{
                flex:1,
                backgroundColor: "#0b0b0f",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {/**/Async check runs so loading indicator shown}
            <ActivityIndicator size = "large" color="#D70E20" />
        </View>
    );

}