import type { BreakdownRequest } from '@/constants/callForHelp';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { db } from '@/scripts/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const GOOGLE_MAPS_APIKEY = 'AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA';

export default function MechanicDashboard() {
  const mechanicId = 'mechanic1'; // replace with your mechanic auth id
  const [requests, setRequests] = useState<BreakdownRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BreakdownRequest | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
const [lastSelectedRequest, setLastSelectedRequest] = useState<BreakdownRequest | null>(null);

  const mapRef = useRef<MapView>(null);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);

  const { vehicles } = useUserProfileStore();
  
  useEffect(() => {
  const fetchMechanicProfile = async () => {
    if (!mechanicId) return;

    try {
      setIsProfileLoading(true); // start loading
      const docRef = doc(db, 'mechanics', mechanicId);
      const docSnap = await getDoc(docRef);

     if (docSnap.exists()) {
      const data = docSnap.data();
      useUserProfileStore.getState().setUserInfo({ id: docSnap.id, ...data });
      useUserProfileStore.getState().setVehicles(data.vehicles || []);
    } else {
      useUserProfileStore.getState().setUserInfo(null);
      useUserProfileStore.getState().setVehicles([]);
    }

    } catch (error) {
      console.error('Error fetching mechanic profile:', error);
      Alert.alert('Error', 'Failed to load mechanic profile.');
    } finally {
      setIsProfileLoading(false); // finished loading
    }
  };

  fetchMechanicProfile();
}, [mechanicId]);


  // Get mechanic location dynamically
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setMechanicLocation({ latitude: 37.78825, longitude: -122.4324 });
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setMechanicLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });

      locationWatcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 5 },
        (loc) => setMechanicLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
      );
    })();

    return () => locationWatcher.current?.remove();
  }, []);
 useEffect(() => {
  if (!mechanicId) return;

  const unsubscribe = onSnapshot(collection(db, 'breakdown_requests'), (snapshot) => {
    const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BreakdownRequest[];

    let mechanicFiltered = allRequests.filter(req =>
      req.status === 'pending' || (req.status === 'claimed' && req.claimedBy?.id === mechanicId)
    );

    if (selectedRequest && !mechanicFiltered.find(r => r.id === selectedRequest.id)) {
      mechanicFiltered = [...mechanicFiltered, selectedRequest];
    }

    if (lastSelectedRequest && !mechanicFiltered.find(r => r.id === lastSelectedRequest.id)) {
      mechanicFiltered = [...mechanicFiltered, lastSelectedRequest];
    }

    setRequests(mechanicFiltered);
  });

  return () => unsubscribe();
}, [mechanicId, selectedRequest, lastSelectedRequest]);


  const activeRequest = requests.find(r => r.claimedBy?.id === mechanicId);
  const isOnCooldown = cooldownUntil && new Date() < cooldownUntil;

  useEffect(() => {
    if (selectedRequest) {
      setAccepted(selectedRequest.claimedBy?.id === mechanicId);
    }
  }, [selectedRequest]);

  const openMapModal = (req: BreakdownRequest) => {
  setSelectedRequest(req);
  setLastSelectedRequest(req);
  setMapModalVisible(true);
};

  const { fetchUserProfileData } = useUserProfileStore();

  const handleAcceptRequest = async () => {
  if (!selectedRequest) return;

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
    const mechanicInfoFromStore = useUserProfileStore.getState().userInfo;

if (!mechanicInfoFromStore) {
  Alert.alert('Error', 'Mechanic profile not loaded yet.');
  return;
}

const mechanicInfo = {
  id: mechanicId,
  name: `${mechanicInfoFromStore.firstName || ''} ${mechanicInfoFromStore.lastName || ''}`.trim() || 'Mechanic',
  firstName: mechanicInfoFromStore.firstName || '',
  lastName: mechanicInfoFromStore.lastName || '',
  phoneNum: mechanicInfoFromStore.phoneNumber || 'N/A',
  business: mechanicInfoFromStore.businessName || 'N/A',
};

    await updateDoc(doc(db, 'breakdown_requests', selectedRequest.id), {
      status: 'claimed',
      claimedBy: mechanicInfo,
    });

    setAccepted(true);
    Alert.alert('Accepted', 'You have accepted this breakdown request.');
  } catch (error) {
    console.error('Error accepting request:', error);
    Alert.alert('Error', 'Could not accept this request.');
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
            setCooldownUntil(new Date(Date.now() + 10 * 60 * 1000)); // 10 min cooldown
            setMapModalVisible(false);
            setSelectedRequest(null);
            setLastSelectedRequest(null);
          } catch {
            Alert.alert('Error', 'Failed to cancel request.');
          }
        },
      },
    ]);
  };
  
  const handleMarkAsDone = async () => {
    if (!selectedRequest) return;

    Alert.alert('Mark as Done?', 'Confirm completion', [
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
            setMapModalVisible(false);
            setAccepted(false);
            setSelectedRequest(null);
          setLastSelectedRequest(null);
          } catch {
            Alert.alert('Error', 'Failed to mark as done.');
          }
        },
      },
    ]);
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
              <Text style={styles.vehicle}>
                Vehicle:{' '}
                {vehicles.find((v) => v.id === req.vehicleId)
                  ? `${vehicles.find((v) => v.id === req.vehicleId)?.year} ${vehicles.find((v) => v.id === req.vehicleId)?.make} ${vehicles.find((v) => v.id === req.vehicleId)?.model}`
                  : 'Unknown'}
              </Text>
              <Text style={styles.reason}>Reason: {req.reason}</Text>
              <Text style={styles.location}>
                {req.location?.latitude?.toFixed(6)}, {req.location?.longitude?.toFixed(6)}
              </Text>
              <Text style={styles.timestamp}>
                {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString() : new Date(req.timestamp).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Map Modal */}
      <Modal animationType="slide" transparent={false} visible={mapModalVisible}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeIcon} onPress={() => setMapModalVisible(false)}>
            <MaterialIcons name="close" size={28} color="#333" />
          </TouchableOpacity>

          {selectedRequest && mechanicLocation ? (
            <>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: (mechanicLocation.latitude + selectedRequest.location.latitude) / 2,
                  longitude: (mechanicLocation.longitude + selectedRequest.location.longitude) / 2,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                onMapReady={() =>
                  mapRef.current?.fitToCoordinates([mechanicLocation, selectedRequest.location], {
                    edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                    animated: true,
                  })
                }
              >
                <Marker coordinate={mechanicLocation} title="Your Location">
                  <View style={styles.mechanicMarker} />
                </Marker>
                <Marker coordinate={selectedRequest.location} title="Request Location">
               
                </Marker>

                {accepted && (
                  <MapViewDirections
                    origin={mechanicLocation}
                    destination={selectedRequest.location}
                    apikey={GOOGLE_MAPS_APIKEY}
                    strokeWidth={4}
                    strokeColor="#007bff"
                    onReady={(result) => {
                      setRouteInfo({ distance: result.distance, duration: result.duration });
                      mapRef.current?.fitToCoordinates(result.coordinates, {
                        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                        animated: true,
                      });
                    }}
                  />
                )}
              </MapView>

              <View style={styles.routeInfoBelow}>
                {!accepted ? (
                  <TouchableOpacity
                    style={[styles.acceptButton, (isOnCooldown || !!activeRequest) && { backgroundColor: '#ccc' }]}
                    disabled={isOnCooldown || !!activeRequest}
                    onPress={handleAcceptRequest}
                  >
                    <Text style={styles.acceptButtonText}>
                      {isOnCooldown ? 'Cooldown Active' : activeRequest ? 'Already Claimed' : 'Accept Request'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Text style={styles.routeText}>Distance: {routeInfo?.distance?.toFixed(2) ?? '--'} km</Text>
                    <Text style={styles.routeText}>ETA: {routeInfo ? Math.round(routeInfo.duration) : '--'} min</Text>
                    <TouchableOpacity style={styles.doneButton} onPress={handleMarkAsDone}>
                      <Text style={styles.doneButtonText}>Mark as Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRequest}>
                      <Text style={styles.cancelButtonText}>Cancel Request</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
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
  container: { padding: 16, paddingBottom: 50 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#333' },
  empty: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 5 },
  userName: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#111' },
  address: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#222' },
  reason: { fontSize: 16, marginBottom: 8, color: '#555' },
  vehicle: { fontSize: 16, marginBottom: 8, color: '#444' },
  location: { fontSize: 14, marginBottom: 8, color: '#666' },
  timestamp: { fontSize: 12, marginBottom: 8, color: '#888' },
  modalContainer: { flex: 1 },
  closeIcon: { position: 'absolute', top: 40, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 4, elevation: 5 },
  map: { flex: 1 },
  routeInfoBelow: { paddingVertical: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderTopColor: '#ccc', borderTopWidth: 1, alignItems: 'center' },
  acceptButton: { backgroundColor: '#28a745', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30 },
  acceptButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  doneButton: { marginTop: 10, backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30 },
  doneButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancelButton: { marginTop: 10, backgroundColor: '#d9534f', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30 },
  cancelButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  routeText: { fontSize: 18, color: '#333', fontWeight: '600', marginBottom: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  mechanicMarker: {
    width: 40,
    height: 40,
    borderRadius: 300,
    backgroundColor: '#007bff', // Blue circle
    borderWidth: 2,
    borderColor: '#fff',
  },
});
