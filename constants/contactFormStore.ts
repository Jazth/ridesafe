// contactFormStore.ts
// This store manages state and logic for the registration form, including saving a password.

import { db } from '@/scripts/firebaseConfig'; // Ensure this path is correct for your Firebase config
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { create } from 'zustand';

// Interface for the basic form data (user input)
interface RegistrationFormData { // Renamed for clarity
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string; 
}

// Interface for the data structure that will be saved to Firestore
// (includes basic form data + a creation timestamp)
interface UserToSave extends RegistrationFormData { // Renamed for clarity
    createdAt: Timestamp;
    // IMPORTANT SECURITY WARNING:
    // This current implementation saves the password in PLAIN TEXT to Firestore.
    // This is HIGHLY INSECURE and should NEVER be done in a production application.
    // For production, you MUST hash the password securely on a trusted server
    // before storing it, and implement secure server-side login verification.
}

// Interface for the store's state
interface RegistrationFormState { // Renamed for clarity
    // Form fields state
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string; // <-- Added password state

    // Loading and error states specifically for the save operation
    isSaving: boolean;
    saveError: string | null;
}

// Interface for the store's actions
interface RegistrationFormActions { // Renamed for clarity
    // Setters for form fields
    setFirstName: (name: string) => void;
    setLastName: (name: string) => void;
    setEmail: (email: string) => void;
    setPhoneNumber: (number: string) => void;
    setPassword: (password: string) => void; // <-- Added setPassword action

    // Reset form fields and save status
    resetForm: () => void;

    // Action to save registration data (including password) to Firestore
    // Returns success: true and docId on success, or success: false and error message on failure
    saveRegistrationData: () => Promise<{ success: boolean; error?: string; docId?: string }>; // Renamed action

    // Action to manually set save error
    setSaveError: (error: string | null) => void;
}

// Combining state and actions into a single store type
type RegistrationFormStore = RegistrationFormState & RegistrationFormActions; // Renamed store type

// Creating the Zustand store for the registration form
export const useRegistrationFormStore = create<RegistrationFormStore>((set, get) => ({ // Renamed hook export
    // Initial state values
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '', // <-- Initial password state
    isSaving: false,
    saveError: null,

    // Setters for form fields (clear saveError on input change)
    setFirstName: (name) => set({ firstName: name, saveError: null }),
    setLastName: (name) => set({ lastName: name, saveError: null }),
    setEmail: (emailValue) => set({ email: emailValue, saveError: null }),
    setPhoneNumber: (numberValue) => set({ phoneNumber: numberValue, saveError: null }),
    setPassword: (passwordValue) => set({ password: passwordValue, saveError: null }), // <-- setPassword implementation

    // Action to reset form fields and saving status
    resetForm: () => set({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '', // <-- Reset password state
        isSaving: false,
        saveError: null,
    }),

    // Action to save registration data (including password) to the 'users' collection
    saveRegistrationData: async () => { // Renamed action
        set({ isSaving: true, saveError: null }); // Indicate start of saving, clear previous errors
        const { firstName, lastName, email, phoneNumber, password } = get(); // Get current form state, including password

        // Basic validation check
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
             const errorMsg = "All fields (including password) are required.";
             set({ saveError: errorMsg, isSaving: false });
             return { success: false, error: errorMsg };
        }

        // --- Password Security Warning ---
        // The following line prepares to save the password in plain text.
        // THIS IS EXTREMELY INSECURE. Replace this with a secure password hashing
        // process (ideally performed on a server) before saving in production.
        // --- End Password Security Warning ---

        // Prepare data structure to save to Firestore
        const userToSave: UserToSave = { // Renamed variable
            firstName,
            lastName,
            email: email.trim(), // Trim email for consistency
            phoneNumber,
            password, // <-- Include the password in the data
            createdAt: Timestamp.now(),
        };

        try {
            // Add a new document to the "users" collection
            // This MUST match the collection queried by your login store for accounts to be usable
            // Firestore will automatically generate a unique ID for the document
            console.log("Attempting to save user data to 'users' collection:", userToSave.email);
            const docRef = await addDoc(collection(db, "users"), userToSave); // <-- SAVING TO "users" collection

            console.log("User data saved with ID: ", docRef.id);

            set({ isSaving: false }); // Saving successful, stop loading state
            // We might NOT reset the form here, the component handles it on success

            return { success: true, docId: docRef.id }; // Return success status and the new document ID

        } catch (error: any) {
            // Handle any errors that occur during the Firestore save operation
            console.error("Error saving user data: ", error);
            const message = error.message || "Failed to save user data. Please try again.";
            set({ saveError: message, isSaving: false }); // Set the error state and stop loading
            return { success: false, error: message }; // Return failure status and error message
        }
    },

    // Action to manually clear or set save errors
    setSaveError: (errorValue) => set({ saveError: errorValue }),
}));