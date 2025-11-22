// trackerMaintenance.tsx
import { useUserQueryLoginStore } from "@/constants/store";
import { useUserProfileStore } from "@/constants/userProfileStore";
import { db } from "@/scripts/firebaseConfig";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

type Car = {
  id: string;
  make?: string;
  model?: string;
  year?: string | number;
  reminders?: Record<string, number>;
  transmission?: string;
  odometer?: number;
  totalDistance?: number;
};

export default function TrackerMaintenance() {
  const router = useRouter();
  const { currentUser } = useUserQueryLoginStore();
  const { vehicles, fetchUserProfileData, isLoadingProfile, profileError } = useUserProfileStore();
  const USER_ID = currentUser?.id ?? null;

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleConfirmed, setVehicleConfirmed] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);

  const [totalVehicleDistance, setTotalVehicleDistance] = useState<number>(0);

  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);

  const [distance, setDistance] = useState<number>(0);
  const [locations, setLocations] = useState<Location.LocationObject[]>([]);
  const [startLocation, setStartLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [endLocation, setEndLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const hasAnimatedToUser = useRef(false);

  useEffect(() => {
    if (!USER_ID) return;
    fetchUserProfileData(USER_ID);
  }, [USER_ID, fetchUserProfileData]);

  useEffect(() => {
    const found = vehicles.find((v) => v.id === selectedVehicleId) || null;
    setSelectedCar(found);
    if (found && USER_ID) fetchVehicleTotals(found.id);
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    let mounted = true;
    const getInitialLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        if (!mounted) return;
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (e) {
        console.warn("Failed to get initial location:", e);
      }
    };
    getInitialLocation();
    return () => { mounted = false; };
  }, [USER_ID]);

  useEffect(() => {
    if (userLocation && mapRef.current && !hasAnimatedToUser.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      }, 800);
      hasAnimatedToUser.current = true;
    }
  }, [userLocation]);

  const fetchVehicleTotals = async (vehicleId: string) => {
    if (!USER_ID || !vehicleId) return;
    try {
      const vehicleRef = doc(db, "users", USER_ID, "vehicles", vehicleId);
      const snap = await getDoc(vehicleRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        const vehicleTotal = typeof data.totalDistance === "number"
          ? data.totalDistance
          : (typeof data.odometer === "number" ? data.odometer : undefined);
        if (typeof vehicleTotal === "number") {
          setTotalVehicleDistance(vehicleTotal);
          return;
        }
      }
      const tripsQ = query(collection(db, "trips"), where("vehicleId", "==", vehicleId));
      const snapTrips = await getDocs(tripsQ);
      const total = snapTrips.docs.reduce((acc, d) => acc + (Number(d.data().distance) || 0), 0);
      setTotalVehicleDistance(total);
    } catch (e) {
      console.error("fetchVehicleTotals error", e);
    }
  };

  const getDistanceBetween = (loc1: Location.LocationObject, loc2: Location.LocationObject) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(loc2.coords.latitude - loc1.coords.latitude);
    const dLon = toRad(loc2.coords.longitude - loc1.coords.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(loc1.coords.latitude)) *
      Math.cos(toRad(loc2.coords.latitude)) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startTracking = async () => {
    if (!selectedCar) {
      Alert.alert("No vehicle selected", "Please select a vehicle first.");
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert("Permission denied", "Location permission is required to track.");
      }

      setDistance(0);
      setLocations([]);
      setStartLocation(null);
      setEndLocation(null);
      setTracking(true);
      setPaused(false);

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 1 },
        (loc) => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

          setLocations(prev => {
            const updated = [...prev, loc];
            if (prev.length === 0) setStartLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            else {
              const last = prev[prev.length - 1];
              const inc = getDistanceBetween(last, loc);
              if (inc > 0) setDistance(d => d + inc);
            }
            if (mapRef.current && updated.length > 0) {
              mapRef.current.fitToCoordinates(updated.map(l => ({ latitude: l.coords.latitude, longitude: l.coords.longitude })), {
                edgePadding: { top: 120, right: 40, bottom: 180, left: 40 },
                animated: true,
              });
            }
            return updated;
          });
        }
      );
    } catch (e) {
      console.error("startTracking error", e);
      Alert.alert("Error", "Failed to start tracking.");
    }
  };

  const pauseTracking = () => {
    if (!tracking) return;
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setTracking(false);
    setPaused(true);
  };

  const resumeTracking = async () => {
    if (!selectedCar) {
      Alert.alert("No vehicle selected", "Please select a vehicle first.");
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission denied", "Location permission is required to track.");
      setTracking(true);
      setPaused(false);

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 1 },
        (loc) => {
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          setLocations(prev => {
            const updated = [...prev, loc];
            if (prev.length === 0) setStartLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            else {
              const last = prev[prev.length - 1];
              const inc = getDistanceBetween(last, loc);
              if (inc > 0) setDistance(d => d + inc);
            }
            if (mapRef.current && updated.length > 0) {
              mapRef.current.fitToCoordinates(updated.map(l => ({ latitude: l.coords.latitude, longitude: l.coords.longitude })), {
                edgePadding: { top: 120, right: 40, bottom: 180, left: 40 },
                animated: true,
              });
            }
            return updated;
          });
        }
      );
    } catch (e) {
      console.error("resumeTracking error", e);
      Alert.alert("Error", "Failed to resume tracking.");
    }
  };

  const exitWithoutSaving = () => {
    Alert.alert("Exit without saving?", "This will discard the current trip data. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, exit",
        style: "destructive",
        onPress: () => {
          locationSubscription.current?.remove();
          locationSubscription.current = null;
          setTracking(false);
          setPaused(false);
          setDistance(0);
          setLocations([]);
          setStartLocation(null);
          setEndLocation(null);
          router.replace("/user/Maintenance");
        },
      },
    ]);
  };

  const stopTracking = async () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setTracking(false);
    setPaused(false);

    const last = locations[locations.length - 1];
    if (last) setEndLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });

    if (!selectedCar || !USER_ID) {
      setLocations([]);
      setDistance(0);
      return;
    }

    const tripDistance = Number(distance || 0);
    const vehicleRef = doc(db, "users", USER_ID, "vehicles", selectedCar.id);

    try {
      const vehicleSnap = await getDoc(vehicleRef);
      const vehicleData = vehicleSnap.exists() ? (vehicleSnap.data() as any) : {};
      const prevOdometer = typeof vehicleData.odometer === "number" ? vehicleData.odometer : 0;
      const prevTotal = typeof vehicleData.totalDistance === "number" ? vehicleData.totalDistance : undefined;

      const newOdometer = prevOdometer + tripDistance;
      const snapshotTotal = typeof prevTotal === "number" ? prevTotal : await computeTripsSum(selectedCar.id);
      const newTotalDistance = snapshotTotal + tripDistance;

      await addDoc(collection(db, "trips"), {
        vehicleId: selectedCar.id,
        userId: USER_ID,
        startLocation: startLocation ?? null,
        endLocation: last ? { latitude: last.coords.latitude, longitude: last.coords.longitude } : null,
        distance: Math.round(tripDistance * 100) / 100,
        path: locations.map(l => ({ latitude: l.coords.latitude, longitude: l.coords.longitude, timestamp: l.timestamp })),
        date: Timestamp.now(),
      });

      await setDoc(vehicleRef, { odometer: newOdometer, totalDistance: newTotalDistance }, { merge: true });

      const monthId = new Date().toISOString().slice(0, 7);
      const monthRef = doc(db, "users", USER_ID, "vehicle_stats", selectedCar.id, "months", monthId);
      const monthSnap = await getDoc(monthRef);
      if (monthSnap.exists()) {
        const prev = (monthSnap.data() as any).totalDistance || 0;
        await setDoc(monthRef, { totalDistance: prev + tripDistance, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        await setDoc(monthRef, { totalDistance: tripDistance, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }

      setDistance(0);
      setLocations([]);
      setStartLocation(null);
      setEndLocation(null);
      setTotalVehicleDistance(newTotalDistance);
      await fetchUserProfileData(USER_ID);

      Alert.alert("Trip saved!", `Distance this trip: ${tripDistance.toFixed(2)} km`);
    } catch (e) {
      console.error("Failed to save trip:", e);
      Alert.alert("Error", "Failed to save trip. Please try again.");
    }
  };

  const computeTripsSum = async (vehicleId: string) => {
    try {
      const q = query(collection(db, "trips"), where("vehicleId", "==", vehicleId));
      const snap = await getDocs(q);
      return snap.docs.reduce((acc, d) => acc + (Number(d.data().distance) || 0), 0);
    } catch (e) {
      console.warn("computeTripsSum error", e);
      return 0;
    }
  };

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={{ marginTop: 8 }}>Loading vehicles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profileError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={{ color: "red" }}>Error loading vehicles: {String(profileError)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>No vehicles found</Text>
          <Text style={{ textAlign: "center", marginBottom: 12 }}>Please add vehicles in your profile before tracking trips.</Text>
          <TouchableOpacity style={styles.confirmButton} onPress={() => router.push("/user/Profile")}>
            <Text style={styles.confirmButtonText}>Open Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicleConfirmed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Select Vehicle to Track</Text>
          {vehicles.map(car => (
            <TouchableOpacity
              key={car.id}
              style={[styles.vehicleButton, selectedVehicleId === car.id && { backgroundColor: "#FF5722", borderColor: "#FF5722" }]}
              onPress={() => { setSelectedVehicleId(car.id); setSelectedCar(car); fetchVehicleTotals(car.id); }}
            >
              <Text style={[styles.vehicleButtonText, selectedVehicleId === car.id && { color: "#fff", fontWeight: "700" }]}>
                {car.year ?? ""} {car.make ?? ""} {car.model ?? ""}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.confirmButton} onPress={() => {
            if (!selectedVehicleId) return Alert.alert("Please select a vehicle first");
            setVehicleConfirmed(true);
          }}>
            <Text style={styles.confirmButtonText}>Confirm Vehicle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN TRACKING UI
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Floating Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              Alert.alert(
                "Exit Trip?",
                "Do you want to save your trip before exiting?",
                [
                  { text: "Resume", style: "cancel" },
                  { text: "Discard", style: "destructive", onPress: exitWithoutSaving },
                  { text: "Save & Exit", onPress: stopTracking },
                ],
                { cancelable: true }
              )
            }
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        initialRegion={userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        } : undefined}
      >
        {userLocation && (
          <Marker coordinate={userLocation} title="You">
            <View style={styles.userMarker}>
              <MaterialIcons name="person-pin" size={28} color="#fff" />
            </View>
          </Marker>
        )}
        {endLocation && <Marker coordinate={endLocation} title="End" pinColor="red" />}
        {locations.length > 0 && (
          <Polyline
            coordinates={locations.map((l) => ({ latitude: l.coords.latitude, longitude: l.coords.longitude }))}
            strokeColor="#FF5722"
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Floating Buttons */}
      <View style={styles.floatingControls}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Odometer:</Text>
          <Text style={styles.infoValue}>
            {typeof selectedCar?.odometer === "number" ? selectedCar.odometer.toFixed(2) : "0"} km
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total (history + live):</Text>
          <Text style={styles.infoValue}>{(totalVehicleDistance + distance).toFixed(2)} km</Text>
        </View>

        {!tracking && !paused && (
          <TouchableOpacity style={styles.confirmButton} onPress={startTracking}>
            <Text style={styles.confirmButtonText}>Start Trip</Text>
          </TouchableOpacity>
        )}

        {tracking && (
          <TouchableOpacity style={[styles.confirmButton, styles.warnButton]} onPress={pauseTracking}>
            <Text style={styles.confirmButtonText}>Pause Trip</Text>
          </TouchableOpacity>
        )}

        {!tracking && paused && (
          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <TouchableOpacity style={[styles.confirmButton, { flex: 1, marginRight: 6 }]} onPress={resumeTracking}>
              <Text style={styles.confirmButtonText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { flex: 1, marginLeft: 6 }]}
              onPress={() =>
                Alert.alert("Stop trip?", "Save this trip to vehicle history?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Stop & Save", onPress: stopTracking },
                ])
              }
            >
              <Text style={styles.confirmButtonText}>Stop & Save</Text>
            </TouchableOpacity>
          </View>
        )}

        {!tracking && paused && (
          <TouchableOpacity
            style={[styles.confirmButton, { marginTop: 10, backgroundColor: "#c62828" }]}
            onPress={exitWithoutSaving}
          >
            <Text style={styles.confirmButtonText}>Exit Without Saving</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// styles remain unchanged
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  vehicleButton: { padding: 12, borderWidth: 1, borderColor: "#FF5722", borderRadius: 8, marginBottom: 10, width: "100%" },
  vehicleButtonText: { fontSize: 16, color: "#FF5722", textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8, zIndex: 20, marginTop: 25 },
  headerWrapper: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: "transparent" },
  backBtn: { paddingHorizontal: 2, paddingVertical: 6 },
  backText: { color: "#007AFF", fontSize: 16 },
  userMarker: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1976d2", borderColor: "#fff", borderWidth: 2, justifyContent: "center", alignItems: "center" },
  floatingControls: { position: "absolute", bottom: 20, left: 12, right: 12, backgroundColor: "#fff", padding: 12, borderRadius: 12, elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  infoLabel: { fontSize: 15, color: "#444" },
  infoValue: { fontSize: 16, fontWeight: "700", color: "#111" },
  confirmButton: { backgroundColor: "#FF5722", paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 6 },
  confirmButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  warnButton: { backgroundColor: "#e67e22" },
});
