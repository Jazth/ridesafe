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
  onSnapshot, runTransaction, setDoc,
  updateDoc
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
    const requestRef = doc(db, 'breakdown_requests', selectedRequest.id);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(requestRef);
      if (!snap.exists()) throw new Error('Request no longer exists');

      const data = snap.data() as BreakdownRequest;

      // ❌ Cancelled or already claimed = stop immediately
      if (data.status !== 'pending') {
        let msg = 'This request is no longer available.';
        if (data.status === 'cancelled') msg = 'This request was cancelled by the user.';
        else if (data.status === 'claimed') msg = 'Another mechanic already claimed this request.';
        else if (data.status === 'done') msg = 'This request has already been completed.';
        throw new Error(msg);
      }

      // ✅ Still pending — claim it now safely
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

      transaction.update(requestRef, {
        status: 'claimed',
        claimedBy: mechanicInfo,
      });
    });

    setAccepted(true);
    Alert.alert('Accepted', 'You have accepted this request.');
  } catch (error: any) {
    console.error('Error during accept:', error);
    if (error.message.includes('cancelled') || error.message.includes('claimed')) {
      Alert.alert('Unavailable', error.message);
      setMapModalVisible(false);
    } else {
      Alert.alert('Error', 'Failed to accept this request.');
    }
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
           <TouchableOpacity key={req.id} style={styles.card} onPress={() => openMapModal(req)} activeOpacity={0.9}>
  {/* Header: user + timestamp */}
  <View style={styles.cardHeader}>
    <View style={styles.userBlock}>
      <MaterialIcons name="person" size={18} color="#333" />
      <Text style={styles.userName}>
        {req.userName || 'Unknown'}
      </Text>
    </View>

    <Text style={styles.timeText}>
      {req.timestamp?.toDate
        ? req.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </Text>
  </View>

  {/* Vehicle + Reason row */}
  <View style={styles.cardRow}>
    <View style={styles.vehicleBlock}>
      <MaterialIcons name="directions-car" size={16} color="#fff" />
      <Text style={styles.vehicleText}>
        {req.vehicle
          ? `${req.vehicle.year} ${req.vehicle.make} ${req.vehicle.model}`
          : req.vehicleId
            ? `Vehicle #${req.vehicleId}`
            : 'Vehicle: Unknown'}
      </Text>
    </View>

    <View style={styles.reasonBlock}>
      <MaterialIcons name="report-problem" size={16} color="#e67e22" />
      <Text style={styles.reasonText}>{req.reason || 'Unknown'}</Text>
    </View>
  </View>

  {/* Address */}
  <View style={styles.addressRow}>
    <MaterialIcons name="place" size={16} color="#666" />
    <Text style={styles.addressText} numberOfLines={2}>
      {req.address || 'No address provided'}
    </Text>
  </View>

  {/* Footer: timestamp full + small actions */}
  <View style={styles.cardFooter}>
    <Text style={styles.timestamp}>
      {req.timestamp?.toDate
        ? req.timestamp.toDate().toLocaleString()
        : new Date(req.timestamp).toLocaleString()}
    </Text>

    <View style={styles.footerActions}>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => openMapModal(req)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="visibility" size={18} color="#fff" />
        <Text style={styles.viewBtnText}>View</Text>
      </TouchableOpacity>

      {req.phoneNum && (
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL(`tel:${req.phoneNum}`)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="phone" size={18} color="#fff" />
          <Text style={styles.callBtnText}>Call</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
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
  cardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
userBlock: {
  flexDirection: 'row',
  alignItems: 'center',
},
timeText: {
  fontSize: 12,
  color: '#888',
},
cardRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
vehicleBlock: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FF5722',
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 20,
  elevation: 2,
},
vehicleText: {
  color: '#fff',
  marginLeft: 8,
  fontSize: 13,
  fontWeight: '600',
},
reasonBlock: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#e67e22',
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 20,
},
reasonText: {
  marginLeft: 8,
  color: '#e67e22',
  fontSize: 13,
  fontWeight: '600',
},
addressRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 12,
},
addressText: {
  marginLeft: 8,
  color: '#444',
  fontSize: 14,
  flex: 1,
},
cardFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 6,
},
footerActions: {
  flexDirection: 'row',
  alignItems: 'center',
},
viewBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#007AFF',
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 20,
  marginLeft: 8,
},
viewBtnText: {
  color: '#fff',
  marginLeft: 6,
  fontWeight: '700',
},
callBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#4CAF50',
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 20,
  marginLeft: 8,
},
callBtnText: {
  color: '#fff',
  marginLeft: 6,
  fontWeight: '700',
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