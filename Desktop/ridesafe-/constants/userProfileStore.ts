import { create } from 'zustand';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/scripts/firebaseConfig';

// Define the structure for a Vehicle object, now including reminders
export interface Vehicle {
    id: string;
    year: string;
    make: string;
    model: string;
    transmission: 'manual' | 'automatic';
    // Add other vehicle details here (e.g., color, license plate)
    // Add reminders for this specific vehicle
    reminders?: { [itemId: string]: number }; // Object where keys are maintenance item IDs and values are reminder months
    [key: string]: any;
}

interface UserProfileState {
    userInfo: any | null;
    vehicles: Vehicle[];
    isLoadingProfile: boolean;
    profileError: string | null;
}

interface UserProfileActions {
    setUserInfo: (info: any | null) => void;
    setVehicles: (vehicles: Vehicle[]) => void;
    clearProfileState: () => void;
    fetchUserProfileData: (userId: string) => Promise<void>;
    setIsLoadingProfile: (isLoading: boolean) => void;
    setProfileError: (error: string | null) => void;
    // New action to update reminders for a specific vehicle
    updateVehicleReminders: (userId: string, vehicleId: string, updatedReminders: { [itemId: string]: number }) => Promise<void>;
}

type UserProfileStore = UserProfileState & UserProfileActions;

export const useUserProfileStore = create<UserProfileStore>((set, get) => ({
    userInfo: null,
    vehicles: [],
    isLoadingProfile: false,
    profileError: null,

    setUserInfo: (info) => set({ userInfo: info }),
    setVehicles: (vehicles) => set({ vehicles: vehicles }),
    setIsLoadingProfile: (isLoading) => set({ isLoadingProfile: isLoading }),
    setProfileError: (error) => set({ profileError: error }),

    clearProfileState: () => set({ userInfo: null, vehicles: [], isLoadingProfile: false, profileError: null }),

    fetchUserProfileData: async (userId: string) => {
        set({ isLoadingProfile: true, profileError: null });

        try {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("Fetched user data from Firestore (via store action):", userData);
                // Ensure vehicles array and reminders within vehicles are handled
                const fetchedVehicles: Vehicle[] = userData.vehicles || [];
                // Map over fetched vehicles to ensure 'reminders' property exists, default to empty object if not
                const vehiclesWithReminders = fetchedVehicles.map(vehicle => ({
                    ...vehicle,
                    reminders: vehicle.reminders || {} // Ensure reminders is an object, even if empty
                }));

                set({ userInfo: userData, vehicles: vehiclesWithReminders, isLoadingProfile: false });
            } else {
                console.warn(`User document not found for userId: ${userId} (via store action)`);
                set({ userInfo: null, vehicles: [], isLoadingProfile: false, profileError: "User data not found." });
            }
        } catch (error: any) {
            console.error('Error fetching user data (via store action):', error);
            const message = error.message || 'Failed to load user data.';
            set({ userInfo: null, vehicles: [], isLoadingProfile: false, profileError: message });
        }
    },

    // New action to update reminders for a specific vehicle
    updateVehicleReminders: async (userId: string, vehicleId: string, updatedReminders: { [itemId: string]: number }) => {
        // No loading state update here to avoid screen-wide loading for just a reminder change
        set({ profileError: null }); // Clear previous errors

        try {
            const userDocRef = doc(db, 'users', userId);
            // Fetch the user document to get the current vehicles array
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                 console.warn(`User document not found for userId: ${userId} during reminder update.`);
                 set({ profileError: "User data not found for reminder update." });
                 return;
            }

            const userData = userDocSnap.data();
            const existingVehicles: Vehicle[] = userData?.vehicles || [];

            // Find the specific vehicle to update
            const vehicleIndex = existingVehicles.findIndex(v => v.id === vehicleId);

            if (vehicleIndex === -1) {
                 console.warn(`Vehicle with ID ${vehicleId} not found for reminder update.`);
                 set({ profileError: "Vehicle not found for reminder update." });
                 return;
            }

            // Create an updated vehicles array with the modified vehicle
            const updatedVehicles = [...existingVehicles];
            updatedVehicles[vehicleIndex] = {
                ...updatedVehicles[vehicleIndex],
                reminders: updatedReminders // Set the new reminders object
            };

            // Update the user document in Firestore with the modified vehicles array
            await updateDoc(userDocRef, { vehicles: updatedVehicles });

            console.log(`Reminders updated for vehicle ${vehicleId} for user ${userId}`);

            // Optionally update the store state immediately after successful Firestore write
            set(state => ({
                 vehicles: state.vehicles.map(v =>
                     v.id === vehicleId ? { ...v, reminders: updatedReminders } : v
                 )
            }));


        } catch (error: any) {
            console.error("Error updating vehicle reminders:", error);
            const message = error.message || "Failed to update reminders.";
            set({ profileError: message }); // Set error state
        }
    },
}));
