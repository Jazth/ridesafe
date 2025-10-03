import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { db } from '@/scripts/firebaseConfig';
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useUserQueryLoginStore } from '@/constants/store';

const THEME_COLOR = '#FF5722';

const AddMaintenanceLogScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const { vehicleId } = params;

  const { currentUser } = useUserQueryLoginStore();

  const [serviceDate, setServiceDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [serviceType, setServiceType] = useState('');
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('[AddMaintenanceLogScreen] Received params:', JSON.stringify(params));
    console.log('[AddMaintenanceLogScreen] Extracted vehicleId:', vehicleId);
    if (!vehicleId) {
        console.warn('[AddMaintenanceLogScreen] vehicleId is missing or undefined immediately after param extraction.');
    }
  }, [params, vehicleId, router]);


  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || serviceDate;
    if (Platform.OS !== 'ios') {
        setShowDatePicker(false);
    }
    setServiceDate(currentDate);
  };

  const handleSaveLogEntry = async () => {
    console.log('[AddMaintenanceLogScreen] handleSaveLogEntry called. Current vehicleId:', vehicleId);

    if (!currentUser?.id) {
      Alert.alert("Error", "User not logged in.");
      return;
    }
    if (!vehicleId) {
      Alert.alert("Error", "Vehicle ID is missing. Cannot save log.");
      console.error('[AddMaintenanceLogScreen] Save attempt failed: vehicleId is missing.');
      return;
    }
    if (!serviceType.trim()) {
      Alert.alert("Validation Error", "Service type cannot be empty.");
      return;
    }
    const odometerNum = Number(odometer.trim());
    if (!odometer.trim() || isNaN(odometerNum) || odometerNum < 0) {
      Alert.alert("Validation Error", "Please enter a valid odometer reading (non-negative number).");
      return;
    }
    const costNum = cost.trim() ? Number(cost.trim()) : null;
    if (cost.trim() && (isNaN(costNum as any) || (costNum !== null && costNum < 0))) {
      Alert.alert("Validation Error", "Please enter a valid cost (non-negative number) or leave it empty.");
      return;
    }

    setIsSaving(true);

    try {
      // Corrected path: users/{userId}/vehicles/{vehicleId}/maintenance_log
      // The last argument to collection() should be the subcollection name.
      // addDoc will then generate a unique ID for the new log entry document within this subcollection.
      const logCollectionRef = collection(db, 'users', currentUser.id, 'vehicles', vehicleId, 'maintenance_log');
      
      const logEntryData = {
        // userId and vehicleId are implicitly part of the path,
        // but you might store them in the document too if needed for broader queries later.
        // For this specific structure, they are not strictly needed IN the document itself
        // if you always query via the nested path.
        serviceDate: Timestamp.fromDate(serviceDate),
        serviceType: serviceType.trim(),
        odometer: odometerNum,
        cost: costNum,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(logCollectionRef, logEntryData);

      Alert.alert("Success", "Maintenance log entry saved successfully!");
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback if cannot go back (e.g., deep link) - navigate to a default screen
        // Adjust this path if your maintenance log viewing screen is different
        router.replace({ pathname: '/maintenance_log', params: { vehicleId: vehicleId } });
      }

    } catch (error) {
      console.error("Error saving maintenance log:", error);
      Alert.alert("Save Error", "Failed to save maintenance log entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back-outline" size={28} color={THEME_COLOR} />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Add Maintenance Log</Text>
      <View style={{width: 28}} /> 
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateDisplay}>
              <Text style={styles.dateDisplayText}>{serviceDate.toLocaleDateString()}</Text>
              <Ionicons name="calendar-outline" size={24} color={THEME_COLOR} />
            </TouchableOpacity>
            {showDatePicker && (
              <View>
                <DateTimePicker
                  testID="dateTimePicker"
                  value={serviceDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
                {Platform.OS === 'ios' && (
                     <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosPickerDoneButton}>
                        <Text style={styles.iosPickerDoneText}>Done</Text>
                     </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Type / Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Oil Change, Tire Rotation"
              value={serviceType}
              onChangeText={setServiceType}
              editable={!isSaving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Odometer (miles)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 75000"
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="numeric"
              editable={!isSaving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Cost (USD, optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 49.99"
              value={cost}
              onChangeText={setCost}
              keyboardType="numeric"
              editable={!isSaving}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Used synthetic oil, checked tire pressure."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              editable={!isSaving}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveLogEntry}
            disabled={isSaving || !vehicleId || !currentUser?.id}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Log Entry</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateDisplayText: {
    fontSize: 16,
    color: '#333333',
  },
  iosPickerDoneButton: {
    alignItems: 'flex-end',
    paddingVertical: 10,
    paddingRight: 5,
  },
  iosPickerDoneText: {
    color: THEME_COLOR,
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#FFAB91',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default AddMaintenanceLogScreen;
