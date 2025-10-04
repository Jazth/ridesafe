
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
    
    setEmailInput: (email) => set({ emailInput: email, loginError: null }),
    setPasswordInput: (password) => set({ passwordInput: password, loginError: null }),
    attemptLoginWithQuery: async () => {
    set({ isLoading: true, loginError: null }); 
    const { emailInput, passwordInput } = get(); 

    if (!emailInput.trim() || !passwordInput.trim()) {
        const errorMsg = "Email and Password cannot be empty.";
        set({ loginError: errorMsg, isLoading: false });
        return { success: false, error: errorMsg };
    }

    try {
        let loggedInUserProfile: UserProfile | null = null;
        let accountRole: 'user' | 'mechanic' | undefined;
        let accountId: string | undefined;

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
            
            accountRole = 'user'; 
            accountId = userDoc.id;
        }
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
                    ...mechanicDataWithoutPassword
                } as UserProfile; 
                accountRole = 'mechanic';
                accountId = mechanicDoc.id;
            }
        }
        
        if (loggedInUserProfile && accountRole) {
            set({ 
                currentUser: loggedInUserProfile, 
                isLoading: false, 
                loginError: null, 
                passwordInput: '' 
            });
            console.log("Logged in successfully. Role:", accountRole);
            return { success: true, role: accountRole, id: accountId }; 
        } else {
            const errorMsg = "Invalid email or password.";
            set({ loginError: errorMsg, isLoading: false, currentUser: null });
            return { success: false, error: errorMsg };
        }

    } catch (error: any) {
        console.error("Error during login query: ", error);
        const message = error.message || "An unexpected error occurred during login.";
        set({ loginError: message, isLoading: false, currentUser: null });
        return { success: false, error: message }; 
    }
},
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