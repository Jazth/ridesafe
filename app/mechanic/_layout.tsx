import { Tabs, Redirect } from 'expo-router';
import { useUserQueryLoginStore } from '@/constants/store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import React from 'react';

export default function MechanicTabs() {
  const { currentUser } = useUserQueryLoginStore();
  const colorScheme = useColorScheme();
  if (!currentUser) return <Redirect href="/login" />;
  if (currentUser.role !== 'mechanic') return <Redirect href="/user" />;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      headerShown: false,
    }}>
      <Tabs.Screen name="mechanicDashboard" options={{
        title: 'Assignments',
        tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
      }} />
      <Tabs.Screen name="Maintenance" options={{
        title: 'Maintenance',
        tabBarIcon: ({ color, size }) => <Ionicons name="build" size={size} color={color} />,
      }} />
      <Tabs.Screen name="Discover" options={{
        title: 'Hub',
        tabBarIcon: ({ color, size }) => <Ionicons name="bulb" size={size} color={color} />,
      }} />
      <Tabs.Screen name="Profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
