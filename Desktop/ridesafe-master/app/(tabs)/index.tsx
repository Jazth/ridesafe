import { useBreakdownStore } from '@/constants/callForHelp';
import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { GoogleMaps } from "expo-maps";
import { GoogleMapsMapType } from 'expo-maps/build/google/GoogleMaps.types';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function Index() {
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const LATITUDE_DELTA = 0.0922;
  const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
  const [modalVisible, setModalVisible] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [initialRegion, setInitialRegion] = useState(null);
  const [isLoadingLocation, setLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [reasonValue, setReasonValue] = useState(null);
  const [address, setAddress] = useState(null);
  const { vehicles,  fetchUserProfileData, } = useUserProfileStore();
  const GOOGLEMAPKEY = "AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA";
  
  const { currentUser } = useUserQueryLoginStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

    useEffect(() => {
      if (currentUser?.id) {
        fetchUserProfileData(currentUser.id);
      } else {
        useUserProfileStore.getState().clearProfileState();
      }
    }, [currentUser?.id, fetchUserProfileData]);
  
    useEffect(() => {
      if (vehicles.length > 0 && selectedVehicleId === null) {
        setSelectedVehicleId(vehicles[0].id);
      } else if (vehicles.length === 0) {
        setSelectedVehicleId(null);
      }
    }, [vehicles, selectedVehicleId]);
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
        b = encoded.charCodeAt(index++) - 63; // Subtract 63 to get original value
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
    let subscriber;

    // Helper function to calculate distance between two coords in meters
    const distanceBetween = (loc1, loc2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371000; // Earth radius in meters

      const dLat = toRad(loc2.latitude - loc1.latitude);
      const dLon = toRad(loc2.longitude - loc1.longitude);
      const lat1 = toRad(loc1.latitude);
      const lat2 = toRad(loc2.latitude);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Permission to access location was denied. Cannot show your location on the map.'
        );
        setHasLocationPermission(false);
        setLoadingLocation(false);
        return;
      }
      setHasLocationPermission(true);

      try {
        const currentLocation = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = currentLocation.coords;

        setUserLocation({ latitude, longitude });

         const [geoAddress] = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (geoAddress) {
        const formattedAddress = `${geoAddress.name ?? ''} ${geoAddress.street ?? ''}, ${geoAddress.city ?? ''}, ${geoAddress.region ?? ''}, ${geoAddress.postalCode ?? ''}`.trim();
        setAddress(formattedAddress);
      }

        setInitialRegion({
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });

        subscriber = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
          (location) => {
            const newCoords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            // Update location only if moved more than 5 meters
            if (!userLocation || distanceBetween(userLocation, newCoords) > 5) {
              setUserLocation(newCoords);
            }
          }
        );
      } catch (error) {
        console.error("Error getting/watching location:", error);
      } finally {
        setLoadingLocation(false);
      }
    })();

    return () => {
      if (subscriber) subscriber.remove();
    };
  }, []);

  if (isLoadingLocation) {
    return (
      <SafeAreaView style={styles.fetchLocation}>
        <Text>Fetching Location</Text>
      </SafeAreaView>
    );
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
        <>
          <GoogleMaps.View
            properties={{
              selectionEnabled: true,
              mapType: GoogleMapsMapType.NORMAL,
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
              coordinates: userLocation
                ? {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  }
                : undefined,
            }}
            cameraPosition={
              initialRegion
                ? {
                    coordinates: {
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    },
                    zoom: 20,
                  }
                : undefined
            }
          />

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.infoButtonText}>Call For Help</Text>
          </TouchableOpacity>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
           <View style={styles.modalBackground}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Breakdown Details</Text>

                <Text style={styles.sectionTitle}>Location:</Text>
                <Text style={styles.infoText}>{address ?? 'Fetching address...'}</Text>

                <Text style={styles.sectionTitle}>Selected Vehicle:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedVehicleId}
                    style={styles.picker}
                    onValueChange={(itemValue) => setSelectedVehicleId(itemValue)}
                  >
                    <Picker.Item label="Select a vehicle" value={null} />
                    {vehicles.map(vehicle => (
                      <Picker.Item
                        key={vehicle.id}
                        label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        value={vehicle.id}
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.sectionTitle}>Reason for Breakdown:</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={reasonValue}
                    style={styles.picker}
                    onValueChange={(itemValue) => setReasonValue(itemValue)}
                  >
                    <Picker.Item label="I am not sure what malfunctioned" value="" />
                    <Picker.Item label="Car" value="car" />
                    <Picker.Item label="Bike" value="bike" />
                    <Picker.Item label="Truck" value="truck" />
                  </Picker>
                </View>

                <TouchableOpacity
                    style={styles.callHelpButton}
                    onPress={() => {
                      if (!selectedVehicleId || !userLocation) {
                        Alert.alert("Missing information", "Please select a vehicle and ensure location is active.");
                        return;
                      }

                      useBreakdownStore.getState().addRequest({
                        id: Date.now().toString(),
                        userId: currentUser.id,
                        location: userLocation,
                        address: address ?? "Unknown",
                        vehicleId: selectedVehicleId,
                        reason: reasonValue || "Unknown",
                        timestamp: Date.now(),
                      });

                      Alert.alert("Success", "Help request sent!");
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.callHelpButtonText}>Call For Help</Text>
                  </TouchableOpacity>


                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

          </Modal>
        </>
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
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 25,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#222',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#444',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 55,
    color: '#333',
  },
  callHelpButton: {
    marginTop: 25,
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callHelpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  userInfo:{         
    justifyContent: 'center',
    fontWeight: 'bold',
    borderBottomColor: 'black',
    borderBottomWidth: 2,
  },
 
  fetchLocation: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
  },
  infoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bold: {
    fontSize: 20,
  },
  
});
