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
  //^tab group is main navigation anch
};

SplashScreen.preventAutoHideAsync();

function AppGate() {
  const colorScheme = useColorScheme();
  const { auth, login} = useAuth();

  useEffect(() => {SplashScreen.hideAsync();}, []);//hides once layout has mounted

  if (auth.status === 'loading') {//loading spinner while auth state is resorted/loading
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0b0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#D70E20" size="large" />
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
        {/*main tab app screen*/}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
        {/*fallback screen for any other outes*/}
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