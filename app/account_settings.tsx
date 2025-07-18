import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useRouter } from 'expo-router';
import { doc, DocumentReference, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore, Vehicle } from '@/constants/userProfileStore';


const navigateToEditProfile = () => {
        router.push('../profile_account');
    };
const ProfileLogoWithPicker = ({ userInfo }: { userInfo: any }) => {
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const router = useRouter();



    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Sorry, we need media library permissions to set a profile picture!',
                    [{ text: 'OK' }]
                );
            }
        })();
    }, []);

    const pickImage = async () => {
           const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();

           if (!permissionResult.granted) {
               Alert.alert(
                   'Permission Required',
                   'Please grant photo library permissions in your device settings to upload a profile picture.'
               );
               return;
           }
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImageUri = result.assets[0].uri;
                setProfilePicture(selectedImageUri);
            }
        } catch (error) {
            console.error('Error launching image library:', error);
            Alert.alert('Error', 'An error occurred while trying to open the image library.');
        }
    };

    const displayPicture = profilePicture || userInfo?.profilePictureUrl;

    return (
        <View style={styles.logoWithPickerContainer}>
            <View style={styles.profileSection}>
                <TouchableOpacity onPress={pickImage} style={styles.profilePictureContainer}>
                    {displayPicture ? (
                        <Image source={{ uri: displayPicture }} style={styles.profilePicture} />
                    ) : (
                        <View style={styles.profilePicturePlaceholder}>
                            <Text style={styles.placeholderText}>+</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <Text style={styles.logoText}>{userInfo?.firstName} {userInfo?.lastName}</Text>
            </View>
        </View>
    );
};

const ProfileSettingsScreen = () => {
    const router = useRouter();

    const { currentUser } = useUserQueryLoginStore();
    const { userInfo, setVehicles, vehicles, setUserInfo, clearProfileState, isLoadingProfile, profileError } = useUserProfileStore();

    const [loading, setLoading] = useState(true);

    const fetchUserData = async (userId: string) => {
         useUserProfileStore.getState().setIsLoadingProfile(true);

        try {
            console.log("fetchUserData: Attempting to get user doc ref for ID:", userId);
            const userDocRef: DocumentReference = doc(db, 'users', userId);
            console.log("fetchUserData: After getting user doc ref.");

            console.log("fetchUserData: Attempting to get user doc snapshot...");
            const userDoc = await getDoc(userDocRef);
            console.log("fetchUserData: After getting user doc snapshot. Exists:", userDoc.exists());

            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("fetchUserData: Fetched user data from Firestore:", userData);

                const fetchedVehicles = Array.isArray(userData.vehicles) ? userData.vehicles : [];
                const vehiclesWithReminders = fetchedVehicles.map(vehicle => ({
                    ...vehicle,
                    reminders: vehicle.reminders || {}
                }));
                console.log("fetchUserData: Processed vehicles data.");


                useUserProfileStore.getState().setUserInfo(userData);
                useUserProfileStore.getState().setVehicles(vehiclesWithReminders);
                console.log("fetchUserData: Updated user profile store state.");


            } else {
                console.warn(`fetchUserData: User document not found for userId: ${userId}`);
                useUserProfileStore.getState().setUserInfo(null);
                useUserProfileStore.getState().setVehicles([]);
                useUserProfileStore.getState().setProfileError("User data not found.");
            }
        } catch (error: any) {
            console.error('fetchUserData: Caught error:', error);
            const message = error.message || 'Failed to load user data.';
            useUserProfileStore.getState().setUserInfo(null);
            useUserProfileStore.getState().setVehicles([]);
            useUserProfileStore.getState().setProfileError(message);
            Alert.alert('Error', message);
        } finally {
            useUserProfileStore.getState().setIsLoadingProfile(false);
            console.log("fetchUserData: Finally block executed. isLoadingProfile set to false.");
        }
    };


    useEffect(() => {
        if (currentUser?.id) {
             fetchUserData(currentUser.id);
        } else {
             useUserProfileStore.getState().setIsLoadingProfile(false);
             clearProfileState();
        }
   
    }, [currentUser?.id, setUserInfo, setVehicles, clearProfileState]);


    const handleLogout = async () => {
        const { logout } = useUserQueryLoginStore.getState();
        const router = useRouter();

        try {
            logout();
            console.log('User logged out via Zustand store!');
            router.replace('/login');

        } catch (error: any) {
            console.error("Error during logout", error);
            Alert.alert("Logout Error", error.message || "An error occurred during logout.");
        }
    }

    const createVehicles = () => {
        router.push('../vehicles');
    };

     const handleRemoveVehicle = async (idToRemove: string) => {
        const userId = currentUser?.id;

        if (!userId) {
            Alert.alert('Error', 'User not logged in or ID missing.');
            return;
        }

        const updatedVehicles = vehicles.filter((vehicle: Vehicle) => vehicle.id !== idToRemove);
        setVehicles(updatedVehicles);

        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
            Alert.alert('Success', 'Vehicle removed successfully.');
        } catch (error) {
            console.error('Error removing vehicle from Firestore:', error);
            Alert.alert('Error', 'Failed to remove vehicle.');
        }
    };


    if (isLoadingProfile) {
        return (
             <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="black" />
                <Text style={{marginTop: 10}}>Loading profile data...</Text>
            </View>
        );
    }

    if (profileError) {
         return (
             <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                 <Text style={{ textAlign: 'center', color: 'red' }}>
                     Error loading profile data: {profileError}
                 </Text>
             </View>
         );
    }


    if (!userInfo) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ textAlign: 'center' }}>
                    No user data found. Please ensure you are logged in.
                </Text>
            </View>
        );
    }

    const accchange = () => {
        router.replace('../account_change');
    }

    return (
        <SafeAreaView style={styles.safeArea}>
             <View style={styles.topSection}>
                <ProfileLogoWithPicker userInfo={userInfo} />
            </View>

            <ScrollView style={styles.cont}>
                <View style={styles.profile}>
                    <View style={styles.profEdit}>
                         <Text style={styles.headertxt}> Profile </Text>
                          <TouchableOpacity onPress={navigateToEditProfile} style={styles.editButtonRight}>
                             <Ionicons name="pencil-sharp" size={18} color="black" onPress={accchange}/>
                         </TouchableOpacity> 
                    </View>

                    <View style={styles.profileInfo}>
                        <Text style={styles.subHeadertxt}> Email </Text>
                        <Text style={styles.emailInput}> {userInfo?.email} </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.subHeadertxt}> Phone Number</Text>
                        <Text style={styles.emailInput}>{userInfo?.phoneNumber}</Text>
                    </View>
                </View>

                <View style={styles.vehicleHeader}>
                    <Text style={styles.headertxt}>Vehicle Information</Text>
                    <TouchableOpacity onPress={createVehicles} style={styles.addVehicleIcon}>
                         <Ionicons name="add-circle-outline" size={28} color="black" />
                    </TouchableOpacity>
                </View>

                 <View>
                    {vehicles?.map((vehicle: Vehicle) => (
                        <View key={vehicle.id} style={styles.displayVehicle}>
                            <View style={styles.vehicleInfoWrapper}>
                                <Text style={styles.textVehicle}>
                                    {vehicle.make} {vehicle.model} - {vehicle.color} ({vehicle.year})
                                </Text>
                                {vehicle.transmission && (
                                    <View style={styles.transmissionLabel}>
                                        <Text style={styles.transmissionText}>
                                            {vehicle.transmission.charAt(0).toUpperCase() + vehicle.transmission.slice(1)}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.removeCarButton}
                                onPress={() => handleRemoveVehicle(vehicle.id)}>
                                <Text style={styles.removeCarText}> Remove </Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {vehicles?.length === 0 && (
                        <Text style={{ textAlign: 'center', marginTop: 20 }}>No vehicles added yet.</Text>
                    )}
                </View>

                 <View style={{ height: 60 }} />

            </ScrollView>

             <View style={styles.backButtonContainerBottom}> 
                 <TouchableOpacity onPress={() => router.replace('../Profile')}>
                     <Text style={styles.backButtonTextBottom}>Back</Text>
                 </TouchableOpacity>
             </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white',
    },
    profEdit:{
        flexDirection: 'row',
         alignItems: 'center',
         justifyContent: 'space-between',
         marginBottom: 10,
    },
    settingItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    settingText: {
        fontSize: 16,
    },

     safeArea: {
        flex: 1,
        backgroundColor: 'white',
    },
    topSection: {
         paddingTop: 10,
         paddingHorizontal: 10,
         backgroundColor: 'white',
         color: 'white',
    },
    logoWithPickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 0,
        paddingBottom: 15,
        justifyContent: 'space-between',
        marginLeft: 10,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 30,
    },
    logoText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    profilePictureContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        
    },
    profilePicture: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    profilePicturePlaceholder: {
        flex: 1,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        
    },
    placeholderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
        marginTop: 15,
        marginLeft: 15,
    },
    editButtonRight: {
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'black',
    },
    blackLine: {
        borderBottomColor: 'gray',
        borderBottomWidth: 1,
        marginBottom: 10,
        marginHorizontal: 10,
    },
    cont: {
        marginLeft: 15,
        flex: 1,
        paddingRight: 15,
    },
    profile: {
        marginTop: 5,
        marginBottom: 20,
    },
    profileInfo: {
        flexDirection: 'column',
        marginTop: 12,
        gap: 5,
    },
    label: {
        fontWeight: 'bold',
        marginRight: 5,
    },
    info: {
        fontSize: 16,
    },
    emailInput: {
        padding: 5,
        fontSize: 12,
        width: '95%',
        backgroundColor: 'lightgray',
        marginLeft: 7,
    },
    vehicleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    addVehicleText: {
        fontSize: 15,
        color: 'blue',
    },
    addVehicleIcon: {
        marginLeft: 10,
        padding: 5,
    },
    displayVehicle: {
        flexDirection: 'row',
        marginTop: 5,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
        paddingTop: 5,
    },
    vehicleInfoWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    textVehicle: {
        textAlign: 'left',
        paddingLeft: 5,
        fontSize: 15,
        marginRight: 8,
        flexShrink: 1,
    },
    transmissionLabel: {
<<<<<<< HEAD
        backgroundColor: 'gray',
        paddingVertical: 3,
        paddingHorizontal: 4,
=======
        backgroundColor: 'green',
        paddingVertical: 3,
        paddingHorizontal: 6,
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transmissionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    headertxt: {
        fontSize: 25,
        fontWeight: 'bold',
    },
    subHeadertxt: {
        fontSize: 15,
        marginLeft: 3,
    },
    removeCarButton: {
        backgroundColor: 'red',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeCarText: {
        color: 'white',
        fontWeight: 'bold',
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderTopWidth: 1,
        borderTopColor: 'lightgray',
        backgroundColor: 'white',
    },
     backButtonContainer: {
         position: 'absolute',
         bottom: 20,
         right: 20,
     },
     backButtonText: {
         fontSize: 16,
         color: 'blue',
         textDecorationLine: 'underline',
     },
      backButtonContainerTop: { // Style for the top-left back button
         position: 'absolute', // Position it absolutely
         top: 10, // Adjust as needed for notch/safe area
         left: 10, // Adjust as needed
         zIndex: 1, // Ensure it's above other content
         padding: 5, // Add padding for easier tapping
     },
      backButtonContainerBottom: { // New style for bottom-right back button container
         position: 'absolute',
         bottom: 20,
         right: 20,
     },
     backButtonTextBottom: { // New style for bottom-right back button text
         fontSize: 16,
         color: 'black',
     },
});

export default ProfileSettingsScreen;
