import { useBreakdownStore } from '@/constants/callForHelp';
import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { db } from '@/scripts/firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { GoogleMaps } from "expo-maps";
import { GoogleMapsMapType } from 'expo-maps/build/google/GoogleMaps.types';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  
const [modalStep, setModalStep] = useState('form'); // 'form', 'confirm', 'active'
const [tempRequest, setTempRequest] = useState(null); // Holds the request details before final submit
const [activeRequest, setActiveRequest] = useState(null);

  const { currentUser } = useUserQueryLoginStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [transactionsModalVisible, setTransactionsModalVisible] = useState(false);
  const [userTransactions, setUserTransactions] = useState([]);


  // Fetch transactions for current user when modal opens
  useEffect(() => {
    if (!transactionsModalVisible || !currentUser?.id) return;

    const q = query(
      collection(db, 'breakdown_requests'),
      where('userId', '==', currentUser.id),
      where('status', 'in', ['pending', 'claimed', 'done']) // include done
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transactions = [];
      querySnapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      setUserTransactions(transactions);
    });

    return () => unsubscribe();
  }, [transactionsModalVisible, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      setActiveRequest(null);
      return;
    }

    const q = query(
      collection(db, 'breakdown_requests'),
      where('userId', '==', currentUser.id),
      where('status', 'in', ['pending', 'claimed'])
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        setActiveRequest({ id: doc.id, ...doc.data() });
      } else {
        setActiveRequest(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id]);
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
  setModalStep('form');
  setTempRequest(null);
  setModalVisible(true);
}, []); // empty dependency array means run only once on mount


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
            style={styles.hamburgerButton}
            onPress={() => setTransactionsModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>

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

      {modalStep === 'form' && (
        <>
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
              <Picker.Item label="Tires" value="" />
              <Picker.Item label="Transmission / Drivetrain" value="" />
              <Picker.Item label="Steering / Suspension" value="" />
              <Picker.Item label="Exhaust / Emissions" value="" />
              <Picker.Item label="Engine / Ignition" value="" />
              <Picker.Item label="Other / Unknown" value="" />
            </Picker>
          </View>

          <TouchableOpacity
  style={styles.callHelpButton}
  onPress={async () => {
    if (!selectedVehicleId || !userLocation) {
      Alert.alert("Missing information", "Please select a vehicle and ensure location is active.");
      return;
    }

    const request = {
      id: Date.now().toString(),
      userId: currentUser.id,
      location: userLocation,
      address: address ?? "Unknown",
      vehicleId: selectedVehicleId,
      reason: reasonValue || "Unknown",
      timestamp: Date.now(),
      status: 'pending',
      claimedBy: null,
    };

    try {
      const docRef = await addDoc(collection(db, 'breakdown_requests'), {
        userId: request.userId,
        location: request.location,
        address: request.address,
        vehicleId: request.vehicleId,
        reason: request.reason,
        status: request.status,
        claimedBy: request.claimedBy,
        timestamp: serverTimestamp(),
      });

      const savedRequest = { ...request, id: docRef.id };
      useBreakdownStore.getState().addRequest(savedRequest);
      setActiveRequest(savedRequest);
      setModalStep('active');
      Alert.alert("Success", "Help request sent!");
    } catch (error) {
      console.error("Error sending help request:", error);
      Alert.alert("Error", "Failed to send help request. Please try again.");
    }
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
        </>
      )}
      {modalStep === 'active' && activeRequest && (
        <View style={styles.activeRequestContainer}>
          <Text style={styles.modalTitle}>Your Help Request</Text>

          <Text>Status: {activeRequest.status === 'pending' ? 'Pending' : 'Claimed by mechanic'}</Text>

          {activeRequest.status === 'claimed' && activeRequest.claimedBy ? (
            <Text>Claimed by: {activeRequest.claimedBy.name || 'A mechanic'}</Text>
          ) : null}

          {activeRequest.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={async () => {
                try {
                  await deleteDoc(doc(db, 'breakdown_requests', activeRequest.id));
                  Alert.alert('Cancelled', 'Your help request has been cancelled.');
                  setActiveRequest(null);
                  setModalStep('form'); // Reset modal step
                  setModalVisible(false);
                } catch (error) {
                  Alert.alert('Error', 'Failed to cancel the request. Please try again.');
                }
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  </View>
</Modal>
 <Modal
  animationType="slide"
  transparent={true}
  visible={transactionsModalVisible}
  onRequestClose={() => setTransactionsModalVisible(false)}
>
  <View style={styles.modalBackground}>
    <View style={styles.transactionsModalContainer}>
      <Text style={styles.modalTitle}>Your Requests History</Text>
      <ScrollView style={{ maxHeight: 400 }}>
        <View style={{ flexDirection: 'column' }}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          {userTransactions.filter(tx => tx.status === 'pending').length === 0 ? (
            <Text style={styles.noRequestsText}>No pending requests.</Text>
          ) : (
            userTransactions.filter(tx => tx.status === 'pending').map(tx => {
              const vehicle = vehicles.find(v => v.id === tx.vehicleId);
              return (
                <View key={tx.id} style={styles.transactionItem}>
                  <Text><Text style={{ fontWeight: '700' }}>Status:</Text> {tx.status}</Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Vehicle:</Text> {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown'}
                  </Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Reason:</Text> {tx.reason || 'Unknown'}
                  </Text>
                  <Text><Text style={{ fontWeight: '700' }}>Address:</Text> {tx.address}</Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Date:</Text> {tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : 'Unknown'}
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      Alert.alert(
                        "Cancel Request",
                        "Are you sure you want to cancel this request?",
                        [
                          { text: "No", style: "cancel" },
                          {
                            text: "Yes",
                            onPress: async () => {
                              try {
                                await deleteDoc(doc(db, 'breakdown_requests', tx.id));
                                Alert.alert('Request cancelled successfully');
                              } catch (error) {
                                Alert.alert('Error cancelling request', error.message);
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <Text style={styles.sectionTitle}>Cancelled Requests</Text>
          {userTransactions.filter(tx => tx.status === 'cancelled').length === 0 ? (
            <Text style={styles.noRequestsText}>No cancelled requests.</Text>
          ) : (
            userTransactions.filter(tx => tx.status === 'cancelled').map(tx => {
              const vehicle = vehicles.find(v => v.id === tx.vehicleId);
              return (
                <View key={tx.id} style={styles.transactionItem}>
                  <Text><Text style={{ fontWeight: '700' }}>Status:</Text> {tx.status}</Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Vehicle:</Text> {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown'}
                  </Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Reason:</Text> {tx.reason || 'Unknown'}
                  </Text>
                  <Text><Text style={{ fontWeight: '700' }}>Address:</Text> {tx.address}</Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Date:</Text> {tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : 'Unknown'}
                  </Text>
                </View>
              );
            })
          )}

          <Text style={styles.sectionTitle}>Approved Requests</Text>
          {userTransactions.filter(tx => tx.status === 'approved').length === 0 ? (
            <Text style={styles.noRequestsText}>No approved requests.</Text>
          ) : (
            userTransactions.filter(tx => tx.status === 'approved').map(tx => {
              const vehicle = vehicles.find(v => v.id === tx.vehicleId);
              return (
                <View key={tx.id} style={styles.transactionItem}>
                  <Text><Text style={{ fontWeight: '700' }}>Status:</Text> {tx.status}</Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Vehicle:</Text> {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown'}
                  </Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Reason:</Text> {tx.reason || 'Unknown'}
                  </Text>
                  <Text><Text style={{ fontWeight: '700' }}>Address:</Text> {tx.address}</Text>
                  <Text>
                    <Text style={{ fontWeight: '700' }}>Date:</Text> {tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : 'Unknown'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setTransactionsModalVisible(false)}
      >
        <Text style={styles.closeButtonText}>Close</Text>
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
  activeRequestContainer: {
    // Similar to modalContainer but maybe a bit more compact
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 10,
    width: '100%',
    maxWidth: 400,
  },

  cancelButton: {
    marginTop: 20,
    backgroundColor: '#E53935', // red color for cancel
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  hamburgerButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 30,
    height: 25,
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  hamburgerLine: {
    height: 3,
    backgroundColor: 'white',
    borderRadius: 1.5,
  },

  transactionsModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: 400,
    elevation: 10,
  },
  transactionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sectionTitles: {
  fontWeight: '700',
  fontSize: 16,
  marginTop: 20,
  marginBottom: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#ccc',
  paddingBottom: 4,
},

noRequestsText: {
  textAlign: 'center',
  marginVertical: 10,
  fontStyle: 'italic',
  color: '#666',
},

  
});
