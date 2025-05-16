import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import the user profile store to access user's vehicles, loading state, and update action
import { useUserProfileStore } from '@/constants/userProfileStore';
// Import the login store to get the current user's ID
import { useUserQueryLoginStore } from '@/constants/store';


// Static list of maintenance items for Cars
const carMaintenanceItems = [
  { id: 'oil', name: 'Engine Oil & Filter', suggested: 'Every 6 months or 5,000 miles' },
  { id: 'tires', name: 'Tire Rotation', suggested: 'Every 6 months or 5,000 miles' },
  { id: 'brakes', name: 'Brake Pad Check', suggested: 'Every 12 months or 10,000 miles' },
  { id: 'air', name: 'Air Filter', suggested: 'Every 12 months or 10,000 miles' },
  // Add more car-specific maintenance items here
];

// Reminder options for maintenance items
const reminderOptions = [
    { label: 'Remind me in 3 months', value: 3 },
    { label: 'Remind me in 6 months', value: 6 },
    { label: 'Remind me in 9 months', value: 9 },
    { label: 'Remind me in 12 months', value: 12 },
    { label: 'No Reminder', value: 0 }, // Option for no reminder
];


const MaintenanceScreen = () => {
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


    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerText}>Vehicle Maintenance</Text>
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
                                 enabled={!isSavingReminders} // Disable picker while saving
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
        marginBottom: 10,
        alignItems: 'center',
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
        // Removed fixed width
        // width: 350,

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
        backgroundColor: 'black',
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
