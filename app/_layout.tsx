import { useUserQueryLoginStore } from '@/constants/store';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import React from 'react';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { currentUser } = useUserQueryLoginStore();

  
  NavigationBar.setVisibilityAsync('hidden');
  NavigationBar.setBehaviorAsync('overlay-swipe');
  let initialRoute = '/login';
  if (currentUser) {
    initialRoute = currentUser.role === 'mechanic' 
      ? '/(mechanic)/mechanicDashboard' 
      : '/(user)'; 
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        
        <Stack.Screen name="(user)" options={{ headerShown: false }} /> 
        <Stack.Screen name="(mechanic)" options={{ headerShown: false }} /> 

        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }}/>
      </Stack>
    </ThemeProvider>
  );
}