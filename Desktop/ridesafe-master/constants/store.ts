
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
    attemptLoginWithQuery: () => Promise<{ success: boolean; error?: string; role?: 'user' | 'mechanic'; id?: string  }>;
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
    set({ isLoading: true, loginError: null }); 
    const { emailInput, passwordInput } = get(); 

    if (!emailInput.trim() || !passwordInput.trim()) {
        // ... (validation error handling)
        const errorMsg = "Email and Password cannot be empty.";
        set({ loginError: errorMsg, isLoading: false });
        return { success: false, error: errorMsg };
    }

    try {
        let loggedInUserProfile: UserProfile | null = null;
        let accountRole: 'user' | 'mechanic' | undefined;
        let accountId: string | undefined;

        // 1. --- Check USERS Collection ---
        let q = query(
            collection(db, "users"),
            where("email", "==", emailInput.trim()),
            where("password", "==", passwordInput)
        );
        let querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const { password, ...userDataWithoutPassword } = userDoc.data();
            
            loggedInUserProfile = {
                id: userDoc.id, 
                ...userDataWithoutPassword
            } as UserProfile;
            
            // Assume the role is 'user' for this collection
            accountRole = 'user'; 
            accountId = userDoc.id;
        }

        // 2. --- Check MECHANICS Collection if User not found ---
        if (!loggedInUserProfile) {
            q = query(
                collection(db, "mechanics"),
                where("email", "==", emailInput.trim()),
                where("password", "==", passwordInput)
            );
            querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const mechanicDoc = querySnapshot.docs[0];
                const { password, ...mechanicDataWithoutPassword } = mechanicDoc.data();
                
                loggedInUserProfile = {
                    id: mechanicDoc.id, 
                    // Note: Ensure your UserProfile interface can handle mechanic fields
                    ...mechanicDataWithoutPassword
                } as UserProfile; 
                
                // Assume the role is 'mechanic' for this collection
                accountRole = 'mechanic';
                accountId = mechanicDoc.id;
            }
        }
        
        // --- Final Result Handling ---
        if (loggedInUserProfile && accountRole) {
            // Success: Update state and return role for navigation
            set({ 
                currentUser: loggedInUserProfile, 
                isLoading: false, 
                loginError: null, 
                passwordInput: '' 
            });
            console.log("Logged in successfully. Role:", accountRole);
            return { success: true, role: accountRole, id: accountId }; // 🎯 RETURN ROLE AND ID
        } else {
            // Failure: User not found in either collection
            const errorMsg = "Invalid email or password.";
            set({ loginError: errorMsg, isLoading: false, currentUser: null });
            return { success: false, error: errorMsg };
        }

    } catch (error: any) {
        // Handle any errors during the Firestore query operation
        console.error("Error during login query: ", error);
        const message = error.message || "An unexpected error occurred during login.";
        set({ loginError: message, isLoading: false, currentUser: null });
        return { success: false, error: message }; 
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