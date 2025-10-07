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
        return { success: false, error: errorMsg, vehicleId: undefined };
    }

    const currentUser = useUserQueryLoginStore.getState().currentUser;
    console.log("saveVehicle: DEBUG 1 - currentUser ID:", currentUser?.id);

    if (!currentUser?.id) {
        const errorMsg = "No logged in user found. Please log in.";
        set({ saveError: errorMsg, isSaving: false });
        get().resetForm();
        return { success: false, error: errorMsg, vehicleId: undefined };
    }

    console.log("saveVehicle: DEBUG 1.5 - After currentUser check");

    const newVehicle: Vehicle = {
        id: generateSimpleId(),
        year: year.trim(),
        make: make.trim(),
        model: model.trim(),
        transmission,
    };

    console.log("saveVehicle: DEBUG 1.8 - After newVehicle creation");

    try {
        const userRole = currentUser.role || 'user'; // Default to 'user' if role is missing
        const collectionName = userRole === 'mechanic' ? 'mechanics' : 'users';

        console.log(`saveVehicle: Using collection: ${collectionName}`);

        const userDocRef = doc(db, collectionName, currentUser.id);
        console.log("saveVehicle: DEBUG 2.5 - After getting user doc ref");

        console.log("saveVehicle: DEBUG 3 - Attempting to get user doc snapshot...");
        const userDocSnap = await getDoc(userDocRef);
        console.log("saveVehicle: DEBUG 3.5 - After getting user doc snapshot");

        if (!userDocSnap.exists()) {
            throw new Error(`User document not found for ID: ${currentUser.id} in ${collectionName}`);
        }

        const userData = userDocSnap.data();
        const existingVehicles = userData?.vehicles || [];

        if (existingVehicles.length >= 6) {
            const errorMsg = "You have reached the maximum limit of 6 vehicles.";
            console.warn(`saveVehicle: Vehicle limit reached (${existingVehicles.length}).`);
            set({ saveError: errorMsg, isSaving: false });
            return { success: false, error: errorMsg, vehicleId: undefined };
        }

        const updatedVehicles = [...existingVehicles, newVehicle];

        console.log("saveVehicle: DEBUG 5 - Attempting to update user doc...");
        await updateDoc(userDocRef, { vehicles: updatedVehicles });
        console.log("saveVehicle: DEBUG 5.5 - After updating user doc");

        return { success: true, vehicleId: newVehicle.id, error: undefined };

    } catch (error: unknown) {
        console.error("saveVehicle: DEBUG CATCH - Caught error:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        set({ saveError: message });
        return { success: false, error: message, vehicleId: undefined };
    } finally {
        set({ isSaving: false });
        console.log("saveVehicle: DEBUG FINALLY - Finally block executed. isSaving set to false.");
    }
},


    setSaveError: (errorValue) => set({ saveError: errorValue }),
}));
