import type { BreakdownRequest } from '@/constants/callForHelp';
import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { db } from '@/scripts/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const GOOGLE_MAPS_APIKEY = 'AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA';

// MECHANIC_ICON is no longer needed since we are using MaterialIcons
// const MECHANIC_ICON = require('@/assets/images/blue-dot.png'); 

export default function MechanicDashboard() {
  const { currentUser } = useUserQueryLoginStore();
  const { userInfo, fetchUserProfileData } = useUserProfileStore();

  const [requests, setRequests] = useState<BreakdownRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BreakdownRequest | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const mapRef = useRef<MapView>(null);
  const mechanicId = currentUser?.id;

  // 🔹 Location tracking
  useEffect(() => {
    if (!mechanicId) return;
    let locationWatcher: Location.LocationSubscription | null = null;

    const startMechanicLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      locationWatcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 10 },
        async (location) => {
          const newLoc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setMechanicLocation(newLoc);
          await setDoc(
            doc(db, 'mechanics', mechanicId),
            { currentLocation: { ...newLoc, updatedAt: new Date() } },
            { merge: true }
          );
        }
      );
    };

    startMechanicLocationUpdates();
    return () => {
      if (locationWatcher) locationWatcher.remove();
    };
  }, [mechanicId]);

  // 🔹 Fetch profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!mechanicId) return;
      try {
        setIsProfileLoading(true);
        await fetchUserProfileData(mechanicId);
      } catch {
        Alert.alert('Error', 'Failed to load your profile.');
      } finally {
        setIsProfileLoading(false);
      }
    };
    loadProfile();
  }, [mechanicId, fetchUserProfileData]);

  // 🔹 Listen for breakdown requests
  useEffect(() => {
    if (!mechanicId) return;
    const unsubscribe = onSnapshot(collection(db, 'breakdown_requests'), (snapshot) => {
      const allRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BreakdownRequest[];

      const filtered = allRequests.filter(
        (req) =>
          req.status === 'pending' ||
          (req.status === 'claimed' && req.claimedBy?.id === mechanicId)
      );
      setRequests(filtered);
    });
    return () => unsubscribe();
  }, [mechanicId]);

  const activeRequest = requests.find((r) => r.claimedBy?.id === mechanicId);
  const isOnCooldown = cooldownUntil && new Date() < cooldownUntil;

  const openMapModal = (req: BreakdownRequest) => {
    setSelectedRequest(req);
    setMapModalVisible(true);
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest || !mechanicId) return;
    if (isOnCooldown) {
      const minsLeft = Math.ceil((cooldownUntil!.getTime() - Date.now()) / 60000);
      Alert.alert('Cooldown Active', `You can claim again in ${minsLeft} minute(s).`);
      return;
    }
    if (activeRequest) {
      Alert.alert('Already Active', 'You already have an ongoing request.');
      return;
    }

    try {
      const mechanicData =
        userInfo || (await getDoc(doc(db, 'mechanics', mechanicId))).data();
      const mechanicInfo = {
        id: mechanicId,
        name:
          `${mechanicData?.firstName || ''} ${mechanicData?.lastName || ''}`.trim() ||
          'Mechanic',
        phoneNum: mechanicData?.phoneNumber || 'N/A',
        business: mechanicData?.businessName || 'N/A',
      };
      await updateDoc(doc(db, 'breakdown_requests', selectedRequest.id), {
        status: 'claimed',
        claimedBy: mechanicInfo,
      });
      setAccepted(true);
      Alert.alert('Accepted', 'You have accepted this request.');
    } catch {
      Alert.alert('Error', 'Failed to accept this request.');
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest) return;
    Alert.alert('Cancel Request?', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'breakdown_requests', selectedRequest.id), {
              status: 'cancelled',
              cancelledBy: mechanicId,
              cancelledAt: new Date(),
            });
            setAccepted(false);
            setCooldownUntil(new Date(Date.now() + 10 * 60 * 1000));
            setMapModalVisible(false);
          } catch {
            Alert.alert('Error', 'Failed to cancel request.');
          }
        },
      },
    ]);
  };

  const handleMarkAsDone = async () => {
    if (!selectedRequest) return;
    Alert.alert('Mark as Done?', 'Confirm completion?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'breakdown_requests', selectedRequest.id), {
              status: 'done',
              completedAt: new Date(),
            });
            Alert.alert('Success', 'Marked as completed.');
            setAccepted(false);
            setMapModalVisible(false);
          } catch {
            Alert.alert('Error', 'Failed to mark as done.');
          }
        },
      },
    ]);
  };

  const handleOpenInGoogleMaps = () => {
    if (!selectedRequest) return;
    const { latitude, longitude } = selectedRequest.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Incoming Breakdown Requests</Text>
        {requests.length === 0 ? (
          <Text style={styles.empty}>No requests yet</Text>
        ) : (
          requests.map((req) => (
            <TouchableOpacity key={req.id} style={styles.card} onPress={() => openMapModal(req)}>
              <Text style={styles.userName}>Requested by: {req.userName || 'Unknown'}</Text>
              <Text style={styles.address}>{req.address}</Text>
              <Text style={styles.reason}>Reason: {req.reason}</Text>
              <Text style={styles.timestamp}>
                {req.timestamp?.toDate
                  ? req.timestamp.toDate().toLocaleString()
                  : new Date(req.timestamp).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={mapModalVisible}>
        <View style={styles.modalWrapper}>
          <View style={styles.mapContainer}>
            <TouchableOpacity style={styles.closeIcon} onPress={() => setMapModalVisible(false)}>
              <MaterialIcons name="close" size={26} color="#333" />
            </TouchableOpacity>

            {selectedRequest && mechanicLocation ? (
              <>
              <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={{
                    latitude:
                      (mechanicLocation.latitude + selectedRequest.location.latitude) / 2,
                    longitude:
                      (mechanicLocation.longitude + selectedRequest.location.longitude) / 2,
                    latitudeDelta: 0.004, // 🔹 much closer to street level
                    longitudeDelta: 0.004,
                                        }}
                      onMapReady={() => {
                          mapRef.current?.fitToCoordinates(
                            [
                              mechanicLocation,
                              selectedRequest.location,
                            ],
                            {
                              edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                              animated: true,
                            }
                          );
                      }}
                  >
                  
                  {/* 🛠️ MECHANIC MARKER: Custom View with Orange Car Icon */}
                  <Marker 
                    coordinate={mechanicLocation} 
                    title="Your Location"
                  >
                    <View style={styles.mechanicMarker}>
                      <MaterialIcons name="directions-car" size={24} color="#FFFFFF" />
                    </View>
                  </Marker>
                  
                  {/* 🚗 REQUEST MARKER: Default Pin with Plain Red Color */}
                  <Marker 
                    coordinate={selectedRequest.location} 
                    title="Request Location"
                    pinColor="red" // Use pinColor for the default pin style
                  />
                  
                  {accepted && (
                    <MapViewDirections
                      origin={mechanicLocation}
                      destination={selectedRequest.location}
                      apikey={GOOGLE_MAPS_APIKEY}
                      strokeWidth={4}
                      strokeColor="#FF5722"
                      onReady={(result) => {
                        setRouteInfo({
                          distance: result.distance,
                          duration: result.duration,
                        });
                        mapRef.current?.fitToCoordinates(result.coordinates, {
                          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                          animated: true,
                        });
                      }}
                    />
                  )}
                </MapView>

                {accepted && (
                  <View style={styles.floatingBottom}>
                    <View style={styles.routeStats}>
                      <Text style={styles.routeText}>
                        Distance: {routeInfo?.distance?.toFixed(2) ?? '--'} km
                      </Text>
                      <Text style={styles.routeText}>
                        ETA: {routeInfo ? Math.round(routeInfo.duration) : '--'} min
                      </Text>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={handleOpenInGoogleMaps} style={styles.iconButton}>
                        <MaterialIcons name="map" size={28} color="#2ecc71" />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.doneButton} onPress={handleMarkAsDone}>
                        <MaterialIcons name="check-circle" size={20} color="#fff" />
                        <Text style={styles.doneButtonText}>Mark as Done</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
                      <MaterialIcons name="cancel" size={18} color="#fff" />
                      <Text style={styles.cancelButtonText}>Cancel Request</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!accepted && (
                  <View style={styles.floatingBottom}>
                    <TouchableOpacity
                      style={[
                        styles.acceptButton,
                        (isOnCooldown || !!activeRequest) && { backgroundColor: '#ccc' },
                      ]}
                      disabled={isOnCooldown || !!activeRequest}
                      onPress={handleAcceptRequest}
                    >
                      <Text style={styles.acceptButtonText}>
                        {isOnCooldown
                          ? 'Cooldown Active'
                          : activeRequest
                          ? 'Already Claimed'
                          : 'Accept Request'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 50 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#222',
  },
  empty: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  userName: { fontSize: 15, fontWeight: '600', color: '#111' },
  address: { fontSize: 16, fontWeight: '600', marginVertical: 4, color: '#222' },
  reason: { fontSize: 15, color: '#555', marginBottom: 4 },
  timestamp: { fontSize: 12, color: '#888' },
  modalWrapper: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1 },
  closeIcon: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
  },
  // 🛠️ NEW: Mechanic Marker Style (Orange Car)
  mechanicMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF9800', // Orange color for the mechanic vehicle
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // ⚠️ Removed mechanicIcon and requestMarker styles as per new requirements
  
  map: { flex: 1 },
  floatingBottom: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 8,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  routeText: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 6 },
  cancelButton: {
    flexDirection: 'row',
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 6 },
  acceptButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
});