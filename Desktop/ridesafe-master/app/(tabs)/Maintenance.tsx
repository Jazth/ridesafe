import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  { id: 'oil', name: 'Engine Oil & Filter', suggested: 'Every 6 months or 5,000 miles' },
  { id: 'tires', name: 'Tire Rotation', suggested: 'Every 6 months or 5,000 miles' },
  { id: 'brakes', name: 'Brake Pad Check', suggested: 'Every 12 months or 10,000 miles' },
  { id: 'air', name: 'Air Filter', suggested: 'Every 12 months or 10,000 miles' },
];
const reminderOptions = [
  { label: 'No Reminder', value: 0 },
  { label: 'Remind me in 3 months', value: 3 },
  { label: 'Remind me in 6 months', value: 6 },
  { label: 'Remind me in 9 months', value: 9 },
  { label: 'Remind me in 12 months', value: 12 },
];

const MaintenanceScreen = () => {
  const { vehicles, isLoadingProfile, profileError, fetchUserProfileData, updateVehicleReminders } = useUserProfileStore();
  const { currentUser } = useUserQueryLoginStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [currentVehicleReminders, setCurrentVehicleReminders] = useState<{[itemId: string]: number}>({});
  const [isSavingReminders, setIsSavingReminders] = useState(false);

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
            console.log(`Android notification channel '${channelId}' created.`);
          } else {
            console.log(`Android notification channel '${channelId}' already exists.`);
          }
        } catch (error) {
          console.error(`Failed to set up Android notification channel:`, error);
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

  useEffect(() => {
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    setCurrentVehicleReminders(selectedVehicle?.reminders || {});
  }, [selectedVehicleId, vehicles]); 

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const handleReminderChange = (itemId: string, value: number) => {
    setCurrentVehicleReminders(prev => ({ ...prev, [itemId]: value }));
  };

  const scheduleMaintenanceNotification = async (vehicleName: string, maintenanceItemName: string, reminderMonths: number, vehicleId: string, itemId: string) => {
    const notificationId = `maintenance-${vehicleId}-${itemId}`;
    const channelId = 'maintenance-reminders'; 
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled existing notification for ${notificationId}`);
    } catch (error) {
      console.warn(`Failed to cancel notification ${notificationId}:`, error);
    }
    if (reminderMonths > 0) {
      const triggerDate = new Date();
      triggerDate.setMonth(triggerDate.getMonth() + reminderMonths);
      if (triggerDate <= new Date()) {
        console.warn(`Calculated trigger date is in the past for ${notificationId}. Adjusting trigger date to 1 minute from now.`);
        const now = new Date();
        triggerDate.setTime(now.getTime() + 60 * 1000); 
      }
      const itemDetails = carMaintenanceItems.find(item => item.id === itemId);
      const itemSuggested = itemDetails ? `Suggested: ${itemDetails.suggested}` : '';
      console.log(`Scheduling notification for ${vehicleName} - ${maintenanceItemName} in ${reminderMonths} months (${triggerDate.toISOString()}) with ID: ${notificationId}`);
      try {
        const notificationContent: Notifications.NotificationContentInput = {
          title: `Maintenance Due!`,
          body: `${maintenanceItemName} is due for your ${vehicleName}. ${itemSuggested}`,
          data: {
            screen: 'maintenance',
            vehicleId: vehicleId,
            itemId: itemId,
          },
          sound: 'default', 
          ...(Platform.OS === 'android' && { channelId: channelId }),
        };

        const scheduledId = await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: notificationContent,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        console.log(`Notification scheduled successfully with ID: ${scheduledId}`);

      } catch (error) {
        console.error(`Failed to schedule notification for ${notificationId}:`, error);
        Alert.alert("Notification Error", "Failed to schedule a reminder notification. Please check permissions.");
      }
    } else {
      console.log(`Reminder set to 'No Reminder' for ${vehicleId}-${itemId}. Any existing notification was cancelled.`);
    }
  };

  const handleSaveReminders = async () => {
    if (!selectedVehicle || !currentUser?.id) {
      Alert.alert("Error", "No vehicle selected or user not logged in.");
      return;
    }

    setIsSavingReminders(true);

    try {
      await updateVehicleReminders(currentUser.id, selectedVehicle.id, currentVehicleReminders);

      const vehicleName = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`;

      for (const itemId of Object.keys(currentVehicleReminders)) {
        const reminderMonths = currentVehicleReminders[itemId];
        const maintenanceItem = carMaintenanceItems.find(item => item.id === itemId);

        if (maintenanceItem) {
          await scheduleMaintenanceNotification(
            vehicleName,
            maintenanceItem.name,
            reminderMonths,
            selectedVehicle.id,
            itemId
          );
        } else {
          console.warn(`Maintenance item details not found for ID: ${itemId}. Cannot schedule notification.`);
          try {
            await Notifications.cancelScheduledNotificationAsync(`maintenance-${selectedVehicle.id}-${itemId}`);
          } catch (e) { }
        }
      }

      Alert.alert("Success", "Saved!");

    } catch (error) {
      console.error("Error saving reminders or scheduling notifications:", error);
      Alert.alert("Save Error", `Failed to save reminders or schedule notifications. Details: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSavingReminders(false);
    }
  };

  const scheduleTestNotification = async () => {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device settings to send test notifications.'
      );
      return;
    }

    const testNotificationId = 'maintenance-test-notification';
    const channelId = 'maintenance-reminders';

    try {
      await Notifications.cancelScheduledNotificationAsync(testNotificationId);
      console.log('Cancelled previous test notification');
    } catch (e) { }

    console.log('Scheduling test notification...');

    try {
      const testNotificationContent: Notifications.NotificationContentInput = {
        title: "nag alarm",
        body: ' 10-second testing lang .',
        data: { data: 'test data', screen: 'maintenance-test' },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: channelId }),
      };

      await Notifications.scheduleNotificationAsync({
        identifier: testNotificationId,
        content: testNotificationContent,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          repeats: false,
        },
      });

    } catch (error) {
      console.error(`Failed to schedule test notification:`, error);
      Alert.alert("Test Notification Error", `Failed to schedule test notification. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (isLoadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{marginTop: 10}}>Loading vehicles...</Text>
      </View>
    );
  }

  if (profileError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ textAlign: 'center', color: 'red' }}>
          Error loading vehicles: {profileError}
        </Text>
      </View>
    );
  }

  if (!vehicles.length && !isLoadingProfile && !profileError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ textAlign: 'center' }}>
            Let's start by adding vehicles in your profile!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const maintenanceLog = () => {
    if (selectedVehicleId) {
      router.push({
        pathname: '../maintenance_log',
        params: { vehicleId: selectedVehicleId },
      });
    }
  };
console.log('🛠 Debug Info:');
console.log('Selected Vehicle ID:', selectedVehicleId);
console.log('Available vehicle IDs:', vehicles.map(v => v.id));
console.log('Selected Vehicle Exists:', vehicles.some(v => v.id === selectedVehicleId));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Vehicle Maintenance</Text>
        <TouchableOpacity onPress={maintenanceLog} style={[ { marginLeft: 'auto' }]}>
          <Ionicons name="folder-open-sharp" size={28} color="#FF5722" />
          
        </TouchableOpacity>
      </View>
      {vehicles.length > 0 && (
        <>
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
              {carMaintenanceItems.length > 0 ? (
                carMaintenanceItems.map(item => (
                  <View key={item.id} style={styles.maintenanceItem}>
                    <Text style={styles.maintenanceItemName}>{item.name}</Text>
                    <Text style={styles.maintenanceItemSuggested}>Suggested: {item.suggested}</Text>
                    
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
                      
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noMaintenanceText}>No maintenance data available for cars.</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveReminders}
              disabled={isSavingReminders || !selectedVehicleId}
            >
              {isSavingReminders ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Reminders</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#1E88E5', marginTop: 10 }]}
              onPress={scheduleTestNotification}
              disabled={isSavingReminders}
              
            >
              <Text style={styles.saveButtonText}>Schedule 10s Test Notification</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
            

          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerText: {
    fontSize: 28,
    color: '#FF5722',
    fontWeight: 'bold',
  },
  vehicleSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  vehicleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    
  },
  picker: {
    height: 53,
    width: '100%',
    color: 'black',

  },
  pickerItem: {
    fontSize: 16,

  },
  blackLine: {
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  maintenanceListContainer: {

  },
  maintenanceItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  maintenanceItemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  maintenanceItemSuggested: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
  reminderPickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginTop: 10,
    paddingVertical: 2,
  },
  reminderPicker: {
    height: 50,
    width: '100%',
    paddingVertical: 5,
    color: 'black'
  },
  noMaintenanceText: {
    textAlign: 'center',
    marginTop: 20,
    color: 'gray',
  },
  saveButton: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MaintenanceScreen;
