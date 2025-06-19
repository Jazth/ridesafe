import { GoogleMaps } from "expo-maps";
import React from 'react';
import { StyleSheet, View } from 'react-native';


export default function Index() {
  return (
    <View style={styles.container}>
      <GoogleMaps.View style={styles.map} /> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});