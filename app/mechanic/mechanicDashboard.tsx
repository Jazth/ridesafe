import { db } from '@/scripts/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from '@react-native-community/geolocation';

const GOOGLE_MAPS_APIKEY = 'AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA'; // Use your API Key

type BreakdownRequest = {
  id: string;
  userId: string;
  location: { latitude: number; longitude: number };
  address: string;
  vehicleId: string | null;
  reason: string;
  timestamp: any; // Firestore Timestamp type
};

export default function MechanicDashboard() {
  const [requests, setRequests] = useState<BreakdownRequest[]>([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // Request location permission on Android
    async function requestLocationPermission() {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'This app needs access to your location to show routes.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            getCurrentLocation();
          } else {
            Alert.alert('Permission Denied', 'Location permission is needed to show directions.');
            // fallback mechanic location (optional)
            setMechanicLocation({ latitude: 37.78825, longitude: -122.4324 });
          }
        } catch (err) {
          console.warn(err);
          setMechanicLocation({ latitude: 37.78825, longitude: -122.4324 });
        }
      } else {
        getCurrentLocation();
      }
    }

    function getCurrentLocation() {
      Geolocation.getCurrentPosition(
        (position) => {
          setMechanicLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          Alert.alert('Location Error', error.message);
          // fallback location if error
          setMechanicLocation({ latitude: 37.78825, longitude: -122.4324 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    }

    requestLocationPermission();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'breakdown_requests'),
      (snapshot) => {
        const liveRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as BreakdownRequest[];
        setRequests(liveRequests);
      },
      (error) => {
        console.error('Error listening to breakdown requests:', error);
        Alert.alert('Error', 'Could not load breakdown requests.');
      },
    );

    return () => unsubscribe();
  }, []);

  function openMapModal(latitude: number, longitude: number) {
    setSelectedLocation({ latitude, longitude });
    setMapModalVisible(true);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Incoming Breakdown Requests</Text>
        {requests.length === 0 ? (
          <Text style={styles.empty}>No requests yet</Text>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <Text style={styles.address}>{req.address}</Text>
              <Text style={styles.reason}>Reason: {req.reason}</Text>
              <Text style={styles.timestamp}>
                {req.timestamp?.toDate
                  ? req.timestamp.toDate().toLocaleString()
                  : new Date(req.timestamp).toLocaleString()}
              </Text>
              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={() => openMapModal(req.location.latitude, req.location.longitude)}
              >
                <Text style={styles.viewMapButtonText}>View on Map</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Map Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={mapModalVisible}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setMapModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close Map</Text>
          </TouchableOpacity>

          {selectedLocation && mechanicLocation ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: (mechanicLocation.latitude + selectedLocation.latitude) / 2,
                longitude: (mechanicLocation.longitude + selectedLocation.longitude) / 2,
                latitudeDelta:
                  Math.abs(mechanicLocation.latitude - selectedLocation.latitude) * 2 || 0.05,
                longitudeDelta:
                  Math.abs(mechanicLocation.longitude - selectedLocation.longitude) * 2 || 0.05,
              }}
            >
              <Marker coordinate={mechanicLocation} title="Your Location" pinColor="blue" />
              <Marker coordinate={selectedLocation} title="Request Location" />
              <MapViewDirections
                origin={mechanicLocation}
                destination={selectedLocation}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={4}
                strokeColor="hotpink"
                onError={(errorMessage) => {
                  console.error('Directions error:', errorMessage);
                  Alert.alert('Error', 'Could not fetch directions.');
                }}
              />
            </MapView>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  empty: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  address: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
  },
  reason: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  timestamp: {
    fontSize: 14,
    marginBottom: 12,
    color: '#888',
  },
  viewMapButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewMapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 0,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
