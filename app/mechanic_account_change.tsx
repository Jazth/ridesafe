import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccountModificationStore } from '@/constants/accountModificationStore';
import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { db } from '@/scripts/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const MechanicChange = () => {
    const router = useRouter();

    const { currentUser } = useUserQueryLoginStore();
    const { userInfo, setUserInfo } = useUserProfileStore();

    // Local state for editable fields
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [serviceArea, setServiceArea] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');

    // Password update is handled separately, keep your existing password change logic
    const {
        newPasswordInput,
        isUpdatingPassword,
        updateError,
        setNewPasswordInput,
        updatePassword,
        clearUpdateError,
    } = useAccountModificationStore();

    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    useEffect(() => {
        if (userInfo) {
            setEmail(userInfo.email || '');
            setPhoneNumber(userInfo.phoneNumber || '');
            setBusinessName(userInfo.businessName || '');
            setServiceArea(userInfo.serviceArea || '');
            setLicenseNumber(userInfo.licenseNumber || '');
        }
    }, [userInfo]);

    const handleUpdateProfile = async () => {
        clearUpdateError();

        if (!email.trim()) {
            Alert.alert('Validation Error', 'Email cannot be empty.');
            return;
        }
        if (!phoneNumber.trim()) {
            Alert.alert('Validation Error', 'Phone number cannot be empty.');
            return;
        }
        // Add more validation as needed

        setIsUpdatingProfile(true);

        try {
            const collectionName = currentUser.role === 'mechanic' ? 'mechanics' : 'users';
            const docRef = doc(db, collectionName, currentUser.id);

            await updateDoc(docRef, {
                email,
                phoneNumber,
                businessName,
                serviceArea,
                licenseNumber,
            });

            // Update local userInfo state to reflect changes immediately
            setUserInfo({
                ...userInfo,
                email,
                phoneNumber,
                businessName,
                serviceArea,
                licenseNumber,
            });

            Alert.alert('Success', 'Profile updated successfully.');
            router.replace('/mechanic_settings'); 
        } catch (error) {
            console.error('Update failed:', error);
            Alert.alert('Update Failed', 'There was a problem updating your profile.');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // Password update handler example
    const handleUpdatePassword = async () => {
        clearUpdateError();
        if (!newPasswordInput.trim()) {
            Alert.alert('Validation Error', 'New password cannot be empty.');
            return;
        }
        const result = await updatePassword();
        if (result.success) {
            Alert.alert('Success', 'Password updated successfully.');
            setNewPasswordInput('');
        } else if (result.error) {
            Alert.alert('Error', result.error);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingContainer}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.header}>Edit Profile</Text>

                    {/* Editable Profile Fields */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isUpdatingProfile && !isUpdatingPassword}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            editable={!isUpdatingProfile && !isUpdatingPassword}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Business Name</Text>
                        <TextInput
                            style={styles.input}
                            value={businessName}
                            onChangeText={setBusinessName}
                            editable={!isUpdatingProfile && !isUpdatingPassword}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Service Area</Text>
                        <TextInput
                            style={styles.input}
                            value={serviceArea}
                            onChangeText={setServiceArea}
                            editable={!isUpdatingProfile && !isUpdatingPassword}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>License Number</Text>
                        <TextInput
                            style={styles.input}
                            value={licenseNumber}
                            onChangeText={setLicenseNumber}
                            editable={!isUpdatingProfile && !isUpdatingPassword}
                        />
                    </View>

                    {/* Password Change Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>Change Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="New Password"
                            value={newPasswordInput}
                            onChangeText={setNewPasswordInput}
                            secureTextEntry
                            editable={!isUpdatingPassword && !isUpdatingProfile}
                        />
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleUpdatePassword}
                            disabled={isUpdatingPassword || isUpdatingProfile}
                        >
                            {isUpdatingPassword ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Submit Updated Profile */}
                    <TouchableOpacity
                        style={[styles.button, styles.saveButton]}
                        onPress={handleUpdateProfile}
                        disabled={isUpdatingProfile || isUpdatingPassword}
                    >
                        {isUpdatingProfile ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Save Profile</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.backButtonContainer}>
                <TouchableOpacity onPress={() => router.replace('/mechanic_settings')}>
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
        marginBottom: 25,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        borderRadius: 5,
        fontSize: 16,
        color: 'black'
    },
    button: {
        backgroundColor: 'black',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButtonContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
    },
});

export default MechanicChange;
