import { useRegistrationFormStore } from '@/constants/contactFormStore';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button as PaperButton, Checkbox, Provider as PaperProvider, Text, TextInput } from 'react-native-paper';
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

    // 1. T&C State Management
    const [termsChecked, setTermsChecked] = useState(false);
    const [termsError, setTermsError] = useState('');
    const [modalVisible, setModalVisible] = useState(false);

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
        setTermsError(''); // Clear previous T&C error

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
        
        // 3. T&C Validation Check
        if (!termsChecked) {
            setTermsError('You must agree to the Terms and Conditions to register.');
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
                {/* Use ScrollView to prevent keyboard covering inputs */}
                <ScrollView contentContainerStyle={styles.scrollViewContent}> 
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

                            {/* 2. Terms & Conditions UI */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                                <Checkbox 
                                    status={termsChecked ? 'checked' : 'unchecked'} 
                                    onPress={() => {
                                        setTermsChecked(!termsChecked);
                                        // Clear error when user interacts with the checkbox
                                        if (termsError) setTermsError(''); 
                                    }} 
                                    color="black" // Use a visible color
                                />
                                <Text 
                                    onPress={() => setModalVisible(true)} 
                                    style={{ color: 'blue', textDecorationLine: 'underline', fontSize: 14 }}
                                >
                                    I agree to the Terms and Conditions
                                </Text>
                            </View>
                            {termsError ? <Text style={styles.errorText}>{termsError}</Text> : null}
                            {/* End T&C UI */}

                            <View style={styles.buttonContainer}>
                        {/* Main Register Button */}
                        <TouchableOpacity
                            style={[styles.registerBtn, { opacity: termsChecked && !isSaving ? 1 : 0.5 }]}
                            onPress={handleSubmit}
                            disabled={isSaving || !termsChecked}
                            activeOpacity={0.8}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.registerBtnText}>Register</Text>
                            )}
                        </TouchableOpacity>

                        {/* Secondary Mechanic Button */}
                        <TouchableOpacity
                            style={styles.mechanicBtn}
                            onPress={registerAsMechanic}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="construct-outline" size={18} color="#FF5722" style={{ marginRight: 8 }} />
                            <Text style={styles.mechanicBtnText}>Register as a Mechanic</Text>
                        </TouchableOpacity>
                    </View>

                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* 2. T&C Modal */}
            <Modal animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Terms and Conditions</Text>
                        <PaperButton mode="text" onPress={() => setModalVisible(false)}>Close</PaperButton>
                    </View>
                    <ScrollView style={{ padding: 20 }}>
                        <Text style={{ fontSize: 14, lineHeight: 22 }}>
{`RideSafe (“the Platform,” “we,” “our,” or “us”) operates solely as a technological intermediary that connects motorcycle users experiencing mechanical breakdowns (“Users”) with independent mechanics (“Service Providers”). The Platform’s function is strictly limited to facilitating the exchange of contact and service information between Users and Service Providers.

RideSafe does not provide, supervise, manage, or control any mechanical repair or roadside assistance services. All services rendered following a connection established through the Platform are performed exclusively by independent Service Providers who are not employees, agents, or representatives of RideSafe. Accordingly, RideSafe shall not be held responsible or liable for any acts, omissions, representations, quality of service, timeliness, pricing, or any other aspect of the work performed by Service Providers.

All communications, negotiations, payments, and service arrangements are conducted directly between the User and the Service Provider. RideSafe neither determines nor influences service fees, repair costs, methods, or outcomes. Users acknowledge and agree that any disputes, claims, or damages arising out of or relating to the performance or non-performance of services shall be resolved solely between the User and the Service Provider.

RideSafe may collect feedback and performance ratings from both Users and Service Providers for the purpose of improving the functionality and user experience of the Platform. However, the collection of such feedback does not constitute oversight, endorsement, or quality assurance of any Service Provider.

By accessing or using the RideSafe Platform, Users expressly acknowledge and agree that RideSafe bears no liability, direct or indirect, for any injury, loss, damage, expense, or dissatisfaction arising from or in connection with any service, transaction, or communication conducted outside of the Platform. RideSafe’s obligations are limited exclusively to providing a digital means of connection between Users and Service Providers.

Disclaimer of Warranties

The RideSafe Platform and all related services are provided on an “as is” and “as available” basis, without any warranties or representations of any kind, whether express, implied, or statutory. RideSafe expressly disclaims all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, reliability, availability, accuracy, completeness, timeliness, non-infringement, or that the Platform will be error-free, secure, or uninterrupted.

RideSafe makes no warranty or representation regarding the quality, safety, reliability, or suitability of any Service Provider or the services they may offer. The Platform does not guarantee that any User will be successfully connected with a Service Provider, that a Service Provider will be available at any particular time, or that any services provided will meet the User’s expectations or requirements.

Users acknowledge that any reliance on the information, profiles, or communications provided through the Platform is done entirely at their own risk. RideSafe does not verify the background, qualifications, certifications, or competencies of any Service Provider listed or contacted through the Platform. Users are solely responsible for conducting any due diligence they deem necessary prior to engaging a Service Provider.

To the maximum extent permitted by applicable law, RideSafe disclaims any and all liability for any loss, damage, injury, or claim arising from (a) the use of or inability to use the Platform, (b) any service or repair performed by a Service Provider, (c) any transaction, communication, or arrangement made between Users and Service Providers, and (d) any unauthorized access to or alteration of User data.

By using the RideSafe Platform, Users expressly agree that they do so voluntarily and at their own risk, and that RideSafe provides no guarantee as to the outcome, safety, or quality of any mechanical services arranged through the Platform.`}
                        </Text>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <View style={styles.backButtonContainerBottom}>
                <TouchableOpacity onPress={goLogin} style={styles.backButtonContainerBottom}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
            </View>
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
    scrollViewContent: {
        paddingTop: 0,
        paddingBottom: 100, // Increased padding to ensure all content is visible above the back button
        alignItems: 'center',
    },
    cont: {
        justifyContent: 'center',
        width: '100%',
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
   buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 14,
},

registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 45,
    backgroundColor: 'black',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
},

registerBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
},

mechanicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 45,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FF5722',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
},

mechanicBtnText: {
    color: '#FF5722',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
},


});