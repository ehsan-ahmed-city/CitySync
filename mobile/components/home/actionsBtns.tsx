import React from "react";
import {Pressable, Text} from "react-native";

type BtnProps = {title: string; onPress: () => void; styles: any;};


export function PrimBtn({ title, onPress }: { title: string; onPress: () => void }){
       //primary action button in app
         return (//reduces opacity when pressed

           <Pressable onPress={onPress} style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}>

             <Text style={styles.btnPrimaryText}>{title}</Text>
           </Pressable>

         );
       }



export function SecBtn({ title, onPress }: { title: string; onPress: () => void }){
//secondary button as neutral
  return (

    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.85 }]}>

      <Text style={styles.btnSecondaryText}>{title}</Text>
    </Pressable>

  );
}

export function DangerBtn({ title, onPress }: { title: string; onPress: () => void }){
//for stuff like delete
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btnDanger, pressed && { opacity: 0.85 }]}>

      <Text style={styles.btnDangerText}>{title}</Text>

    </Pressable>
  );
}