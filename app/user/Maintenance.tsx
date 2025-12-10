import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/scripts/firebaseConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const carMaintenanceItems = [
  { id: 'oil', name: 'Engine Oil & Filter', suggested: 'Every 6 months or 5000 km' },
  { id: 'tires', name: 'Tire Rotation', suggested: 'Every 6 months or 5000 km' },
  { id: 'brakes', name: 'Brake Pad Check', suggested: 'Every 12 months or 10000 km' },
  { id: 'air', name: 'Air Filter', suggested: 'Every 12 months or 10000 km' },
];

const reminderOptions = [
  { label: 'No Reminder', value: 0 },
  { label: 'Remind me in 3 months', value: 3 },
  { label: 'Remind me in 6 months', value: 6 },
  { label: 'Remind me in 9 months', value: 9 },
  { label: 'Remind me in 12 months', value: 12 },
  { label: 'Custom Reminder…', value: -1 },
];

const MaintenanceScreen = () => {
  const { vehicles, isLoadingProfile, profileError, fetchUserProfileData, updateVehicleReminders } = useUserProfileStore();
  const { currentUser } = useUserQueryLoginStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [currentVehicleReminders, setCurrentVehicleReminders] = useState<{ [itemId: string]: number }>({});
  const [isSavingReminders, setIsSavingReminders] = useState(false);
  const [customReminderValues, setCustomReminderValues] = useState<{ [itemId: string]: number }>({});
  const [currentOdometer, setCurrentOdometer] = useState<number>(0);
  const [notifiedKmItems, setNotifiedKmItems] = useState<{ [itemId: string]: boolean }>({});

  // Request notifications permission
  useEffect(() => {
    const setupNotifications = async () => {
      const { granted } = await Notifications.requestPermissionsAsync();

      if (Platform.OS === 'android') {
        const channelId = 'maintenance-reminders';
        try {
          const channels = await Notifications.getNotificationChannelsAsync();
          const channelExists = channels.some(c => c.id === channelId);
          if (!channelExists) {
            await Notifications.setNotificationChannelAsync(channelId, {
              name: 'Maintenance Reminders',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF231F7C',
              sound: 'default',
            });
          }
        } catch (error) {
          console.error('Failed to set up Android notification channel:', error);
        }
      }

      if (!granted) {
        Alert.alert(
          'Permissions Required',
          'Please enable notifications in your device settings to receive maintenance reminders.'
        );
      }
    };
    setupNotifications();
  }, []);

  // Fetch user profile
  useEffect(() => {
    if (currentUser?.id) fetchUserProfileData(currentUser.id);
    else useUserProfileStore.getState().clearProfileState();
  }, [currentUser?.id, fetchUserProfileData]);

  // Set default selected vehicle
  useEffect(() => {
    if (vehicles.length > 0 && selectedVehicleId === null) setSelectedVehicleId(vehicles[0].id);
    else if (vehicles.length === 0) setSelectedVehicleId(null);
  }, [vehicles, selectedVehicleId]);

  // Update reminders for selected vehicle
  useEffect(() => {
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    setCurrentVehicleReminders(selectedVehicle?.reminders || {});
  }, [selectedVehicleId, vehicles]);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const handleReminderChange = (itemId: string, value: number) => {
    setCurrentVehicleReminders(prev => ({ ...prev, [itemId]: value }));
  };

  const parseSuggestedKm = (suggested: string): number => {
    const match = suggested.match(/(\d+)\s?km/i);
    return match ? parseInt(match[1]) : 0;
  };

  // Fetch odometer
  useEffect(() => {
    const fetchOdometer = async () => {
      if (!selectedVehicleId || !currentUser?.id) return;

      try {
        const tripsQ = query(collection(db, 'trips'), where('vehicleId', '==', selectedVehicleId));
        const snapTrips = await getDocs(tripsQ);
        const totalDistance = snapTrips.docs.reduce((acc, d) => acc + (Number(d.data().distance) || 0), 0);
        setCurrentOdometer(totalDistance);
      } catch (e) {
        console.error('Error fetching vehicle odometer:', e);
        setCurrentOdometer(selectedVehicle?.odometer ?? 0);
      }
    };

    fetchOdometer();
  }, [selectedVehicleId, currentUser?.id, selectedVehicle?.odometer]);

  // Schedule notification for time-based reminder
  const scheduleMaintenanceNotification = async (vehicleName: string, maintenanceItemName: string, reminderMonths: number, vehicleId: string, itemId: string) => {
    const notificationId = `maintenance-${vehicleId}-${itemId}`;
    const channelId = 'maintenance-reminders';
    try { await Notifications.cancelScheduledNotificationAsync(notificationId); } catch (e) {}
    if (reminderMonths > 0) {
      const triggerDate = new Date();
      triggerDate.setMonth(triggerDate.getMonth() + reminderMonths);
      if (triggerDate <= new Date()) triggerDate.setTime(Date.now() + 60 * 1000);

      const itemDetails = carMaintenanceItems.find(item => item.id === itemId);
      const itemSuggested = itemDetails ? `Suggested: ${itemDetails.suggested}` : '';

      try {
        await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: {
            title: `Maintenance Due!`,
            body: `${maintenanceItemName} is due for your ${vehicleName}. ${itemSuggested}`,
            data: { screen: 'maintenance', vehicleId, itemId },
            sound: 'default',
            ...(Platform.OS === 'android' && { channelId }),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        });
      } catch (error) {
        console.error(`Failed to schedule notification for ${notificationId}:`, error);
      }
    }
  };

  // Notify if current km reaches next due km
  useEffect(() => {
    if (!selectedVehicle) return;

    carMaintenanceItems.forEach(item => {
      const suggestedKm = parseSuggestedKm(item.suggested);
      const lastOdometer = selectedVehicle.odometer || 0;
      const nextDueKm = lastOdometer + suggestedKm;

      if (currentOdometer >= nextDueKm && !notifiedKmItems[item.id]) {
        const vehicleName = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`;
        Notifications.scheduleNotificationAsync({
          content: {
            title: `Maintenance Due!`,
            body: `${item.name} is due at ${nextDueKm} km for your ${vehicleName}`,
            sound: 'default',
          },
          trigger: null,
        });
        setNotifiedKmItems(prev => ({ ...prev, [item.id]: true }));
      }
    });
  }, [currentOdometer, selectedVehicle, notifiedKmItems]);

  const handleSaveReminders = async () => {
    if (!selectedVehicle || !currentUser?.id) {
      Alert.alert('Error', 'No vehicle selected or user not logged in.');
      return;
    }
    setIsSavingReminders(true);
    try {
      const mergedReminders = { ...currentVehicleReminders };
      Object.keys(customReminderValues).forEach(itemId => {
        if (mergedReminders[itemId] === -1) mergedReminders[itemId] = customReminderValues[itemId];
      });
      await updateVehicleReminders(currentUser.id, selectedVehicle.id, mergedReminders);

      const vehicleName = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`;
      for (const itemId of Object.keys(mergedReminders)) {
        const reminderMonths = mergedReminders[itemId];
        const maintenanceItem = carMaintenanceItems.find(item => item.id === itemId);
        if (maintenanceItem) await scheduleMaintenanceNotification(vehicleName, maintenanceItem.name, reminderMonths, selectedVehicle.id, itemId);
      }
      Alert.alert('Success', 'Saved!');
    } catch (error) {
      console.error('Error saving reminders:', error);
      Alert.alert('Save Error', `Failed to save reminders. Details: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSavingReminders(false);
    }
  };

  const viewtracker = () => {
    if (!selectedVehicleId) { Alert.alert('Select a vehicle first'); return; }
    router.push({ pathname: '../trackerMaintenance', params: { vehicleId: String(selectedVehicleId) } });
  };

  const maintenanceLog = () => {
    if (selectedVehicleId) router.push({ pathname: '../maintenance_log', params: { vehicleId: selectedVehicleId } });
  };

  if (isLoadingProfile) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="black" />
      <Text style={{ marginTop: 10 }}>Loading vehicles...</Text>
    </View>
  );

  if (profileError) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ textAlign: 'center', color: 'red' }}>Error loading vehicles: {profileError}</Text>
    </View>
  );

  if (!vehicles.length) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ textAlign: 'center' }}>Let's start by adding vehicles in your profile!</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Vehicle Maintenance</Text>
        <TouchableOpacity onPress={maintenanceLog} style={{ marginLeft: 'auto' }}>
          <Ionicons name="folder-open-sharp" size={28} color="#FF5722" />
        </TouchableOpacity>
      </View>

      <View style={styles.vehicleSelectContainer}>
        <Text style={styles.vehicleLabel}>Vehicle</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedVehicleId}
            onValueChange={(itemValue: string | null) => setSelectedVehicleId(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
            enabled={!isSavingReminders}
          >
            {vehicles.map(vehicle => (
              <Picker.Item key={vehicle.id} label={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} value={vehicle.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.blackLine} />

      <ScrollView style={styles.scrollView}>
        <View style={styles.maintenanceListContainer}>
          {carMaintenanceItems.map(item => {
            const suggestedKm = parseSuggestedKm(item.suggested);
            const nextDueKm = (selectedVehicle?.odometer || 0) + suggestedKm;

            return (
              <View key={item.id} style={styles.maintenanceItem}>
                <Text style={styles.maintenanceItemName}>{item.name}</Text>

                <View style={styles.kmInfoRow}>
                  <Text style={styles.kmInfoText}>Current Odometer: {currentOdometer.toFixed(2)} km</Text>
                  <Text style={styles.kmInfoText}>Next Due: {nextDueKm.toFixed(2)} km</Text>
                </View>

                <View style={styles.reminderPickerContainer}>
                  <Picker
                    selectedValue={currentVehicleReminders?.[item.id] ?? 0}
                    onValueChange={(itemValue: number) => handleReminderChange(item.id, itemValue)}
                    style={styles.reminderPicker}
                    itemStyle={styles.pickerItem}
                    enabled={!isSavingReminders}
                  >
                    {reminderOptions.map(option => (
                      <Picker.Item key={option.value} label={option.label} value={option.value} />
                    ))}
                  </Picker>

                  {currentVehicleReminders?.[item.id] === -1 && (
                    <View style={styles.customReminderInputContainer}>
                      <Text style={styles.customReminderLabel}>Enter custom reminder (in months):</Text>
                      <View style={styles.customInputRow}>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="e.g. 2"
                          style={styles.customInput}
                          onChangeText={text => {
                            const months = parseInt(text) || 0;
                            setCustomReminderValues(prev => ({ ...prev, [item.id]: months }));
                          }}
                          value={String(customReminderValues[item.id] ?? '')}
                        />
                        <Text style={{ marginLeft: 5 }}>months</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveReminders} disabled={isSavingReminders || !selectedVehicleId}>
          {isSavingReminders ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save Reminders</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#1E88E5', marginTop: 10 }]} onPress={viewtracker} disabled={isSavingReminders}>
          <Text style={styles.saveButtonText}>Track Vehicle</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 20, alignItems: 'center', flexDirection: 'row' },
  headerText: { fontSize: 28, color: '#FF5722', fontWeight: 'bold' },
  vehicleSelectContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  vehicleLabel: { fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  pickerContainer: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 5 },
  picker: { height: 53, width: '100%', color: 'black' },
  pickerItem: { fontSize: 16 },
  blackLine: { borderBottomColor: 'black', borderBottomWidth: 1, marginHorizontal: 20, marginBottom: 10 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  maintenanceListContainer: {},
  maintenanceItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  maintenanceItemName: { fontSize: 16, fontWeight: 'bold' },
  kmInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 },
  kmInfoText: { fontSize: 13, color: 'gray' },
  reminderPickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginTop: 10, paddingVertical: 2 },
  reminderPicker: { height: 50, width: '100%', paddingVertical: 5, color: 'black' },
  noMaintenanceText: { textAlign: 'center', marginTop: 20, color: 'gray' },
  saveButton: { backgroundColor: '#FF5722', padding: 15, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  customReminderInputContainer: { marginTop: 10, backgroundColor: '#F8F9FA', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#ccc' },
  customReminderLabel: { fontSize: 14, color: '#333', marginBottom: 5 },
  customInputRow: { flexDirection: 'row', alignItems: 'center' },
  customInput: { borderWidth: 1, borderColor: '#aaa', borderRadius: 5, padding: 6, width: 80, textAlign: 'center', color: '#000' },
});

export default MaintenanceScreen;
