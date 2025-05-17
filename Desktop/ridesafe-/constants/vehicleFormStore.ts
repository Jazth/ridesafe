import { db } from '@/scripts/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
// import { v4 as uuidv4 } from 'uuid'; // Removed uuid import

import { useUserQueryLoginStore } from '@/constants/store';

console.log("vehicleFormStore: db value at store load:", db); // DEBUG LOG A

export interface Vehicle {
    id: string;
    year: string;
    make: string;
    model: string;
    transmission: 'manual' | 'automatic';
    [key: string]: any;
}

interface VehicleFormState {
    year: string;
    make: string;
    model: string;
    transmission: 'manual' | 'automatic' | '';

    isSaving: boolean;
    saveError: string | null;
}

interface VehicleFormActions {
    setYear: (year: string) => void;
    setMake: (make: string) => void;
    setModel: (model: string) => void;
    setTransmission: (transmission: 'manual' | 'automatic' | '') => void;

    resetForm: () => void;

    // Explicitly define the return type of the promise
    saveVehicle: () => Promise<{ success: boolean; error?: string; vehicleId?: string }>;

    setSaveError: (error: string | null) => void;
}

type VehicleFormStore = VehicleFormState & VehicleFormActions;

let counter = 0;
const generateSimpleId = (): string => {
    counter = (counter + 1) % 1000;
    const timestamp = Date.now();
    const randomPart = Math.floor(Math.random() * 1000);
    return `${timestamp}-${counter}-${randomPart}`;
};


export const useVehicleFormStore = create<VehicleFormStore>((set, get) => ({
    year: '',
    make: '',
    model: '',
    transmission: '',

    isSaving: false,
    saveError: null,

    setYear: (year) => set({ year: year, saveError: null }),
    setMake: (make) => set({ make: make, saveError: null }),
    setModel: (model) => set({ model: model, saveError: null }),
    setTransmission: (transmission) => set({ transmission: transmission, saveError: null }),

    resetForm: () => set({
        year: '',
        make: '',
        model: '',
        transmission: '',
        isSaving: false,
        saveError: null,
    }),

    saveVehicle: async () => {
        set({ isSaving: true, saveError: null });
        const { year, make, model, transmission } = get();

        if (!year.trim() || !make.trim() || !model.trim() || !transmission) {
             const errorMsg = "Please fill in all vehicle details.";
             set({ saveError: errorMsg, isSaving: false });
             // Explicitly return the full expected object structure
             return { success: false, error: errorMsg, vehicleId: undefined };
        }

        const currentUser = useUserQueryLoginStore.getState().currentUser;
        console.log("saveVehicle: DEBUG 1 - currentUser ID:", currentUser?.id); // DEBUG LOG 1

        if (!currentUser?.id) {
             const errorMsg = "No logged in user found. Please log in.";
             set({ saveError: errorMsg, isSaving: false });
             get().resetForm();
             // Explicitly return the full expected object structure
             return { success: false, error: errorMsg, vehicleId: undefined };
        }

        console.log("saveVehicle: DEBUG 1.5 - After currentUser check"); // DEBUG LOG 1.5

        const newVehicle: Vehicle = {
            id: generateSimpleId(),
            year: year.trim(),
            make: make.trim(),
            model: model.trim(),
            transmission,
        };
        console.log("saveVehicle: DEBUG 1.8 - After newVehicle creation"); // DEBUG LOG 1.8


        try {
            console.log("saveVehicle: DEBUG B - Value of db before doc():", db); // DEBUG LOG B
            console.log("saveVehicle: DEBUG 2 - Attempting to get user doc ref:", currentUser.id); // DEBUG LOG 2
            const userDocRef = doc(db, 'users', currentUser.id);
            console.log("saveVehicle: DEBUG 2.5 - After getting user doc ref"); // DEBUG LOG 2.5


            console.log("saveVehicle: DEBUG 3 - Attempting to get user doc snapshot..."); // DEBUG LOG 3
            const userDocSnap = await getDoc(userDocRef);
            console.log("saveVehicle: DEBUG 3.5 - After getting user doc snapshot"); // DEBUG LOG 3.5


            console.log("saveVehicle: DEBUG 4 - Got user doc snapshot. Exists:", userDocSnap.exists()); // DEBUG LOG 4
            if (!userDocSnap.exists()) {
                 throw new Error(`User document not found for ID: ${currentUser.id}`);
            }
            const userData = userDocSnap.data();
            const existingVehicles = userData?.vehicles || [];
            console.log(`saveVehicle: Found ${existingVehicles.length} existing vehicles.`); // DEBUG LOG: Check existing count

            // --- Add the 6-car limit check here ---
            if (existingVehicles.length >= 6) {
                const errorMsg = "You have reached the maximum limit of 6 vehicles.";
                console.warn(`saveVehicle: Vehicle limit reached (${existingVehicles.length}). Cannot add new vehicle.`); // DEBUG LOG: Limit reached
                set({ saveError: errorMsg, isSaving: false }); // Set error and stop loading
                return { success: false, error: errorMsg, vehicleId: undefined }; // Return failure
            }
            // --- End limit check ---


            const updatedVehicles = [...existingVehicles, newVehicle];
            console.log("saveVehicle: DEBUG 4.5 - After processing user data and adding new vehicle"); // DEBUG LOG 4.5


            console.log("saveVehicle: DEBUG 5 - Attempting to update user doc..."); // DEBUG LOG 5
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
            console.log("saveVehicle: DEBUG 5.5 - After updating user doc");


            console.log("saveVehicle: DEBUG 6 - Update successful!");

            // isSaving is set to false in the finally block below

            // Explicitly return the full expected object structure on success
            return { success: true, vehicleId: newVehicle.id, error: undefined };

        } catch (error: unknown) { // Use unknown for better type safety
            console.error("saveVehicle: DEBUG CATCH - Caught error:", error); // DEBUG LOG CATCH
            // Safely extract error message
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            set({ saveError: message }); // Set error state
            // isSaving is set to false in the finally block below
            // Explicitly return the full expected object structure on failure
            return { success: false, error: message, vehicleId: undefined };
        } finally {
            set({ isSaving: false }); // DEBUG LOG FINALLY
            console.log("saveVehicle: DEBUG FINALLY - Finally block executed. isSaving set to false.");
        }
    },

    setSaveError: (errorValue) => set({ saveError: errorValue }),
}));
