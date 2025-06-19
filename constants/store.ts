
import { db } from '@/scripts/firebaseConfig'; // <-- Ensure this path is correct!
// If the 'db' import is undefined or null, you will get the "expected first argument to collection" error.

import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { create } from 'zustand';

// Interface for the user data expected from Firestore
// Adjust this to match the actual structure of your user documents in the "users" collection
export interface UserProfile {
    id: string; // Firestore document ID
    email: string; // Should be unique and used for login
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    createdAt?: Timestamp;
    // Add any other fields you store for users (excluding the password for the state)
    [key: string]: any; // Allows for additional properties
}

// Interface for the store's state
interface UserQueryLoginState {
    emailInput: string;         // For the email input field
    passwordInput: string;      // For the password input field
    currentUser: UserProfile | null; // Holds the data of the "logged-in" user
    isLoading: boolean;
    loginError: string | null;
}

// Interface for the store's actions
interface UserQueryLoginActions {
    setEmailInput: (email: string) => void;
    setPasswordInput: (password: string) => void;
    // Returns success: true on success, or success: false and an error message on failure
    attemptLoginWithQuery: () => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    clearLoginError: () => void;
}

// Combining state and actions
type UserQueryLoginStore = UserQueryLoginState & UserQueryLoginActions;

export const useUserQueryLoginStore = create<UserQueryLoginStore>((set, get) => ({
    // Initial state
    emailInput: '',
    passwordInput: '',
    currentUser: null,
    isLoading: false,
    loginError: null,

    // Action to update the email input (clears error on change)
    setEmailInput: (email) => set({ emailInput: email, loginError: null }),
    // Action to update the password input (clears error on change)
    setPasswordInput: (password) => set({ passwordInput: password, loginError: null }),

    // Action to attempt "login" by querying Firestore for email and password
    attemptLoginWithQuery: async () => {
        set({ isLoading: true, loginError: null }); // Start loading, clear previous errors
        const { emailInput, passwordInput } = get(); // Get current input values

        // Basic validation
        if (!emailInput.trim() || !passwordInput.trim()) {
            const errorMsg = "Email and Password cannot be empty.";
            set({ loginError: errorMsg, isLoading: false });
            return { success: false, error: errorMsg };
        }

        try {
            // Get a reference to the 'users' collection
            // THIS IS WHERE THE ERROR "expected first argument to collection" OCCURS
            // IF 'db' IS UNDEFINED OR NOT A VALID FIRESTORE INSTANCE.
            const usersRef = collection(db, "users"); // Assuming your collection name is "users"

            // Create a query to find a document matching both email and password
            // IMPORTANT: This queries for the plain text password stored in the DB.
            // This is INSECURE. Password hashing and secure verification (ideally server-side)
            // is required for production apps.
            const q = query(
                usersRef,
                where("email", "==", emailInput.trim()), // Case sensitivity depends on Firestore field value
                where("password", "==", passwordInput) // Matches the exact stored password value
            );

            // Execute the query
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // No user found with that email and password combination
                const errorMsg = "Invalid email or password.";
                set({ loginError: errorMsg, isLoading: false, currentUser: null });
                return { success: false, error: errorMsg };
            }

            const userDoc = querySnapshot.docs[0];

            // Create the UserProfile object, excluding the password field for security
            // (Assuming the password field exists in the document data, but we don't want it in state)
            const { password, ...userDataWithoutPassword } = userDoc.data();
            const loggedInUserProfile: UserProfile = {
                id: userDoc.id, // Include the Firestore document ID
                ...userDataWithoutPassword
            } as UserProfile; // Type assertion

            // Update state: set currentUser, clear loading, clear error, maybe clear password input
            set({ currentUser: loggedInUserProfile, isLoading: false, loginError: null, passwordInput: '' });
            console.log("User 'logged in' via query:", loggedInUserProfile);

            return { success: true }; // Indicate successful login

        } catch (error: any) {
            // Handle any errors during the Firestore query operation
            console.error("Error during login query: ", error);
            const message = error.message || "An unexpected error occurred during login.";
            set({ loginError: message, isLoading: false, currentUser: null });
            return { success: false, error: message }; // Indicate failure with error message
        }
    },

    // Action to "logout" the user by clearing the currentUser state
    logout: () => {
        set({
            currentUser: null,
            emailInput: '', // Clear inputs on logout
            passwordInput: '',
            loginError: null // Clear errors on logout
        });
        console.log("User 'logged out'.");
    },

    // Action to clear login errors manually if needed (e.g., when inputs change)
    clearLoginError: () => set({ loginError: null }),
}));