import type { BreakdownRequest } from '@/constants/callForHelp';
import { useBreakdownStore } from '@/constants/callForHelp';
import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { db } from '@/scripts/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const { width, height } = Dimensions.get('window');
  const ASPECT_RATIO = width / height;
  const LATITUDE_DELTA = 0.004;
  const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
  const [modalVisible, setModalVisible] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [isLoadingLocation, setLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [reasonValue, setReasonValue] = useState(null);
  const [serviceCompletedModalVisible, setServiceCompletedModalVisible] = useState(false);
const [latestDoneRequest, setLatestDoneRequest] = useState<BreakdownRequest | null>(null);
  const [address, setAddress] = useState(null);
  const { vehicles,  fetchUserProfileData, } = useUserProfileStore();
  const GOOGLEMAPKEY = "AIzaSyAxVriB1UsbVdbBbrWQTAnAohoxwKVLXPA";
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [modalStep, setModalStep] = useState('form'); 
  const [tempRequest, setTempRequest] = useState(null); 
  const [activeRequest, setActiveRequest] = useState(null);
  const mapRef = useRef<MapView | null>(null);
  const { currentUser } = useUserQueryLoginStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [transactionsModalVisible, setTransactionsModalVisible] = useState(false);
  const [userTransactions, setUserTransactions] = useState([]);

  useEffect(() => {
    if (!transactionsModalVisible || !currentUser?.id) return;

    const q = query(
      collection(db, "breakdown_requests"),
      where("userId", "==", currentUser.id),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
       if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() } as BreakdownRequest;
        if (data.status === "done" && activeRequest?.status !== "done") {
        }
        setActiveRequest(data);
      } else {
        setActiveRequest(null);
      }
      const transactions = [];
      querySnapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      setUserTransactions(transactions);
    });

    return () => unsubscribe();
  }, [transactionsModalVisible, currentUser?.id]);


  // ✅ Real-time listener for the most recent active request
  useEffect(() => {
    if (!currentUser?.id) {
      setActiveRequest(null);
      return;
    }

    const q = query(
      collection(db, "breakdown_requests"),
      where("userId", "==", currentUser.id),
      where("status", "in", ["pending", "claimed"]),
      orderBy("status", "desc"), // required for index
      orderBy("timestamp", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() } as BreakdownRequest;

        console.log("🔥 Active request status:", data.status);
        setActiveRequest(data);
      } else {
        console.log("No active request found.");
        setActiveRequest(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.id]);
    // ✅ Automatically change modal step based on request status
  useEffect(() => {
    if (!activeRequest) {
      setModalStep("form");
      return;
    }

    if (activeRequest.status === "done") {
      setModalStep("completed");
    } else if (activeRequest.status === "cancelled") {
      setModalStep("form");
    } else if (["pending", "claimed"].includes(activeRequest.status)) {
      setModalStep("active");
    }
  }, [activeRequest]);
  // ✅ Detect when a request transitions to "done" in real-time (even after completion)
// ✅ Detect when a request transitions to "done" in real-time (even after completion)
useEffect(() => {
  if (!currentUser?.id) return;

  let lastDoneIds: string[] = [];
  let initialized = false;

  const q = query(
    collection(db, "breakdown_requests"),
    where("userId", "==", currentUser.id),
    orderBy("timestamp", "desc")
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const requests = querySnapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as BreakdownRequest)
    );

    const doneIds = requests.filter((r) => r.status === "done").map((r) => r.id);

    if (!initialized) {
      lastDoneIds = doneIds;
      initialized = true;
      return;
    }

    const newlyDone = doneIds.filter((id) => !lastDoneIds.includes(id));
    if (newlyDone.length > 0) {
      const latestDone = requests.find((r) => r.id === newlyDone[0]);
      if (latestDone) {
        setLatestDoneRequest(latestDone);
        setServiceCompletedModalVisible(true);
      }
    }

    lastDoneIds = doneIds;
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
  }, []);

  // Real-time mechanic tracking like Angkas/Lalamove
  useEffect(() => {
    if (activeRequest?.status === "claimed" && activeRequest.claimedBy?.id) {
      const mechanicRef = doc(db, "mechanics", activeRequest.claimedBy.id);
      console.log("👀 Tracking mechanic:", activeRequest.claimedBy.id);

      const unsubscribe = onSnapshot(mechanicRef, async (docSnap) => {
        const data = docSnap.data();
        if (data?.currentLocation) {
          const newLoc = data.currentLocation;
          setMechanicLocation(newLoc);
          console.log("📍 Mechanic moving:", newLoc);

          // Fetch route dynamically
          if (userLocation) {
            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${newLoc.latitude},${newLoc.longitude}&destination=${userLocation.latitude},${userLocation.longitude}&key=${GOOGLEMAPKEY}`
              );
              const result = await response.json();
              if (result.routes?.length > 0) {
                const points = decodePolyline(result.routes[0].overview_polyline.points);
                setRouteCoords(points);
                const leg = result.routes[0].legs[0];
                setRouteInfo({
                  distance: leg.distance.value / 1000,
                  duration: leg.duration.value / 60,
                });
              }
            } catch (err) {
              console.error("Error updating route:", err);
            }
          }

          // Smooth map adjustment every mechanic update (we'll let fitToCoordinates handle bounds)
          // but also update initialRegion center for fallback
          setInitialRegion(prev => {
            const centerLat = (newLoc.latitude + (userLocation?.latitude ?? newLoc.latitude)) / 2;
            const centerLng = (newLoc.longitude + (userLocation?.longitude ?? newLoc.longitude)) / 2;
            return {
              latitude: centerLat,
              longitude: centerLng,
              latitudeDelta: Math.abs(newLoc.latitude - (userLocation?.latitude ?? newLoc.latitude)) * 3 || 0.001,
              longitudeDelta: Math.abs(newLoc.longitude - (userLocation?.longitude ?? newLoc.longitude)) * 3 || 0.001,
            } as Region;
          });
        }
      });

      return () => unsubscribe();
    } else {
      setMechanicLocation(null);
      setRouteCoords([]);
    }
  }, [activeRequest, userLocation]);

  // When both mechanic & user exist, attempt to auto-fit both markers closely (street-level)
  useEffect(() => {
    if (!mechanicLocation || !userLocation || !mapRef.current) return;

    const coords = [
      { latitude: mechanicLocation.latitude, longitude: mechanicLocation.longitude },
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
    ];

    // If two points are extremely close, animate to a tight region instead of fitToCoordinates
    const latDiff = Math.abs(mechanicLocation.latitude - userLocation.latitude);
    const lngDiff = Math.abs(mechanicLocation.longitude - userLocation.longitude);
    const maxDiff = Math.max(latDiff, lngDiff);

    if (maxDiff < 0.0002) {
      // VERY close (same building/very near) -> street/building zoom
      const centerLat = (mechanicLocation.latitude + userLocation.latitude) / 2;
      const centerLng = (mechanicLocation.longitude + userLocation.longitude) / 2;
      const tightRegion = {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: 0.0004,
        longitudeDelta: 0.0004,
      } as Region;
      mapRef.current.animateToRegion(tightRegion, 500);
      return;
    }

    try {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 50, left: 40 },
        animated: true,
      });

      // also set a fallback initialRegion so cameraPosition prop (if used elsewhere) remains in sync
      const centerLat = (mechanicLocation.latitude + userLocation.latitude) / 2;
      const centerLng = (mechanicLocation.longitude + userLocation.longitude) / 2;
      const latDelta = Math.abs(mechanicLocation.latitude - userLocation.latitude) * 2.2 || 0.001;
      const lngDelta = Math.abs(mechanicLocation.longitude - userLocation.longitude) * 2.2 || 0.001;
      setInitialRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      } as Region);
    } catch (err) {
      console.warn("Fit to coordinates failed:", err);
    }
  }, [mechanicLocation, userLocation]);

  // whenever initialRegion changes (e.g., at startup or when we set a center), smoothly animate camera
  useEffect(() => {
    if (!initialRegion || !mapRef.current) return;
    try {
      // Use animateToRegion for smooth transition
      mapRef.current.animateToRegion(initialRegion, 500);
    } catch (err) {
      console.warn("animateToRegion failed:", err);
    }
  }, [initialRegion]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!mechanicLocation || !userLocation) return;

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${mechanicLocation.latitude},${mechanicLocation.longitude}&destination=${userLocation.latitude},${userLocation.longitude}&key=${GOOGLEMAPKEY}`
        );
        const data = await response.json();
        if (data.routes?.length > 0) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoords(points);

          const leg = data.routes[0].legs[0];
          setRouteInfo({
            distance: leg.distance.value / 1000,
            duration: leg.duration.value / 60,
          });
        }
      } catch (error) {
        console.error("Error fetching route info:", error);
      }
    };

    fetchRoute();
  }, [mechanicLocation, userLocation]);

  // Location watcher & initial location
  useEffect(() => {
    let subscriber: any;

    const distanceBetween = (loc1, loc2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371000;
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
        } as Region);

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

  const userMarkerObj = userLocation
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
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={
              initialRegion ?? (userLocation ? {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
              } : undefined)
            }
            // we rely on animateToRegion & fitToCoordinates instead of controlling `region` prop
            showsMyLocationButton={false}
            showsUserLocation={false}
            zoomTapEnabled={false}
            zoomEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
          >
          {/* user marker */}
{userLocation && (
  <Marker coordinate={userLocation} title="You are here" identifier="user-marker">
    <View style={{
      width: 40,
      height: 40,
      borderRadius: 40,
      backgroundColor: '#4285F4', // Google Maps blue
      borderWidth: 3,
      borderColor: '#fff',
    }} />
  </Marker>
)}

{/* mechanic marker */}
{mechanicLocation && (
  <Marker coordinate={mechanicLocation} title="Mechanic Location" identifier="mechanic-marker">
    <View style={{
      backgroundColor: '#FF5722', // orange background
      padding: 6,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <MaterialIcons name="directions-car" size={24} color="#FFFFFF" />
    </View>
  </Marker>
)}
      {routeCoords.length > 0 && (
        <Polyline
          coordinates={routeCoords}
          strokeWidth={5}
          strokeColor="#FF5722"
        />
      )}
    </MapView>
    {mechanicLocation && routeInfo && (
      <View
        style={{
          position: "absolute",
          bottom: 100,
          alignSelf: "center",
          backgroundColor: "white",
          padding: 10,
          borderRadius: 10,
        }}
      >
        <Text>🚗 Mechanic is {routeInfo.distance.toFixed(2)} km away</Text>
        <Text>⏱️ ETA: {Math.round(routeInfo.duration)} min</Text>
      </View>
    )}

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
          {modalStep === "form" && (
            <>
              <Text style={styles.modalTitle}>Breakdown Details</Text>

              <Text style={styles.sectionTitle}>Location:</Text>
              <Text style={styles.infoText}>
                {address ?? "Fetching address..."}
              </Text>

              <Text style={styles.sectionTitle}>Selected Vehicle:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedVehicleId}
                  style={styles.picker}
                  onValueChange={(itemValue) => setSelectedVehicleId(itemValue)}
                >
                  <Picker.Item label="Select a vehicle" value={null} />
                  {vehicles.map((vehicle) => (
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
                  <Picker.Item
                    label="I am not sure what malfunctioned"
                    value="unknown"
                  />
                  <Picker.Item label="Tires" value="tires" />
                  <Picker.Item
                    label="Transmission / Drivetrain"
                    value="transmission"
                  />
                  <Picker.Item label="Steering / Suspension" value="steering" />
                  <Picker.Item label="Exhaust / Emissions" value="exhaust" />
                  <Picker.Item label="Engine / Ignition" value="engine" />
                  <Picker.Item label="Other / Unknown" value="other" />
                </Picker>
              </View>

                    <TouchableOpacity
                      style={styles.callHelpButton}
   onPress={async () => {
  if (!selectedVehicleId || !userLocation) {
    Alert.alert("Missing information", "Please select a vehicle and ensure location is active.");
    return;
  }

  const store = useUserProfileStore.getState();
  let userProfile = store.userInfo;

  if (!userProfile || !userProfile.phoneNum || userProfile.phoneNum === "N/A") {
    console.log(" Refetching user profile before sending request...");
    await store.fetchUserProfileData(currentUser.id);
    userProfile = useUserProfileStore.getState().userInfo; 
  }

  const userName =
    userProfile?.fullName ||
    `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim() ||
    "Unknown User";

const phoneNum = userProfile?.phoneNumber || userProfile?.phoneNum || "N/A";


  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

const request = {
  userId: currentUser.id,
  userName,
  phoneNum,
  location: userLocation,
  address: address ?? "Unknown",
  vehicleId: selectedVehicleId,
  vehicle: selectedVehicle || null, // ✅ include full info
  reason: reasonValue,
  status: "pending" as "pending",
  claimedBy: null,
  timestamp: serverTimestamp(),
};


  try {
   const docRef = await addDoc(collection(db, "breakdown_requests"), request);
const savedRequest = { ...request, id: docRef.id };

// Wait a bit to ensure snapshot listener catches it
setTimeout(() => {
  setActiveRequest(savedRequest);
  setModalStep("active");
}, 500);

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
                {modalStep === "active" && activeRequest && (
          <View style={styles.activeRequestContainer}>
            <TouchableOpacity
              style={styles.modalCloseX}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseXText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Your Help Request</Text>

            <View style={styles.statusContainer}>
              {activeRequest.status === "pending" && (
                <Text style={styles.pendingStatus}>Pending</Text>
              )}

              {activeRequest.status === "claimed" && activeRequest.claimedBy && (

                <>
                 {activeRequest.status === "claimed" && activeRequest.claimedBy && (

            <>
              <Text style={styles.claimedStatus}>
                Claimed by: {activeRequest.claimedBy.name || "Mechanic"}
              </Text>
                        {activeRequest.claimedBy.firstName || activeRequest.claimedBy.lastName ? (
                          <Text style={styles.claimedStatus}>
                            Name: {activeRequest.claimedBy.firstName || ""} {activeRequest.claimedBy.lastName || ""}
                          </Text>
                        ) : null}
                        <Text style={styles.claimedStatus}>
                          Phone: {activeRequest.claimedBy.phoneNum || "N/A"}
                        </Text>
                        <Text style={styles.claimedStatus}>
                          Business: {activeRequest.claimedBy.business || "N/A"}
                        </Text>
                      </>
                    )}
                </>
              )}

              {activeRequest.status === "done" && (
                <Text style={styles.completedStatus}>Completed</Text>
              )}

              {activeRequest.status === "cancelled" && (
                <Text style={styles.cancelledStatus}>Cancelled</Text>
              )}
            </View>
              {(activeRequest.status === "pending" || activeRequest.status === "claimed") && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={async () => {
                    try {
                      const requestRef = doc(db, "breakdown_requests", activeRequest.id);
                      await updateDoc(requestRef, { status: "cancelled" });

                      setActiveRequest({ ...activeRequest, status: "cancelled" });
                      useBreakdownStore.getState().updateRequestStatus(activeRequest.id, "cancelled");

                      setModalStep("form");
                    } catch (error) {
                      console.error("Error cancelling request:", error);
                      Alert.alert("Error", "Failed to cancel request. Please try again.");
                    }
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel Request</Text>
                </TouchableOpacity>
              )}
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
                  <View style={{ flexDirection: "column" }}>
            {/* 🟡 Pending Requests */}
            <Text style={[styles.sectionTitle, { color: "#FFD700" }]}>
              Pending Requests
            </Text>

            {userTransactions.filter((tx) => tx.status === "pending").length === 0 ? (
              <Text style={styles.noRequestsText}>No pending requests.</Text>
            ) : (
              userTransactions
                .filter((tx) => tx.status === "pending")
                .map((tx) => {
                  const vehicle = vehicles.find((v) => v.id === tx.vehicleId);
                  return (
                    <View key={tx.id} style={styles.transactionItem}>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Status:</Text> {tx.status}
                      </Text>
                      {tx.claimedBy && (
                        <Text>
                          <Text style={{ fontWeight: "700" }}>Claimed By:</Text>{" "}
                          {tx.claimedBy.name || "Mechanic"}
                        </Text>

                      )}
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Vehicle:</Text>{" "}
                        {vehicle
                          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                          : "Unknown"}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Reason:</Text>{" "}
                        {tx.reason || "Unknown"}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Address:</Text> {tx.address}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Date:</Text>{" "}
                        {tx.timestamp
                          ? new Date(tx.timestamp.seconds * 1000).toLocaleString()
                          : "Unknown"}
                      </Text>
                    </View>
                  );
                })
            )}

            {/* 🔴 Cancelled Requests */}
            <Text style={[styles.sectionTitle, { color: "#E53935" }]}>
              Cancelled Requests
            </Text>

            {userTransactions.filter((tx) => tx.status === "cancelled").length === 0 ? (
              <Text style={styles.noRequestsText}>No cancelled requests.</Text>
            ) : (
              userTransactions
                .filter((tx) => tx.status === "cancelled")
                .map((tx) => {
                  const vehicle = vehicles.find((v) => v.id === tx.vehicleId);
                  return (
                    <View key={tx.id} style={styles.transactionItem}>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Status:</Text> {tx.status}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Vehicle:</Text>{" "}
                        {vehicle
                          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                          : "Unknown"}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Reason:</Text> {tx.reason}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Address:</Text> {tx.address}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Date:</Text>{" "}
                        {tx.timestamp
                          ? new Date(tx.timestamp.seconds * 1000).toLocaleString()
                          : "Unknown"}
                      </Text>
                    </View>
                  );
                })
            )}

            {/* 🟢 Completed Requests */}
            <Text style={[styles.sectionTitle, { color: "#4CAF50" }]}>
              Completed Requests
            </Text>

            {userTransactions.filter((tx) => tx.status === "done").length === 0 ? (
              <Text style={styles.noRequestsText}>No completed requests.</Text>
            ) : (
              userTransactions
                .filter((tx) => tx.status === "done")
                .map((tx) => {
                  const vehicle = vehicles.find((v) => v.id === tx.vehicleId);
                  return (
                    <View key={tx.id} style={styles.transactionItem}>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Status:</Text> {tx.status}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Vehicle:</Text>{" "}
                        {vehicle
                          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                          : "Unknown"}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Reason:</Text>{" "}
                        {tx.reason || "Unknown"}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Address:</Text> {tx.address}
                      </Text>
                      <Text>
                        <Text style={{ fontWeight: "700" }}>Date:</Text>{" "}
                        {tx.timestamp
                          ? new Date(tx.timestamp.seconds * 1000).toLocaleString()
                          : "Unknown"}
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
      {/* ✅ Service Completed Modal */}
<Modal
  transparent={true}
  visible={serviceCompletedModalVisible}
  animationType="fade"
  onRequestClose={() => setServiceCompletedModalVisible(false)}
>
  <View style={styles.modalBackground}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>✅ Service Completed</Text>
      <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 15 }}>
        Your mechanic has marked your request as done.
      </Text>

      {latestDoneRequest && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 4 }}>
            Vehicle:
          </Text>
          <Text style={{ marginBottom: 8 }}>
            {(() => {
              const v = vehicles.find(
                (veh) => String(veh.id) === String(latestDoneRequest.vehicleId)
              );
              return v
                ? `${v.year} ${v.make} ${v.model}`
                : `Vehicle #${latestDoneRequest.vehicleId}`;
            })()}
          </Text>

          <Text style={{ fontWeight: "700", marginBottom: 4 }}>Address:</Text>
          <Text style={{ marginBottom: 20 }}>
            {latestDoneRequest.address || "N/A"}
          </Text>
        </>
      )}

      <TouchableOpacity
        style={[styles.callHelpButton, { backgroundColor: "#4CAF50" }]}
        onPress={async () => {
          if (!latestDoneRequest) return;
          try {
            const ref = doc(db, "breakdown_requests", latestDoneRequest.id);
            await updateDoc(ref, { userConfirmed: true });
            setServiceCompletedModalVisible(false);
          } catch (err) {
            console.error("Error confirming completion:", err);
          }
        }}
      >
        <Text style={styles.callHelpButtonText}>Confirm Service Done</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.closeButton, { marginTop: 10 }]}
        onPress={() => setServiceCompletedModalVisible(false)}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: 20,
},

pendingStatus: {
  fontSize: 22,
  fontWeight: '700',
  color: '#FFD700',
  textAlign: 'center',
},

claimedStatus: {
  fontSize: 20,
  fontWeight: '600',
  color: '#007AFF',
  textAlign: 'center',
  marginVertical: 2,
},

completedStatus: {
  fontSize: 20,
  fontWeight: '600',
  color: '#4CAF50',
  textAlign: 'center',
},

cancelledStatus: {
  fontSize: 20,
  fontWeight: '600',
  color: '#E53935',
  textAlign: 'center',
},

  activeRequestContainer: {
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
modalCloseX: {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 10,
  padding: 5,
},

modalCloseXText: {
  fontSize: 22,
  fontWeight: '700',
  color: '#333',
},


});