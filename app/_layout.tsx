import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router'; 
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as NavigationBar from 'expo-navigation-bar';



import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
export default function RootLayout() {
  const colorScheme = useColorScheme(); 
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  if (!loaded) {
    return null;
  }
NavigationBar.setVisibilityAsync('hidden');
NavigationBar.setBehaviorAsync('overlay-swipe');
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}> 
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> 
        <Stack.Screen name="+not-found" options={{ headerShown: false }}/> 
      </Stack>


    </ThemeProvider>
  );
}