import * as Location from 'expo-location';
import { GoogleMaps } from "expo-maps";
import { GoogleMapsMapType } from 'expo-maps/build/google/GoogleMaps.types';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function Index() {
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const LATITUDE_DELTA = 0.0922;
  const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [initialRegion, setInitialRegion] = useState(null);
  const [isLoadingLocation, setLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoordinate, setRouteCoordinate] = useState([]);
  const [isDestination, SetisDestination ] = useState(null)
  const GOOGLEMAPKEY = "AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA";
   const decodePolyline = (encoded) => {
    let points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;   
      shift += 5;
    } while (b >= 0x20); 
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); 
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng; 
    points.push({ latitude: (lat / 1e5), longitude: (lng / 1e5) });
  }
  return points;
};
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Permission to access location was denied. Cannot show your location on the map.'
        );
        setHasLocationPermission(false);
        return;
      }
      setHasLocationPermission(true);
      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        })
        setOrigin({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        })
        setInitialRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.error("Error getting current location:", error);
      }
      finally {
        setLoadingLocation(false);
      }
    })();
  }, []);
  if (isLoadingLocation) {
    return (
      <SafeAreaView style={styles.fetchLocation}>
        <Text> Fetching Location</Text>
      </SafeAreaView>
    )
  }


const userMarker = userLocation
  ? {
      coordinates: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
      title: "You are here",
      showCallout: true,
      draggable: false,
      id: "user-marker", 
    }
  : null;
  return (
    <View style={styles.container}>
      {hasLocationPermission ? (
        <GoogleMaps.View
          properties={{
           selectionEnabled: true,
           mapType: GoogleMapsMapType.NORMAL
          }}  
          style={styles.map}
           markers={userMarker ? [userMarker] : []}
          uiSettings={{
          zoomControlsEnabled: false,
          tiltGesturesEnabled: false,
          myLocationButtonEnabled: false,
          }}
         
          userLocation={{
            followUserLocation: true,
            coordinates: {
              latitude: initialRegion.latitude,
              longitude: initialRegion.longitude,
            }
          }}
          cameraPosition={initialRegion ? {
            coordinates: {
              latitude: initialRegion.latitude,
              longitude: initialRegion.longitude,
            },
            zoom:20
          } : undefined}
        />
      ) : (
        <View style={styles.permissionDeniedContainer}>
          <Text style={styles.permissionDeniedText}>
            Location access is required to show your position on the map.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fetchLocation: {
    width: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  permissionDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 20,
    color: '#333',
  },
});