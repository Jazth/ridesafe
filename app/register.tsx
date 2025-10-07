import { useRegistrationFormStore } from '@/constants/contactFormStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Provider as PaperProvider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function RegistrationFormScreen() {
    const {
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        isSaving,
        saveError,
        setFirstName,
        setLastName,
        setEmail,
        setPhoneNumber,
        setPassword,
        saveRegistrationData,
        resetForm,
        setSaveError
    } = useRegistrationFormStore();

    // Validation functions
    const validateEmail = (emailVal: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailVal);
    };

    const validateNames = (name: string): boolean => {
        const nameRegex = /^[a-zA-Z\s-]+$/;
        return nameRegex.test(name);
    };

    const validatePhoneNumber = (phNumber: string): boolean => {
        const phoneRegex = /^[0-9]{11}$/; // Adjust regex as needed for your specific phone number format
        return phoneRegex.test(phNumber);
    };

    const validatePassword = (pw: string): boolean => {
        return pw.length >= 6;
    };
     const goLogin = () => {
            router.replace('../login');
        }

    const handleSubmit = async () => {
        if (saveError) {
            setSaveError(null); // Clear previous error
        }

        // Perform validation checks
        if (!validateNames(firstName)) {
            Alert.alert('Validation Error', 'First name should only contain alphabets, spaces, or hyphens.');
            return;
        }
        if (!validateNames(lastName)) {
            Alert.alert('Validation Error', 'Last name should only contain alphabets, spaces, or hyphens.');
            return;
        }
        if (!validateEmail(email)) {
            Alert.alert('Validation Error', 'Please enter a valid email address.');
            return;
        }
        if (!validatePhoneNumber(phoneNumber)) {
            Alert.alert('Validation Error', 'Phone number must be valid (e.g., 11 digits).');
            return;
        }
         if (!validatePassword(password)) {
            Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
            return;
        }

       
        // Call saveRegistrationData from the store
        const result = await saveRegistrationData();

        // Handle the result of the save operation
        if (result.success) {
            // Display success message and reset form
            resetForm(); // Reset the form after successful save
            // Navigate back to login or elsewhere after successful registration
            router.replace('/login'); // Assuming '/login' is the route name for your LoginScreen
        } else if (result.error) {
            // Display the error message from the store
            Alert.alert('Registration Failed', result.error);
        }
    };

    const customTheme = {
        colors: {
            text: 'black',
            primary: 'black',
            onSurfaceVariant: 'black',
            outlineVariant: 'black',
        },
    };

     const registerAsMechanic = () => {
            router.replace('/mechanicRegister');
        }

    return (
        <PaperProvider theme={customTheme}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.cont}>
     
                    <Text style={styles.header}>Breakdown?</Text>
                    <Text style={styles.subheader}>We've got a mechanic ready to roll to you.</Text>
                    <View style={styles.contInput}>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            label="First name"
                            onChangeText={setFirstName}
                            mode="outlined"
                            outlineStyle={styles.inputOutline}
                            textColor="black"
                            disabled={isSaving}
                        />
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            mode='outlined'
                            label="Last name"
                            outlineStyle={styles.inputOutline}
                            textColor="black"
                            disabled={isSaving}
                        />
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            mode='outlined'
                            label="Email"
                            outlineStyle={styles.inputOutline}
                            textColor="black"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            disabled={isSaving}
                        />
                        <TextInput
                            style={styles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            mode='outlined'
                            label="Phone Number"
                            outlineStyle={styles.inputOutline}
                            textColor="black"
                            keyboardType="number-pad"
                            disabled={isSaving}
                        />
                         <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            mode='outlined'
                            label="Password"
                            outlineStyle={styles.inputOutline}
                            textColor="black"
                            secureTextEntry
                            disabled={isSaving}
                        />


                        {saveError && (
                            <Text style={styles.errorText}>{saveError}</Text>
                        )}

                        <View>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleSubmit}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Register</Text>
                                )}
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.mechanicText}
                                onPress={registerAsMechanic}
                            >
                            <Text style={styles.mechanicBtnText}>register as a mechanic</Text>
                             
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                 <View style={styles.backButtonContainerBottom}>
                     <TouchableOpacity onPress={goLogin} style={styles.backButtonContainerBottom}>
                                <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                 </View>
            </SafeAreaView>
        </PaperProvider>
    );
}

// Styles
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'white',
        flexDirection: 'column',
    },
    cont: {
        justifyContent: 'center',
    },
     header: {
        fontSize: 50,
        marginLeft: 20,
        fontWeight: 'bold',
        marginTop: 50,
        color: 'black',
    },
    subheader: {
        fontSize: 15,
        marginLeft: 23,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 40,
    },
    input: {
        width: 350,
        height: 50,
        marginBottom: 10,
        fontSize: 15,
        backgroundColor: 'white',
    },
    inputOutline: {
        borderColor: 'black',
        borderWidth: 2,
    },
    contInput: {
        marginTop: 40,
        gap: 10,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
    },
    submitBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 200,
        height: 45,
        backgroundColor: 'black',
        borderRadius: 25,
        marginTop: 30,
    },
    errorText: {
        color: 'red',
        marginTop: 10,
        textAlign: 'center',
        width: '90%',
        alignSelf: 'center',
    },
    backButtonContainerBottom: {
         position: 'absolute', 
         bottom: 20, 
         right: 20, 
         flexDirection: 'row'
     },
    backButtonTextBottom: { 
         fontSize: 16,
     },
    mechanicText: {
         marginTop: 24,
         alignSelf: 'center',   
    },
    mechanicBtnText: {
        fontSize: 16,
        color: '#FF5722', 
        textAlign: 'center',
        paddingVertical: 4,
        fontWeight: 'bold',
    },

});
