import { useMechanicRegistrationStore } from '@/constants/mechanicContactForm';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Provider as PaperProvider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function MechanicRegistrationScreen() {
  const {
    email,
    phoneNumber,
    password,
    isSaving,
    saveError,
    setEmail,
    setPhoneNumber,
    setPassword,
    saveMechanicRegistrationData,
    resetForm,
    setSaveError,
    businessName,
    setBusinessName,
    serviceArea,
    setServiceArea,
    licenseNumber,
    setLicenseNumber,
    firstName,
    lastName,
    setFirstName,
    setLastName,
  } = useMechanicRegistrationStore();

  const [businessLicenseFile, setBusinessLicenseFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [driversLicenseFile, setDriversLicenseFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [nbiClearanceFile, setNbiClearanceFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [otherCertFile, setOtherCertFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const validateEmail = (emailVal: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
  const validatePhoneNumber = (phNumber: string) => /^[0-9]{11}$/.test(phNumber);
  const validatePassword = (pw: string) => pw.length >= 6;
  const validateBusinessName = (name: string) => name.trim().length > 0;
  const validateServiceArea = (area: string) => area.trim().length > 0;
  const validateLicenseNumber = (num: string) => num.trim().length > 0;
  const validateName = (name: string) => name.trim().length > 0;

  const goLogin = () => router.replace('../login');

  const pickDocument = async (
    setter: (file: DocumentPicker.DocumentPickerAsset) => void
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setter(file);
      }
    } catch (error) {
      console.error('Document pick error:', error);
    }
  };

  const handleSubmit = async () => {
    if (saveError) setSaveError(null);

    // Validate all fields and files
    if (
      !validateName(firstName) ||
      !validateName(lastName) ||
      !validateEmail(email) ||
      !validatePhoneNumber(phoneNumber) ||
      !validatePassword(password) ||
      !validateBusinessName(businessName) ||
      !validateServiceArea(serviceArea) ||
      !validateLicenseNumber(licenseNumber) ||
      !businessLicenseFile ||
      !driversLicenseFile ||
      !nbiClearanceFile
    ) {
      Alert.alert(
        'Validation Error',
        'Please fill all fields correctly including name and upload the required documents.'
      );
      return;
    }

    const filesToUpload = {
      businessLicense: {
        uri: businessLicenseFile.uri,
        name: businessLicenseFile.name || 'businessLicense',
      },
      driversLicense: {
        uri: driversLicenseFile.uri,
        name: driversLicenseFile.name || 'driversLicense',
      },
      nbiClearance: {
        uri: nbiClearanceFile.uri,
        name: nbiClearanceFile.name || 'nbiClearance',
      },
      otherCertificate: otherCertFile
        ? {
            uri: otherCertFile.uri,
            name: otherCertFile.name || 'otherCert',
          }
        : null,
    };

    const mechanicData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      businessName,
      serviceArea,
      licenseNumber,
    };

    const result = await saveMechanicRegistrationData(
      mechanicData,
      filesToUpload.businessLicense,
      filesToUpload.driversLicense,
      filesToUpload.nbiClearance,
      filesToUpload.otherCertificate
    );

    if (result.success) {
      Alert.alert('Success!', 'Your mechanic account has been registered. Please log in.');
      resetForm();
      router.replace('/login');
    } else if (result.error) {
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

  return (
    <PaperProvider theme={customTheme}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cont}>
            <Text style={styles.header}>Mechanic Sign-Up</Text>
            <Text style={styles.subheader}>Join our team to start fixing breakdowns.</Text>

            <View style={styles.contInput}>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                label="First Name"
                outlineStyle={styles.inputOutline}
                textColor="black"
                disabled={isSaving}
              />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                label="Last Name"
                outlineStyle={styles.inputOutline}
                textColor="black"
                disabled={isSaving}
              />
              <TextInput
                style={styles.input}
                value={email}
                label="Email"
                onChangeText={setEmail}
                mode="outlined"
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
                mode="outlined"
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
                mode="outlined"
                label="Password"
                outlineStyle={styles.inputOutline}
                textColor="black"
                secureTextEntry
                disabled={isSaving}
              />
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                mode="outlined"
                label="Business Name"
                outlineStyle={styles.inputOutline}
                textColor="black"
                disabled={isSaving}
              />
              <TextInput
                style={styles.input}
                value={serviceArea}
                onChangeText={setServiceArea}
                mode="outlined"
                label="Service Area / Address"
                outlineStyle={styles.inputOutline}
                textColor="black"
                disabled={isSaving}
                placeholder='ex: 123 Sampaguita St., Barangay 45, Sampaloc, Manila, 1008, Philippines' placeholderTextColor={'gray'}
              />
              <TextInput
                style={styles.input}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                mode="outlined"
                label="License Number"
                outlineStyle={styles.inputOutline}
                textColor="black"
                disabled={isSaving}
                placeholder='ex: MP-2025-12345' placeholderTextColor={'gray'}
              />

              <Button
                mode="outlined"
                onPress={() => pickDocument(setBusinessLicenseFile)}
                disabled={isSaving}
                style={{ marginTop: 10 }}
              >
                {businessLicenseFile
                  ? `Business License: ${businessLicenseFile.name}`
                  : 'Upload Business License *'}
              </Button>

              <Button
                mode="outlined"
                onPress={() => pickDocument(setDriversLicenseFile)}
                disabled={isSaving}
                style={{ marginTop: 10 }}
              >
                {driversLicenseFile
                  ? `Driver's License: ${driversLicenseFile.name}`
                  : "Upload Driver's License *"}
              </Button>

              <Button
                mode="outlined"
                onPress={() => pickDocument(setNbiClearanceFile)}
                disabled={isSaving}
                style={{ marginTop: 10 }}
              >
                {nbiClearanceFile
                  ? `NBI Clearance: ${nbiClearanceFile.name}`
                  : 'Upload NBI Clearance *'}
              </Button>

              <Button
                mode="outlined"
                onPress={() => pickDocument(setOtherCertFile)}
                disabled={isSaving}
                style={{ marginTop: 10 }}
              >
                {otherCertFile
                  ? `Other Certificate: ${otherCertFile.name}`
                  : 'Upload Other Certificate (Optional)'}
              </Button>

              {saveError && <Text style={styles.errorText}>{saveError}</Text>}

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitBtnText}>Register as Mechanic</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.backButtonContainerBottom}>
          <TouchableOpacity onPress={goLogin}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollViewContent: {
    paddingBottom: 120,
    alignItems: 'center',
  },
  cont: {
    justifyContent: 'center',
    alignItems: 'center',
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
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 250,
    marginTop: 20,
    height: 50,
    backgroundColor: 'black',
    borderRadius: 8,
  },
  backButtonContainerBottom: {
    position: 'absolute',
    bottom: 40,
    left: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    fontSize: 14,
  },
});
