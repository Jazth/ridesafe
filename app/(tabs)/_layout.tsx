import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false, 
        tabBarButton: HapticTab, 
        tabBarBackground: TabBarBackground, 
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute', 
          },
          default: {}, 
        }),
      }}>
      <Tabs.Screen
        name="index" 
        options={{
          title: 'Emergency',
          tabBarIcon: ({ color, size }) => <Ionicons name="warning" size={size} color={color} />,
        }}
      />
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
