import type { BreakdownRequest } from '@/constants/callForHelp';
import { useBreakdownStore } from '@/constants/callForHelp';
import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { db } from '@/scripts/firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { GoogleMaps } from "expo-maps";
import { GoogleMapsMapType } from 'expo-maps/build/google/GoogleMaps.types';
import { addDoc, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
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

      // Notify the user if the request is marked done
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


    // ✅ FIXED: Real-time listener for the most recent active request
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

      const claimRequest = async (requestId: string, mechanic: { id: string; name: string; phoneNum?: string; business?: string }) => {
  try {
    const requestRef = doc(db, "breakdown_requests", requestId);
    await updateDoc(requestRef, {
      status: "claimed",
      claimedBy: {
        id: mechanic.id,
        name: mechanic.name,
        phoneNum: mechanic.phoneNum || "N/A",
        business: mechanic.business || "N/A",
      },
    });
    console.log(`Request ${requestId} claimed by ${mechanic.name}`);
  } catch (error) {
    console.error("Error claiming request:", error);
    Alert.alert("Error", "Failed to claim request. Please try again.");
  }
};

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
            initialRegion && userLocation
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
    Alert.alert(
      "Missing information",
      "Please select a vehicle and ensure location is active."
    );
    return;
  }

  // ✅ Only block if there is an ongoing request (pending or claimed)
  if (activeRequest && ["pending", "claimed"].includes(activeRequest.status)) {
    Alert.alert(
      "Request Already Active",
      "You already have an ongoing request. Please cancel or wait until it's resolved before sending another."
    );
    return;
  }

  const { userInfo } = useUserProfileStore.getState();
  const userName =
    userInfo?.fullName ||
    `${userInfo?.firstName ?? ""} ${userInfo?.lastName ?? ""}`.trim() ||
    "Unknown User";
  const phoneNum = userInfo?.phoneNum || "N/A";

  const request = {
    id: Date.now().toString(),
    userId: currentUser.id,
    userName,
    phoneNum,
    location: userLocation,
    address: address ?? "Unknown",
    vehicleId: selectedVehicleId,
    reason: reasonValue,
    timestamp: Date.now(),
    status: "pending",
    claimedBy: null,
  };

  try {
    const docRef = await addDoc(collection(db, "breakdown_requests"), {
      userId: request.userId,
      userName: request.userName,
      phoneNum: request.phoneNum,
      location: request.location,
      address: request.address,
      vehicleId: request.vehicleId,
      reason: request.reason,
      status: request.status,
      claimedBy: request.claimedBy,
      timestamp: serverTimestamp(),
    });

    const savedRequest: BreakdownRequest = {
      ...request,
      id: docRef.id,
      status: request.status as "pending" | "cancelled" | "claimed" | "approved" | "done",
    };

    useBreakdownStore.getState().addRequest(savedRequest);
    setActiveRequest(savedRequest);
    setModalStep("active");
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
 
    {/* Status Section */}
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
          {/* Split full name into first and last if available */}
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
      {/* Cancel Button */}
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
