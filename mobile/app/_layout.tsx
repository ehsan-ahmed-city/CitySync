import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import LoginScreen from '@/components/LoginScreen';


export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AppGate() {
  const colorScheme = useColorScheme();
  const { auth, login} = useAuth();

  useEffect(() => {SplashScreen.hideAsync();}, []);

  if (auth.status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (auth.status === 'unauthenticated') {
    return <LoginScreen onLogin={login} />;//login screen if not logged in
  }

  return (//shows app if logged in
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>

    </ThemeProvider>
  );
}

  export default function RootLayout() {//making auth global by wrapping on app
    return (
        <AuthProvider>
            <AppGate />
        </AuthProvider>
    );
}