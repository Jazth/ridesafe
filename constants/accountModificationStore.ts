import { db } from '@/scripts/firebaseConfig';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';

import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';

interface AccountModificationState {
    newPasswordInput: string;
    newPhoneNumberInput: string;

    isUpdatingPassword: boolean;
    isUpdatingNumber: boolean;
    isDeletingAccount: boolean;

    updateError: string | null;
    deleteError: string | null;
}

interface AccountModificationActions {
    setNewPasswordInput: (password: string) => void;
    setNewPhoneNumberInput: (number: string) => void;

    updatePassword: () => Promise<{ success: boolean; error?: string }>;
    updatePhoneNumber: () => Promise<{ success: boolean; error?: string }>;
    deleteAccount: () => Promise<{ success: boolean; error?: string }>;

    clearUpdateError: () => void;
    clearDeleteError: () => void;
    resetModificationForm: () => void;
}

type AccountModificationStore = AccountModificationState & AccountModificationActions;

export const useAccountModificationStore = create<AccountModificationStore>((set, get) => ({
    newPasswordInput: '',
    newPhoneNumberInput: '',

    isUpdatingPassword: false,
    isUpdatingNumber: false,
    isDeletingAccount: false,

    updateError: null,
    deleteError: null,

    setNewPasswordInput: (password) => set({ newPasswordInput: password, updateError: null }),
    setNewPhoneNumberInput: (number) => set({ newPhoneNumberInput: number, updateError: null }),

    clearUpdateError: () => set({ updateError: null }),
    clearDeleteError: () => set({ deleteError: null }),

    resetModificationForm: () => set({
        newPasswordInput: '',
        newPhoneNumberInput: '',
        isUpdatingPassword: false,
        isUpdatingNumber: false,
        isDeletingAccount: false,
        updateError: null,
        deleteError: null,
    }),

    updatePassword: async () => {
        set({ isUpdatingPassword: true, updateError: null });
        const { newPasswordInput } = get();
        const currentUser = useUserQueryLoginStore.getState().currentUser;

        if (!currentUser?.id) {
            const errorMsg = "No logged in user found.";
            set({ updateError: errorMsg, isUpdatingPassword: false });
            return { success: false, error: errorMsg };
        }

        if (!newPasswordInput.trim()) {
             const errorMsg = "New password cannot be empty.";
             set({ updateError: errorMsg, isUpdatingPassword: false });
             return { success: false, error: errorMsg };
        }

        // IMPORTANT SECURITY WARNING: Updating password directly in Firestore is INSECURE.
        // This should be done via a trusted server that hashes the password.
        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            await updateDoc(userDocRef, { password: newPasswordInput }); // Updating plain text password

            console.log(`Password updated for user ${currentUser.id}`);
            set({ isUpdatingPassword: false, newPasswordInput: '' });
            return { success: true };

        } catch (error: any) {
            console.error("Error updating password:", error);
            const message = error.message || "Failed to update password.";
            set({ updateError: message, isUpdatingPassword: false });
            return { success: false, error: message };
        }
    },

    updatePhoneNumber: async () => {
        set({ isUpdatingNumber: true, updateError: null });
        const { newPhoneNumberInput } = get();
        const currentUser = useUserQueryLoginStore.getState().currentUser;

        if (!currentUser?.id) {
            const errorMsg = "No logged in user found.";
            set({ updateError: errorMsg, isUpdatingNumber: false });
            return { success: false, error: errorMsg };
        }

         if (!newPhoneNumberInput.trim()) {
             const errorMsg = "New phone number cannot be empty.";
             set({ updateError: errorMsg, isUpdatingNumber: false });
             return { success: false, error: errorMsg };
        }

        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            await updateDoc(userDocRef, { phoneNumber: newPhoneNumberInput });

            console.log(`Phone number updated for user ${currentUser.id}`);
            set({ isUpdatingNumber: false, newPhoneNumberInput: '' });

            useUserProfileStore.getState().fetchUserProfileData(currentUser.id);

            return { success: true };

        } catch (error: any) {
            console.error("Error updating phone number:", error);
            const message = error.message || "Failed to update phone number.";
            set({ updateError: message, isUpdatingNumber: false });
            return { success: false, error: message };
        }
    },

    deleteAccount: async () => {
        set({ isDeletingAccount: true, deleteError: null });
        const currentUser = useUserQueryLoginStore.getState().currentUser;
        const clearProfileState = useUserProfileStore.getState().clearProfileState;
        const logout = useUserQueryLoginStore.getState().logout;


        if (!currentUser?.id) {
            const errorMsg = "No logged in user found.";
            set({ deleteError: errorMsg, isDeletingAccount: false });
            return { success: false, error: errorMsg };
        }

        // IMPORTANT SECURITY WARNING: Deleting account directly from client is INSECURE.
        // This should be done via a trusted server after re-authentication.
        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            await deleteDoc(userDocRef);

            console.log(`Account deleted for user ${currentUser.id}`);

            // Clear relevant state in other stores and log out
            clearProfileState();
            logout();

            set({ isDeletingAccount: false });
            return { success: true };

        } catch (error: any) {
            console.error("Error deleting account:", error);
            const message = error.message || "Failed to delete account.";
            set({ deleteError: message, isDeletingAccount: false });
            return { success: false, error: message };
        }
    },
}));
