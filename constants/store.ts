import { zustandSecureStore } from '@/constants/secureStore';
import { db } from '@/scripts/firebaseConfig';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type UserRole = 'user' | 'mechanic';

export interface UserProfile {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    createdAt?: Timestamp;
    [key: string]: any;
}

interface UserQueryLoginState {
    emailInput: string;
    passwordInput: string;
    currentUser: UserProfile | null;
    isLoading: boolean;
    loginError: string | null;
}

interface UserQueryLoginActions {
    setEmailInput: (email: string) => void;
    setPasswordInput: (password: string) => void;
    attemptLoginWithQuery: () => Promise<{ success: boolean; error?: string; role?: UserRole; id?: string }>;
    logout: () => void;
    clearLoginError: () => void;
}

type UserQueryLoginStore = UserQueryLoginState & UserQueryLoginActions;

export const useUserQueryLoginStore = create<UserQueryLoginStore>()(
    persist(
        (set, get) => ({
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
                    let accountRole: UserRole | undefined;
                    let accountId: string | undefined;

                    // Check users collection
                    let q = query(
                        collection(db, "users"),
                        where("email", "==", emailInput.trim()),
                        where("password", "==", passwordInput)
                    );
                    let querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userDoc = querySnapshot.docs[0];
                        const { password, ...userDataWithoutPassword } = userDoc.data();
                        accountRole = 'user';
                        loggedInUserProfile = {
                            id: userDoc.id,
                            role: accountRole,
                            ...userDataWithoutPassword
                        } as UserProfile;
                        accountId = userDoc.id;
                    }

                    // Check mechanics collection if not found in users
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
                            accountRole = 'mechanic';
                            loggedInUserProfile = {
                                id: mechanicDoc.id,
                                role: accountRole,
                                ...mechanicDataWithoutPassword
                            } as UserProfile;
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
                    emailInput: '',
                    passwordInput: '',
                    loginError: null
                });
            },

            clearLoginError: () => set({ loginError: null }),
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => zustandSecureStore), // ✅ using SecureStore here
            partialize: (state) => ({
                currentUser: state.currentUser,
            }),
        }
    )
);
