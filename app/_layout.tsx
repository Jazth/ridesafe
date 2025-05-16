import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router'; // Import Stack
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
export default function RootLayout() {
  const colorScheme = useColorScheme(); 
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}> 
      <Stack screenOptions={{ headerShown: false }}>
        {/*
          Define stack screens for your main routes.
          Setting headerShown: false removes the default navigation bar for these screens/routes.
        */}
        {/* The login screen - should be the initial route or explicitly navigated to */}
        <Stack.Screen name="login" options={{ headerShown: false }} />

        {/*
          The (tabs) directory route. When navigating to /(tabs), this Stack.Screen definition applies.
          Setting headerShown: false here hides the header of the root Stack when (tabs) is active.
          Headers *within* the tabs (defined in (tabs)/_layout.tsx or individual tab screens)
          are controlled separately by the tab navigator itself or nested stacks within tabs.
        */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> {/* <-- Added for tabs route */}

        {/* The +not-found screen for unmatched routes */}
        <Stack.Screen name="+not-found" options={{ headerShown: false }}/> {/* <-- Hide header for not-found */}
      </Stack>


    </ThemeProvider>
  );
}