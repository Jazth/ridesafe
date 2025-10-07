import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { useVehicleFormStore } from '@/constants/vehicleFormStore';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const VehicleRegistrationScreen = () => {
    const router = useRouter();

    const {
        year,
        make,
        model,
        transmission,
        isSaving,
        saveError,
        setYear,
        setMake,
        setModel,
        setTransmission,
        saveVehicle,
        resetForm,
        setSaveError
    } = useVehicleFormStore();

    const { currentUser } = useUserQueryLoginStore();
    const { fetchUserProfileData } = useUserProfileStore();


    const validateForm = () => {
        if (!year.trim() || !make.trim() || !model.trim() || !transmission) {
            Alert.alert('Validation Error', 'Please fill in all fields.');
            return false;
        }

        if (!/^\d+$/.test(year.trim())) {
            Alert.alert('Validation Error', 'Year should contain only numbers.');
            return false;
        }
        const currentYear = new Date().getFullYear();
        const inputYear = parseInt(year.trim(), 10);
         if (inputYear < 1900 || inputYear > currentYear + 1) {
             Alert.alert('Validation Error', `Please enter a valid year`);
             return false;
         }


        if (!/^[a-zA-Z\s-]+$/.test(make.trim())) {
            Alert.alert('Validation Error', 'Make should contain only letters, spaces, or hyphens.');
            return false;
        }

        if (!/^[a-zA-Z0-9\s-]+$/.test(model.trim())) {
            Alert.alert('Validation Error', 'Model should contain only letters, numbers, spaces, or hyphens.');
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (saveError) {
            setSaveError(null);
        }

        if (!validateForm()) {
            return;
        }

        const result = await saveVehicle();

        if (result.success) {
            Alert.alert('Success', 'Vehicle saved successfully!');
            resetForm();

            if (currentUser?.id) {
                fetchUserProfileData(currentUser.id);
            } else {
                 console.warn("Cannot refresh profile data: No current user ID found.");
            }

            router.back();
        } else if (result.error) {
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
             <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
             >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.header}>Register Vehicle</Text>

                <Text style={styles.label}>Year</Text>
                <TextInput
                    style={styles.input}
                    value={year}
                    onChangeText={setYear}
                    keyboardType="number-pad"
                    placeholder="e.g., 2023"
                    editable={!isSaving}
                />

                <Text style={styles.label}>Make</Text>
                <TextInput
                    style={styles.input}
                    value={make}
                    onChangeText={setMake}
                    placeholder="e.g., Toyota"
                    editable={!isSaving}
                />

                <Text style={styles.label}>Model</Text>
                <TextInput
                    style={styles.input}
                    value={model}
                    onChangeText={setModel}
                    placeholder="e.g., Camry"
                    editable={!isSaving}
                />

                <Text style={styles.label}>Transmission</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                         selectedValue={transmission}
                         onValueChange={(itemValue) => setTransmission(itemValue as 'manual' | 'automatic' | '')}
                         style={styles.picker}
                         enabled={!isSaving}
                    >
                        <Picker.Item label="Select Transmission" value="" />
                        <Picker.Item label="Manual" value="manual" />
                        <Picker.Item label="Automatic" value="automatic" />
                    </Picker>
                </View>

                {saveError && (
                    <Text style={styles.errorText}>{saveError}</Text>
                )}

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>Save Vehicle</Text>
                    )}
                </TouchableOpacity>

                 <View style={{ height: 40 }} />

            </ScrollView>
             </KeyboardAvoidingView>
             <View style={styles.backButtonContainer}>
                 <TouchableOpacity onPress={() => router.replace('../account_settings')}>
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
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 20,
        borderRadius: 5,
        fontSize: 16,
    },
     pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 20,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
        color: 'black',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: '#FF5722',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
     backButtonContainer: {
         position: 'absolute', // Position it absolutely
         bottom: 20, // 20px from the bottom
         right: 20, // 20px from the right
     },
     backButtonText: {
         fontSize: 16,
         color: 'black',
         marginBottom: 5,
     },
});

export default VehicleRegistrationScreen;
