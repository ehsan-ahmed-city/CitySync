import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import LoginScreen from '@/components/LoginScreen';
// import { useFonts } from 'expo-font';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { auth, login, logout } = useAuth();

//   const [loaded] = useFonts({
//     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
//   });

useEffect(() => {SplashScreen.hideAsync();}, []);

  if (auth.status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (auth.status === 'unauthenticated') {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

{/*        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} /> */}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />

        <Stack.Screen name="+not-found" />
      </Stack>

{/*      <StatusBar style="auto" /> */}
    </ThemeProvider>
  );
}