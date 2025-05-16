import { useRouter } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccountModificationStore } from '@/constants/accountModificationStore';
import { useUserQueryLoginStore } from '@/constants/store';


const AccountChangeScreen = () => {
    const router = useRouter();

    const {
        newPasswordInput,
        newPhoneNumberInput,
        isUpdatingPassword,
        isUpdatingNumber,
        isDeletingAccount,
        updateError,
        deleteError,
        setNewPasswordInput,
        setNewPhoneNumberInput,
        updatePassword,
        updatePhoneNumber,
        deleteAccount,
        clearUpdateError,
        clearDeleteError,
        resetModificationForm,
    } = useAccountModificationStore();

     const { currentUser } = useUserQueryLoginStore();


    const handleUpdatePassword = async () => {
        clearUpdateError();
        if (!newPasswordInput.trim()) {
            Alert.alert("Validation Error", "New password cannot be empty.");
            return;
        }
        // Optional: Add more password validation (length, complexity) here

        const result = await updatePassword();
        if (result.success) {
            Alert.alert("Success", "Password updated successfully.");
            // No navigation needed, user stays on this screen
        } else if (result.error) {
             // Error is displayed by the UI Text element
        }
    };

    const handleUpdatePhoneNumber = async () => {
        clearUpdateError();
        if (!newPhoneNumberInput.trim()) {
            Alert.alert("Validation Error", "New phone number cannot be empty.");
            return;
        }
        // Optional: Add phone number format validation here

        const result = await updatePhoneNumber();
        if (result.success) {
            Alert.alert("Success", "Phone number updated successfully.");
             // No navigation needed
        } else if (result.error) {
             // Error is displayed by the UI Text element
        }
    };

    const handleDeleteAccount = async () => {
        clearDeleteError();

        Alert.alert(
            "Confirm Account Deletion",
            "Are you sure you want to delete your account? This action is irreversible.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const result = await deleteAccount();
                        if (result.success) {
                            Alert.alert("Success", "Account deleted successfully.");
                            // Navigate to login screen after deletion
                            router.replace('/login'); // Assuming '/login' is your login route
                        } else if (result.error) {
                            // Error is displayed by the UI Text element
                        }
                    }
                }
            ]
        );
    };

     // Clear form state when component unmounts
     React.useEffect(() => {
         return () => {
             resetModificationForm();
         };
     }, [resetModificationForm]);


    return (
        <SafeAreaView style={styles.safeArea}>
             <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
             >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Account Settings</Text>

                {/* Change Password Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Change Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        value={newPasswordInput}
                        onChangeText={setNewPasswordInput}
                        secureTextEntry
                        editable={!isUpdatingPassword && !isUpdatingNumber && !isDeletingAccount}
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleUpdatePassword}
                        disabled={isUpdatingPassword || isUpdatingNumber || isDeletingAccount}
                    >
                        {isUpdatingPassword ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                    {updateError && <Text style={styles.errorText}>{updateError}</Text>}
                </View>

                {/* Change Phone Number Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Change Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="New Phone Number"
                        value={newPhoneNumberInput}
                        onChangeText={setNewPhoneNumberInput}
                        keyboardType="phone-pad"
                        editable={!isUpdatingPassword && !isUpdatingNumber && !isDeletingAccount}
                    />
                     <TouchableOpacity
                        style={styles.button}
                        onPress={handleUpdatePhoneNumber}
                        disabled={isUpdatingPassword || isUpdatingNumber || isDeletingAccount}
                    >
                        {isUpdatingNumber ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Update Phone Number</Text>
                        )}
                    </TouchableOpacity>
                    {updateError && <Text style={styles.errorText}>{updateError}</Text>}
                </View>

                {/* Delete Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Delete Account</Text>
                     <TouchableOpacity
                        style={[styles.button, styles.deleteButton]}
                        onPress={handleDeleteAccount}
                        disabled={isDeletingAccount || isUpdatingPassword || isUpdatingNumber}
                    >
                        {isDeletingAccount ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete Account</Text>
                        )}
                    </TouchableOpacity>
                     {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}
                </View>

                 {/* Add spacing at the bottom */}
                 <View style={{ height: 40 }} />

            </ScrollView>
             </KeyboardAvoidingView>

             <View style={styles.backButtonContainer}>
                 <TouchableOpacity onPress={() => router.replace('../account_settings')}> {/* Adjust path to your profile screen */}
                     <Text style={styles.backButtonText}>Back</Text>
                 </TouchableOpacity>
             </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'white',
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    section: {
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 15,
        borderRadius: 5,
        fontSize: 16,
    },
    button: {
        backgroundColor: 'black',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: 'red',
        marginTop: 15,
    },
    deleteButtonText: {
        color: 'white',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 10,
        fontSize: 14,
    },
    backButtonContainer: {
         position: 'absolute',
         bottom: 20,
         right: 20,
     },
     backButtonText: {
         fontSize: 16,
     },
});

export default AccountChangeScreen;
