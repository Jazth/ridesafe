import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useUserQueryLoginStore } from '@/constants/store'; // <-- Import Store

export default function MechanicTabLayout() {
  const colorScheme = useColorScheme();
  const { currentUser } = useUserQueryLoginStore();

  // Redirect Logic: Protect the route group
  if (!currentUser || currentUser.role !== 'mechanic') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        // ... (Your shared screenOptions)
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarActiveBackgroundColor: '#FF5722',
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}>
      
      {/* 1. Mechanic's Unique Tab */}
      <Tabs.Screen
        name="mechanicDashboard" // This must match the filename (mechanicDashboard.tsx)
        options={{
          title: 'Assignments', // Title for the unique tab
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
        }}
      />
      
      {/* 2. Shared Tabs */}
      <Tabs.Screen
        name="Maintenance"
        options={{
          title: 'Maintenance',
          tabBarIcon: ({ color, size }) => <Ionicons name="build" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
          name="Discover"
          options={{
            title: 'Hub',
            tabBarIcon: ({ color, size }) => <Ionicons name="bulb" size={size} color={color} />,
          }}
        />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}