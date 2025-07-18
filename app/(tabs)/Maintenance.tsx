<<<<<<< HEAD
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
    shouldPlaySound: true, 
    shouldSetBadge: false, 
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});
=======
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import the user profile store to access user's vehicles, loading state, and update action
import { useUserProfileStore } from '@/constants/userProfileStore';
// Import the login store to get the current user's ID
import { useUserQueryLoginStore } from '@/constants/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4


// Static list of maintenance items for Cars
const carMaintenanceItems = [
  { id: 'oil', name: 'Engine Oil & Filter', suggested: 'Every 6 months or 5,000 miles' },
  { id: 'tires', name: 'Tire Rotation', suggested: 'Every 6 months or 5,000 miles' },
  { id: 'brakes', name: 'Brake Pad Check', suggested: 'Every 12 months or 10,000 miles' },
  { id: 'air', name: 'Air Filter', suggested: 'Every 12 months or 10,000 miles' },
  // Add more car-specific maintenance items here
];

<<<<<<< HEAD
// Reminder options for maintenance items (values are in months)
const reminderOptions = [
  { label: 'No Reminder', value: 0 }, // Option for no reminder
  { label: 'Remind me in 3 months', value: 3 },
  { label: 'Remind me in 6 months', value: 6 },
  { label: 'Remind me in 9 months', value: 9 },
  { label: 'Remind me in 12 months', value: 12 },
=======
// Reminder options for maintenance items
const reminderOptions = [
    { label: 'Remind me in 3 months', value: 3 },
    { label: 'Remind me in 6 months', value: 6 },
    { label: 'Remind me in 9 months', value: 9 },
    { label: 'Remind me in 12 months', value: 12 },
    { label: 'No Reminder', value: 0 }, // Option for no reminder
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
];


const MaintenanceScreen = () => {
<<<<<<< HEAD
  // Get vehicles, loading state, error, and the update action from the user profile store
  const { vehicles, isLoadingProfile, profileError, fetchUserProfileData, updateVehicleReminders } = useUserProfileStore();
  // Get the current user ID from the login store
  const { currentUser } = useUserQueryLoginStore();

  // State for the selected vehicle ID
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  // Local state to track reminders for the currently selected vehicle BEFORE saving
  const [currentVehicleReminders, setCurrentVehicleReminders] = useState<{[itemId: string]: number}>({});
  // Local loading state specifically for the Save button
  const [isSavingReminders, setIsSavingReminders] = useState(false);

  // --- Notification Permissions and Channel Setup Effect ---
  useEffect(() => {
    const setupNotifications = async () => {
      // Request local notification permissions
      const { granted } = await Notifications.requestPermissionsAsync();

      if (Platform.OS === 'android') {
        // Ensure channel exists on Android
        // Using a unique channel ID ('maintenance-reminders')
        const channelId = 'maintenance-reminders';
         try {
           const channels = await Notifications.getNotificationChannelsAsync();
           const channelExists = channels.some(c => c.id === channelId);

           if (!channelExists) {
              await Notifications.setNotificationChannelAsync(channelId, {
                name: 'Maintenance Reminders',
                importance: Notifications.AndroidImportance.MAX, // Or DEFAULT, HIGH, LOW, MIN
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
                sound: 'default', // You can set a default sound for the channel
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

    // Call the setup function
    setupNotifications();

    // Clean up any notification listeners if you were adding them here
    // (No listeners added in this screen, so cleanup is not strictly needed here)
    // return () => { ... };
  }, []); // Empty dependency array means this runs once on mount
  // ----------------------------------------------------------


  // Effect to fetch user data when the component mounts or currentUser changes
  useEffect(() => {
    // Fetch data only if a user is logged in.
    // The store's isLoadingProfile state prevents multiple fetches.
    if (currentUser?.id) {
      fetchUserProfileData(currentUser.id);
    } else {
      // If user logs out, clear the profile state
      useUserProfileStore.getState().clearProfileState();
    }
    // Dependencies: Only depend on currentUser?.id and the fetch action itself.
    // Removing state variables updated by fetchUserProfileData prevents the loop.
  }, [currentUser?.id, fetchUserProfileData]);


  // Effect to set the default selected vehicle when vehicles are loaded
  useEffect(() => {
    if (vehicles.length > 0 && selectedVehicleId === null) {
      setSelectedVehicleId(vehicles[0].id);
    } else if (vehicles.length === 0) {
      setSelectedVehicleId(null);
    }
  }, [vehicles, selectedVehicleId]);

  // Effect to sync local reminders state when the selected vehicle changes
  useEffect(() => {
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    setCurrentVehicleReminders(selectedVehicle?.reminders || {});
  }, [selectedVehicleId, vehicles]); // Re-run if selectedVehicleId or vehicles array changes


  // Get the currently selected vehicle object
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Handle reminder selection change for a maintenance item (updates local state)
  const handleReminderChange = (itemId: string, value: number) => {
    setCurrentVehicleReminders(prev => ({ ...prev, [itemId]: value }));
    // Note: This only updates local state. Saving and scheduling happens on button click.
  };

  // --- Helper function to schedule a single notification ---
  const scheduleMaintenanceNotification = async (vehicleName: string, maintenanceItemName: string, reminderMonths: number, vehicleId: string, itemId: string) => {
      // Unique identifier for this specific notification instance
      // Using vehicleId and itemId ensures we can cancel the correct notification later
      const notificationId = `maintenance-${vehicleId}-${itemId}`;
      const channelId = 'maintenance-reminders'; // Use the channel ID defined in the setup effect

      // First, cancel any existing notification for this specific item on this vehicle
      // This prevents duplicate reminders if the user changes and saves the reminder multiple times
      try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
          console.log(`Cancelled existing notification for ${notificationId}`);
      } catch (error) {
          // This error might happen if the notification doesn't exist, which is fine.
          console.warn(`Failed to cancel notification ${notificationId}:`, error);
      }

      // If reminderMonths is 0, we only needed to cancel, so we stop here.
      if (reminderMonths > 0) {
          // Calculate the trigger date: current date + reminderMonths
          const triggerDate = new Date();
          triggerDate.setMonth(triggerDate.getMonth() + reminderMonths);
          // Optional: set time to a specific point, e.g., noon (12:00 PM)
          // triggerDate.setHours(12, 0, 0, 0);

          // Ensure the trigger date is in the future. If not, maybe schedule for now + a short delay
          if (triggerDate <= new Date()) {
              console.warn(`Calculated trigger date is in the past for ${notificationId}. Adjusting trigger date to 1 minute from now.`);
              // Schedule for 1 minute from now if the calculated date is in the past
              const now = new Date();
              triggerDate.setTime(now.getTime() + 60 * 1000); // Add 60 seconds
          }


          // Find the maintenance item details for the body
          const itemDetails = carMaintenanceItems.find(item => item.id === itemId);
          const itemSuggested = itemDetails ? `Suggested: ${itemDetails.suggested}` : '';


          console.log(`Scheduling notification for ${vehicleName} - ${maintenanceItemName} in ${reminderMonths} months (${triggerDate.toISOString()}) with ID: ${notificationId}`);

          try {
              // Create the content object, using a type assertion to work around potential
              // type definition issues with channelId in NotificationContentInput
              const notificationContent: Notifications.NotificationContentInput = {
                  title: `Maintenance Due!`,
                  body: `${maintenanceItemName} is due for your ${vehicleName}. ${itemSuggested}`,
                  data: {
                      screen: 'maintenance', // Optional: Data to handle when notification is tapped
                      vehicleId: vehicleId,
                      itemId: itemId,
                      // You could add more data like 'lastServiceDate' if you track that
                  },
                  sound: 'default', // Use default sound or null for no sound
                  // Conditionally add channelId for Android. Using type assertion here
                  // as a workaround for the TypeScript error you're seeing.
                  ...(Platform.OS === 'android' && { channelId: channelId }),
              };


              const scheduledId = await Notifications.scheduleNotificationAsync({
                  identifier: notificationId, // Use the unique ID here
                  content: notificationContent, // Pass the created content object
                  trigger: {
                      type: Notifications.SchedulableTriggerInputTypes.DATE, // <-- FIX: Specify the type for date trigger
                      date: triggerDate, // Use the calculated future Date object
                    
                  },
              });
              console.log(`Notification scheduled successfully with ID: ${scheduledId}`);

          } catch (error) {
              console.error(`Failed to schedule notification for ${notificationId}:`, error);
              Alert.alert("Notification Error", "Failed to schedule a reminder notification. Please check permissions.");
          }
      } else {
          console.log(`Reminder set to 'No Reminder' for ${vehicleId}-${itemId}. Any existing notification was cancelled.`);
          // Cancellation already happened above, so nothing more to do here.
      }
  };
  // ------------------------------------------------------------------


  // Handle the Save Reminders button press
  const handleSaveReminders = async () => {
    if (!selectedVehicle || !currentUser?.id) {
      Alert.alert("Error", "No vehicle selected or user not logged in.");
      return;
    }

    setIsSavingReminders(true); // Start local saving loading state

    try {
      // Call the store action to update reminders for this vehicle (e.g., in Firestore)
      // Pass the current local reminders state
      // Assuming updateVehicleReminders successfully saves the data remotely
      await updateVehicleReminders(currentUser.id, selectedVehicle.id, currentVehicleReminders);

      // --- Notification Scheduling Logic ---
      // After successfully saving, iterate through the *saved* reminder preferences
      // for the selected vehicle and schedule/cancel notifications.
      const vehicleName = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`;

      // Schedule/Cancel notifications for each item based on the saved reminder value
      // Iterate over the keys (item IDs) in the local state `currentVehicleReminders`
      for (const itemId of Object.keys(currentVehicleReminders)) {
          const reminderMonths = currentVehicleReminders[itemId];
          const maintenanceItem = carMaintenanceItems.find(item => item.id === itemId); // Find item details

          if (maintenanceItem) {
              // Call the helper function to handle scheduling/cancellation for this item
              await scheduleMaintenanceNotification(
                  vehicleName,
                  maintenanceItem.name,
                  reminderMonths, // The reminder duration in months
                  selectedVehicle.id, // Vehicle ID
                  itemId // Maintenance Item ID
              );
          } else {
              console.warn(`Maintenance item details not found for ID: ${itemId}. Cannot schedule notification.`);
              // It's good practice to also cancel any potential past notification for this item ID
              try {
                 await Notifications.cancelScheduledNotificationAsync(`maintenance-${selectedVehicle.id}-${itemId}`);
              } catch (e) { /* ignore */ }
          }
      }
      // ------------------------------------

      Alert.alert("Success", "Saved!");
      // No need to reset form or navigate here

    } catch (error) {
      console.error("Error saving reminders or scheduling notifications:", error);
      Alert.alert("Save Error", `Failed to save reminders or schedule notifications. Details: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSavingReminders(false); // Stop local saving loading state
    }
  };

  // --- Test Notification Function ---
  const scheduleTestNotification = async () => {
    // Check for general notification permissions first
    const { granted } = await Notifications.getPermissionsAsync();
     if (!granted) {
        Alert.alert(
          'Permissions Required',
          'Please enable notifications in your device settings to send test notifications.'
        );
        return;
      }

    const testNotificationId = 'maintenance-test-notification';
    const channelId = 'maintenance-reminders'; // Use the channel ID defined in the setup effect

    // Optional: Cancel previous test notification with the same ID
    try {
         await Notifications.cancelScheduledNotificationAsync(testNotificationId);
         console.log('Cancelled previous test notification');
    } catch (e) { /* ignore if not found */ }

    console.log('Scheduling test notification...');

    try {
        // Create the content object, using a type assertion for channelId workaround
         const testNotificationContent: Notifications.NotificationContentInput = {
            title: "nag alarm",
            body: ' 10-second testing lang .',
            data: { data: 'test data', screen: 'maintenance-test' },
            sound: true,
            ...(Platform.OS === 'android' && { channelId: channelId }),
         };

        await Notifications.scheduleNotificationAsync({
          identifier: testNotificationId, // Use a unique ID for the test notification
          content: testNotificationContent, // Pass the created content object
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, // <-- FIX: Specify the type for seconds trigger
            seconds: 5, 
            repeats: false, 
           
          },
        });
      

    } catch (error) {
        console.error(`Failed to schedule test notification:`, error);
        Alert.alert("Test Notification Error", `Failed to schedule test notification. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  // ---------------------------------


  // Show loading state for initial profile data fetch
  if (isLoadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{marginTop: 10}}>Loading vehicles...</Text>
      </View>
    );
  }

  // Display error if profile data failed to load
  if (profileError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ textAlign: 'center', color: 'red' }}>
          Error loading vehicles: {profileError}
        </Text>
      </View>
    );
  }

  // Display message if no vehicles are registered AND not loading/error
  // This condition is now checked after the loading/error states
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
      // Using push or navigate depending on your desired navigation stack behavior
      router.push({
        pathname: '../maintenance_log', // Assuming '../maintenance_log' is the correct path
        params: { vehicleId: selectedVehicleId },
      });
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Vehicle Maintenance</Text>
         {/* Adjusted spacing slightly */}
        <TouchableOpacity onPress={maintenanceLog} style={[styles.addVehicleIcon, { marginLeft: 'auto' }]}>
          <Ionicons name="folder-open-sharp" size={28} color="#FF5722" />
        </TouchableOpacity>
      </View>
      {vehicles.length > 0 && (
        <>
          {/* Vehicle Selection Area */}
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

          {/* Black Line Separator */}
          <View style={styles.blackLine} />


          {/* Maintenance Items List */}
          <ScrollView style={styles.scrollView}>
            <View style={styles.maintenanceListContainer}>
              {carMaintenanceItems.length > 0 ? (
                carMaintenanceItems.map(item => (
                  <View key={item.id} style={styles.maintenanceItem}>
                    <Text style={styles.maintenanceItemName}>{item.name}</Text>
                    <Text style={styles.maintenanceItemSuggested}>Suggested: {item.suggested}</Text>
                    {/* Reminder Dropdown */}
                    <View style={styles.reminderPickerContainer}>
                      <Picker
                        // Read the reminder value from the local state
                        selectedValue={currentVehicleReminders?.[item.id] ?? 0} // Default to 0 if no reminder saved
                        onValueChange={(itemValue: number) => handleReminderChange(item.id, itemValue)}
                        style={styles.reminderPicker}
                        itemStyle={styles.pickerItem}
                        enabled={!isSavingReminders} // Disable picker while saving
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

            {/* Save Reminders Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveReminders}
              disabled={isSavingReminders || !selectedVehicleId} // Disable if saving or no vehicle selected
            >
              {isSavingReminders ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Reminders</Text>
              )}
            </TouchableOpacity>

            {/* Test Notification Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#1E88E5', marginTop: 10 }]} // Different color for test button
              onPress={scheduleTestNotification}
               disabled={isSavingReminders} // Disable while saving
            >
                <Text style={styles.saveButtonText}>Schedule 10s Test Notification</Text>
            </TouchableOpacity>


            {/* Add spacing at the bottom */}
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
  addVehicleIcon:{
    // width: 25, // Ionicons size handles this
    // height: 25, // Ionicons size handles this
    // marginLeft: 120, // Replaced with marginLeft: 'auto'
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
    overflow: 'hidden',
    marginTop: 10,
    paddingVertical: 2,
  },
  reminderPicker: {
    height: 50,
    width: '100%',
    paddingVertical: 5,
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
=======
    // Get vehicles, loading state, error, and the update action from the user profile store
    const { vehicles, isLoadingProfile, profileError, fetchUserProfileData, updateVehicleReminders } = useUserProfileStore();
    // Get the current user ID from the login store
    const { currentUser } = useUserQueryLoginStore();

    // State for the selected vehicle ID
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    // Local state to track reminders for the currently selected vehicle BEFORE saving
    const [currentVehicleReminders, setCurrentVehicleReminders] = useState<{[itemId: string]: number}>({});
    // Local loading state specifically for the Save button
    const [isSavingReminders, setIsSavingReminders] = useState(false);


    // Effect to fetch user data when the component mounts or currentUser changes
    useEffect(() => {
        // Fetch data only if a user is logged in.
        // The store's isLoadingProfile state prevents multiple fetches.
        if (currentUser?.id) {
             fetchUserProfileData(currentUser.id);
        } else {
             // If user logs out, clear the profile state
             useUserProfileStore.getState().clearProfileState();
        }
    // Dependencies: Only depend on currentUser?.id and the fetch action itself.
    // Removing state variables updated by fetchUserProfileData prevents the loop.
    }, [currentUser?.id, fetchUserProfileData]);


    // Effect to set the default selected vehicle when vehicles are loaded
    useEffect(() => {
        if (vehicles.length > 0 && selectedVehicleId === null) {
            setSelectedVehicleId(vehicles[0].id);
        } else if (vehicles.length === 0) {
            setSelectedVehicleId(null);
        }
    }, [vehicles, selectedVehicleId]);

    // Effect to sync local reminders state when the selected vehicle changes
    useEffect(() => {
        const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
        setCurrentVehicleReminders(selectedVehicle?.reminders || {});
    }, [selectedVehicleId, vehicles]); // Re-run if selectedVehicleId or vehicles array changes


    // Get the currently selected vehicle object
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

    // Handle reminder selection change for a maintenance item (updates local state)
    const handleReminderChange = (itemId: string, value: number) => {
        setCurrentVehicleReminders(prev => ({ ...prev, [itemId]: value }));
        // Note: This only updates local state. Saving happens on button click.
    };

    // Handle the Save Reminders button press
    const handleSaveReminders = async () => {
        if (!selectedVehicle || !currentUser?.id) {
            Alert.alert("Error", "No vehicle selected or user not logged in.");
            return;
        }

        setIsSavingReminders(true); // Start local saving loading state

        try {
            // Call the store action to update reminders for this vehicle in Firestore
            // Pass the current local reminders state
            await updateVehicleReminders(currentUser.id, selectedVehicle.id, currentVehicleReminders);

            Alert.alert("Success", "Reminders saved successfully!");
             // No need to reset form or navigate here

        } catch (error) {
            console.error("Error saving reminders:", error);
            Alert.alert("Save Error", "Failed to save reminders.");
        } finally {
            setIsSavingReminders(false); // Stop local saving loading state
        }
    };


     // Show loading state for initial profile data fetch
    if (isLoadingProfile) {
        return (
             <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="black" />
                <Text style={{marginTop: 10}}>Loading vehicles...</Text>
            </View>
        );
    }

     // Display error if profile data failed to load
     if (profileError) {
         return (
             <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                 <Text style={{ textAlign: 'center', color: 'red' }}>
                     Error loading vehicles: {profileError}
                 </Text>
             </View>
         );
     }

    // Display message if no vehicles are registered AND not loading/error
    // This condition is now checked after the loading/error states
    if (!vehicles.length && !isLoadingProfile && !profileError) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ textAlign: 'center' }}>
                        No vehicles registered. Please add a vehicle in your Profile settings.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

const maintenanceLog = () => {
  if (selectedVehicleId) {
    router.replace({
      pathname: '../maintenance_log',
      params: { vehicleId: selectedVehicleId },
    });
  }
};


    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerText}>Vehicle Maintenance</Text>
                <TouchableOpacity onPress={maintenanceLog} style={styles.addVehicleIcon}>
                         <Ionicons name="folder-open-sharp" size={28} color="#FF5722" />
                </TouchableOpacity>
            </View>
            {vehicles.length > 0 && (
                <>
                    {/* Vehicle Selection Area */}
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

                    {/* Black Line Separator */}
                    <View style={styles.blackLine} />


                    {/* Maintenance Items List */}
                    <ScrollView style={styles.scrollView}>
                        <View style={styles.maintenanceListContainer}>
                            {carMaintenanceItems.length > 0 ? (
                                carMaintenanceItems.map(item => (
                                    <View key={item.id} style={styles.maintenanceItem}>
                                        <Text style={styles.maintenanceItemName}>{item.name}</Text>
                                        <Text style={styles.maintenanceItemSuggested}>Suggested: {item.suggested}</Text>
                                        {/* Reminder Dropdown */}
                                        <View style={styles.reminderPickerContainer}>
                                             <Picker
                                                 // Read the reminder value from the local state
                                                 selectedValue={currentVehicleReminders?.[item.id] ?? 0} // Default to 0 if no reminder saved
                                                 onValueChange={(itemValue: number) => handleReminderChange(item.id, itemValue)}
                                                 style={styles.reminderPicker}
                                                 itemStyle={styles.pickerItem}
                                                 enabled={!isSavingReminders} // Disable picker while saving
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

                        {/* Save Reminders Button */}
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSaveReminders}
                            disabled={isSavingReminders || !selectedVehicleId} // Disable if saving or no vehicle selected
                        >
                            {isSavingReminders ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Reminders</Text>
                            )}
                        </TouchableOpacity>

                         {/* Add spacing at the bottom */}
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
    addVehicleIcon:{
        width: 25,
        height: 25,
        marginLeft: 120,
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
        overflow: 'hidden',
        marginTop: 10,
        paddingVertical: 2,
    },
    reminderPicker: {
        height: 50,
        width: '100%',
        paddingVertical: 5,
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
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
