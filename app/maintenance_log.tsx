import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore, Vehicle } from '@/constants/userProfileStore';
import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export interface MaintenanceLogEntry {
  id: string;
  serviceDate: Timestamp;
  serviceType: string;
  odometer: number;
  cost?: number | null; // Allow cost to be null or undefined
  notes?: string;
  createdAt?: Timestamp;
}

const formatDate = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const LogEntryItem: React.FC<{
  entry: MaintenanceLogEntry;
  onDelete: (logId: string) => void;
}> = React.memo(({ entry, onDelete }) => {

  const handleDelete = () => {
    Alert.alert(
      "Delete Log Entry",
      "Are you sure you want to delete this maintenance record? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(entry.id) }
      ]
    );
  };

  return (
    <View style={styles.logEntryContainer}>
      <View style={styles.logEntryHeader}>
        <Text style={styles.logEntryServiceType}>{entry.serviceType}</Text>
        <Text style={styles.logEntryDate}>{formatDate(entry.serviceDate)}</Text>
      </View>
      <Text style={styles.logEntryDetail}>Odometer: {entry.odometer.toLocaleString()} miles</Text>
      {/* Safely handle cost display */}
      {typeof entry.cost === 'number' ? (
        <Text style={styles.logEntryDetail}>Cost: ${entry.cost.toFixed(2)}</Text>
      ) : entry.cost === null || entry.cost === undefined ? (
        <Text style={styles.logEntryDetail}>Cost: N/A</Text>
      ) : null}
      {entry.notes && entry.notes.trim() !== '' && (
        <Text style={styles.logEntryNotesTitle}>Notes:</Text>
      )}
      {entry.notes && entry.notes.trim() !== '' && (
         <Text style={styles.logEntryNotes}>{entry.notes}</Text>
      )}
      <TouchableOpacity onPress={handleDelete} style={styles.deleteLogButton}>
        <Ionicons name="trash-bin-outline" size={22} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
});


const MaintenanceLogScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const passedVehicleId = params.vehicleId;

  const { currentUser } = useUserQueryLoginStore();
  const { vehicles, isLoadingProfile: isLoadingVehicles, profileError: vehiclesError, fetchUserProfileData } = useUserProfileStore();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(passedVehicleId || null);
  const [logEntries, setLogEntries] = useState<MaintenanceLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log("[MaintenanceLogScreen] Initial passedVehicleId from params:", passedVehicleId);
    if (currentUser?.id && vehicles.length === 0 && !isLoadingVehicles && !vehiclesError) {
      console.log("[MaintenanceLogScreen] Fetching user profile data (vehicles)...");
      fetchUserProfileData(currentUser.id);
    }
  }, [currentUser?.id, fetchUserProfileData]);

  useEffect(() => {
    if (vehicles.length > 0) {
      if (passedVehicleId && vehicles.some(v => v.id === passedVehicleId)) {
        if (selectedVehicleId !== passedVehicleId) {
            console.log("[MaintenanceLogScreen] Setting selectedVehicleId from passed param:", passedVehicleId);
            setSelectedVehicleId(passedVehicleId);
        }
      } else if (!selectedVehicleId && vehicles.length > 0) {
        console.log("[MaintenanceLogScreen] Defaulting to first vehicleId:", vehicles[0].id);
        setSelectedVehicleId(vehicles[0].id);
      }
    } else if (vehicles.length === 0 && selectedVehicleId !== null) {
        setSelectedVehicleId(null);
    }
  }, [passedVehicleId, vehicles, selectedVehicleId]);

  const fetchLogEntries = useCallback(() => {
    if (!currentUser?.id || !selectedVehicleId) {
      setLogEntries([]);
      setIsLoadingLogs(false);
      setRefreshing(false);
      console.log("[MaintenanceLogScreen] Skipping fetchLogEntries: No currentUser or selectedVehicleId is not yet set.", { userId: currentUser?.id, vehicleId: selectedVehicleId });
      return () => {};
    }

    console.log(`[MaintenanceLogScreen] Attempting to fetch logs for vehicleId: ${selectedVehicleId} from path: users/${currentUser.id}/vehicles/${selectedVehicleId}/maintenance_log`);
    setIsLoadingLogs(true);
    setErrorLogs(null);

    // Path should be: users/{userId}/vehicles/{vehicleId}/maintenance_log
    const logCollectionRef = collection(db, 'users', currentUser.id, 'vehicles', selectedVehicleId, 'maintenance_log');
    const q = query(logCollectionRef, orderBy('serviceDate', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries: MaintenanceLogEntry[] = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<MaintenanceLogEntry, 'id'>),
        }));
        setLogEntries(entries);
        console.log(`[MaintenanceLogScreen] Fetched ${entries.length} log entries for vehicle ${selectedVehicleId}`);
        setIsLoadingLogs(false);
        setRefreshing(false);
      },
      (err) => {
        console.error("[MaintenanceLogScreen] Error fetching maintenance log:", err);
        setErrorLogs("Failed to load maintenance log. " + err.message);
        setIsLoadingLogs(false);
        setRefreshing(false);
      }
    );
    return unsubscribe;
  }, [currentUser?.id, selectedVehicleId]);

  useEffect(() => {
    if (selectedVehicleId && currentUser?.id) {
        const unsubscribe = fetchLogEntries();
        return () => unsubscribe();
    } else {
        setLogEntries([]);
    }
  }, [fetchLogEntries, selectedVehicleId, currentUser?.id]);

  const handleDeleteLogEntry = async (logId: string) => {
    if (!currentUser?.id || !selectedVehicleId) {
      Alert.alert("Error", "Cannot delete entry: User or vehicle not identified.");
      return;
    }
    try {
      // Path should be: users/{userId}/vehicles/{vehicleId}/maintenance_log/{logId}
      const logDocRef = doc(db, 'users', currentUser.id, 'vehicles', selectedVehicleId, 'maintenance_log', logId);
      await deleteDoc(logDocRef);
    } catch (error) {
      console.error("Error deleting log entry:", error);
      Alert.alert("Error", "Failed to delete log entry.");
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if(currentUser?.id) fetchUserProfileData(currentUser.id);
    if (selectedVehicleId) {
        fetchLogEntries();
    } else {
        setRefreshing(false);
    }
  }, [currentUser?.id, fetchUserProfileData, selectedVehicleId, fetchLogEntries]);

  const navigateToAddLogEntry = () => {
    if (!selectedVehicleId) {
        Alert.alert("No Vehicle Selected", "Please select a vehicle to add a maintenance log.");
        return;
    }
    console.log(`[MaintenanceLogScreen] Navigating to Add Log Screen with vehicleId: ${selectedVehicleId}`);
    router.push(`/log_add?vehicleId=${selectedVehicleId}`);
  };

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/Maintenance')} style={styles.backButton}>
        <Ionicons name="arrow-back-outline" size={26} color="#333" />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Maintenance Log</Text>
      <View style={{width: 26}} />
    </View>
  );

  if (isLoadingVehicles && vehicles.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        <Text style={styles.messageText}>Loading vehicles...</Text>
      </SafeAreaView>
    );
  }

  if (vehiclesError && vehicles.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <Ionicons name="alert-circle-outline" size={48} color="red" style={{ marginTop: 20 }} />
        <Text style={styles.errorText}>Error loading vehicles: {vehiclesError}</Text>
      </SafeAreaView>
    );
  }

  if (vehicles.length === 0 && !isLoadingVehicles) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <Ionicons name="car-sport-outline" size={60} color="#B0B0B0" style={{marginTop: 30}}/>
        <Text style={styles.emptyStateText}>No vehicles found.</Text>
        <Text style={styles.emptyStateSubText}>Please add a vehicle in your profile settings to track maintenance.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      <View style={styles.vehiclePickerWrapper}>
        <Picker
          selectedValue={selectedVehicleId}
          onValueChange={(itemValue) => {
            console.log("[MaintenanceLogScreen] Picker changed, new vehicleId:", itemValue);
            setSelectedVehicleId(itemValue);
          }}
          style={styles.vehiclePicker}
          itemStyle={styles.pickerItem}
          enabled={!isLoadingLogs && !isLoadingVehicles}
        >
          {vehicles.map((vehicle: Vehicle) => (
            <Picker.Item key={vehicle.id} label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} value={vehicle.id} />
          ))}
        </Picker>
      </View>

      {isLoadingLogs && selectedVehicleId && (
        <View style={styles.centeredActivity}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.messageText}>Loading log entries...</Text>
        </View>
      )}

      {errorLogs && !isLoadingLogs && selectedVehicleId && (
         <View style={styles.centered}>
            <Ionicons name="warning-outline" size={48} color="red" style={{ marginTop: 20 }} />
            <Text style={styles.errorText}>{errorLogs}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
      )}

      {!isLoadingLogs && !errorLogs && selectedVehicleId && (
        <FlatList
          data={logEntries}
          renderItem={({ item }) => <LogEntryItem entry={item} onDelete={handleDeleteLogEntry} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            !isLoadingLogs && !refreshing && logEntries.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="reader-outline" size={60} color="#B0B0B0" />
                <Text style={styles.emptyStateText}>No maintenance logs yet for this vehicle.</Text>
                <Text style={styles.emptyStateSubText}>Tap the '+' button to add your first service record!</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"}/>
          }
        />
      )}
      <TouchableOpacity
        style={[styles.fab, (!selectedVehicleId || isLoadingVehicles || isLoadingLogs) && styles.fabDisabled]}
        onPress={navigateToAddLogEntry}
        disabled={!selectedVehicleId || isLoadingLogs || isLoadingVehicles}
      >
        <Ionicons name="add-outline" size={30} color="white"/>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centeredActivity: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  vehiclePickerWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  vehiclePicker: {
    height: 60,
    width: '100%',
   
  },
  pickerItem: {
    
  },
  listContentContainer: {
    paddingBottom: 80,
    paddingHorizontal: 8,
  },
  logEntryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  logEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logEntryServiceType: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  logEntryDate: {
    fontSize: 13,
    color: '#6C757D',
  },
  logEntryDetail: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  logEntryNotesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 6,
    marginBottom: 2,
  },
  logEntryNotes: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
  deleteLogButton: {
    position: 'absolute',
    top: 70,
    right: 10,
    padding: 5,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 10,
    bottom: 10,
    backgroundColor: '#FF5722',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabDisabled: {
    backgroundColor: '#A0A0A0',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: width * 0.1,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6C757D',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#ADB5BD',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 15,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MaintenanceLogScreen;
