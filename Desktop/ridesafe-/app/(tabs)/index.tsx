import ParallaxScrollView from '@/components/ParallaxScrollView';
import { Image } from 'expo-image';
import React from 'react';
import { LogBox, StyleSheet, Text, View } from 'react-native';
const GOOGLE_MAPS_API_KEY = 'AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA';

export default function HomeScreen() {
  LogBox.ignoreLogs([
    'Warning: Text strings must be rendered within a <Text> component',
    'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53. Use a development build instead of Expo Go. Read more at https://docs.expo.dev/develop/development-builds/introduction/.'
  ]);
  const initialRegion = {
    latitude: 14.5995, 
    longitude: 120.9842, 
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };


  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Welcome to the Map!</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Below is an interactive Google Map.</Text>
      </View>

    
      <View style={{ height: 200 }} /> 

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16, // Added padding
    paddingTop: 16,      // Added padding
  },
  titleText: { // Added style for title
    fontSize: 24,
    fontWeight: 'bold',
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 16, // Added padding
  },
  stepText: { // Added style for step text
    fontSize: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  mapContainer: {
    height: 400, // Define a height for the map container
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden', // Ensures map corners are rounded if map itself isn't
  },
  map: {
    ...StyleSheet.absoluteFillObject, // Make the map fill the container
  },
});
