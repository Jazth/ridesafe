  import { useMechanicRegistrationStore } from '@/constants/mechanicContactForm';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Checkbox, Provider as PaperProvider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

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

    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phoneNumberError, setPhoneNumberError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [businessNameError, setBusinessNameError] = useState('');
    const [serviceAreaError, setServiceAreaError] = useState('');
    const [licenseNumberError, setLicenseNumberError] = useState('');

    const [termsChecked, setTermsChecked] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const validatePhone = (val: string) => /^[0-9]{11}$/.test(val);
    const validatePassword = (val: string) => val.length >= 8;
    const validateRequired = (val: string) => val.trim().length > 0;

    const goLogin = () => router.replace('../login');

    const pickDocument = async (setter: (file: DocumentPicker.DocumentPickerAsset) => void) => {
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setter(result.assets[0]);
        }
      } catch (error) {
        console.error('Document pick error:', error);
      }
    };

    const handleSubmit = async () => {
      if (!termsChecked) {
        Alert.alert('Terms & Conditions', 'You must agree to the Terms and Conditions before registering.');
        return;
      }

      // Reset previous errors
      setFirstNameError('');
      setLastNameError('');
      setEmailError('');
      setPhoneNumberError('');
      setPasswordError('');
      setBusinessNameError('');
      setServiceAreaError('');
      setLicenseNumberError('');
      if (saveError) setSaveError(null);

      // Validation
      let valid = true;

      if (!validateRequired(firstName)) { setFirstNameError('First Name is required'); valid = false; }
      if (!validateRequired(lastName)) { setLastNameError('Last Name is required'); valid = false; }
      if (!validateEmail(email)) { setEmailError('Invalid email address'); valid = false; }
      if (!validatePhone(phoneNumber)) { setPhoneNumberError('Phone must be exactly 11 digits'); valid = false; }
      if (!validatePassword(password)) { setPasswordError('Password must be at least 8 characters'); valid = false; }
      if (!validateRequired(businessName)) { setBusinessNameError('Business Name is required'); valid = false; }
      if (!validateRequired(serviceArea)) { setServiceAreaError('Service Area is required'); valid = false; }
      if (!validateRequired(licenseNumber)) { setLicenseNumberError('License Number is required'); valid = false; }
      if (!businessLicenseFile || !driversLicenseFile || !nbiClearanceFile) {
        Alert.alert('Validation Error', 'Please upload all required documents.');
        valid = false;
      }

      if (!valid) return;

      const filesToUpload = {
        businessLicense: { uri: businessLicenseFile!.uri, name: businessLicenseFile!.name || 'businessLicense' },
        driversLicense: { uri: driversLicenseFile!.uri, name: driversLicenseFile!.name || 'driversLicense' },
        nbiClearance: { uri: nbiClearanceFile!.uri, name: nbiClearanceFile!.name || 'nbiClearance' },
        otherCertificate: otherCertFile ? { uri: otherCertFile.uri, name: otherCertFile.name || 'otherCert' } : null,
      };

      const mechanicData = { firstName, lastName, email, phoneNumber, password, businessName, serviceArea, licenseNumber };

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

    const customTheme = { colors: { text: 'black', primary: 'black', onSurfaceVariant: 'black', outlineVariant: 'black' } };

    return (
      <PaperProvider theme={customTheme}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.cont}>
              <Text style={styles.header}>Mechanic Sign-Up</Text>
              <Text style={styles.subheader}>Join our team to start fixing breakdowns.</Text>

              <View style={styles.contInput}>
                {/* Inputs */}
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} label="First Name" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" disabled={isSaving} />
                {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}

                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} label="Last Name" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" disabled={isSaving} />
                {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}

                <TextInput style={styles.input} value={email} onChangeText={setEmail} label="Email" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" keyboardType="email-address" autoCapitalize="none" disabled={isSaving} />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} label="Phone Number" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" keyboardType="number-pad" placeholder="09691234567" placeholderTextColor="gray" disabled={isSaving} />
                {phoneNumberError ? <Text style={styles.errorText}>{phoneNumberError}</Text> : null}

                <TextInput style={styles.input} value={password} onChangeText={setPassword} label="Password" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" secureTextEntry disabled={isSaving} />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} label="Business Name" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" disabled={isSaving} />
                {businessNameError ? <Text style={styles.errorText}>{businessNameError}</Text> : null}

                <TextInput style={styles.input} value={serviceArea} onChangeText={setServiceArea} label="Service Area / Address" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" placeholder="ex: 123 Sampaguita St., Barangay 45, Sampaloc, Manila, 1008, Philippines" placeholderTextColor="gray" disabled={isSaving} />
                {serviceAreaError ? <Text style={styles.errorText}>{serviceAreaError}</Text> : null}

                <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} label="License Number" mode="outlined" outlineStyle={styles.inputOutline} textColor="black" placeholder="ex: MP-2025-12345" placeholderTextColor="gray" disabled={isSaving} />
                {licenseNumberError ? <Text style={styles.errorText}>{licenseNumberError}</Text> : null}

                {/* Document Upload Buttons */}
                <Button mode="outlined" onPress={() => pickDocument(setBusinessLicenseFile)} disabled={isSaving} style={{ marginTop: 10 }}>
                  {businessLicenseFile ? `Business License: ${businessLicenseFile.name}` : 'Upload Business License *'}
                </Button>
                <Button mode="outlined" onPress={() => pickDocument(setDriversLicenseFile)} disabled={isSaving} style={{ marginTop: 10 }}>
                  {driversLicenseFile ? `Driver's License: ${driversLicenseFile.name}` : "Upload Driver's License *"}
                </Button>
                <Button mode="outlined" onPress={() => pickDocument(setNbiClearanceFile)} disabled={isSaving} style={{ marginTop: 10 }}>
                  {nbiClearanceFile ? `NBI Clearance: ${nbiClearanceFile.name}` : 'Upload NBI Clearance *'}
                </Button>
                <Button mode="outlined" onPress={() => pickDocument(setOtherCertFile)} disabled={isSaving} style={{ marginTop: 10 }}>
                  {otherCertFile ? `Other Certificate: ${otherCertFile.name}` : 'Upload Other Certificate (Optional)'}
                </Button>

                {saveError && <Text style={styles.errorText}>{saveError}</Text>}

                {/* Terms & Conditions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <Checkbox status={termsChecked ? 'checked' : 'unchecked'} onPress={() => setTermsChecked(!termsChecked)} />
                  <Text onPress={() => setModalVisible(true)} style={{ color: 'blue', textDecorationLine: 'underline' }}>
                    I agree to the Terms and Conditions
                  </Text>
                </View>

                {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!termsChecked || isSaving) && styles.disabledBtn, // visually dim when disabled
                ]}
                onPress={handleSubmit}
                disabled={isSaving || !termsChecked}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <View style={styles.btnContent}>
                    <Ionicons
                      name="construct-outline"
                      size={18}
                      color="#FF5722"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.mechanicBtnText}>Register as a Mechanic</Text>
                  </View>
                )}
              </TouchableOpacity>


              </View>
            </View>
          </ScrollView>

          {/* Terms Modal */}
          <Modal animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Terms and Conditions</Text>
                <Button mode="text" onPress={() => setModalVisible(false)}>Close</Button>
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
      backgroundColor: 'white' 
    },
    scrollViewContent: {
       paddingBottom: 120,
        alignItems: 'center' 
      },
    cont: { 
      justifyContent: 'center', 
      alignItems: 'center',
      width: '100%'
      },
    header: {
       fontSize: 50, 
       marginLeft: 20,
       fontWeight: 'bold', 
       marginTop: 50,
       color: 'black'
      },

    subheader: { 
       fontSize: 15, 
       marginLeft: 23,
       fontWeight: 'bold', 
       color: 'black',
       marginBottom: 40 
      },
    input: { 
      width: 350,
      height: 50, 
      marginBottom: 10, 
      fontSize: 15,
      backgroundColor: 'white'
    },
      
    inputOutline: { 
      borderColor: 'black', 
      borderWidth: 2 
    },
    contInput: { 
      marginTop: 40, 
      gap: 10,
      alignItems: 'center',
      paddingHorizontal: 20 
    },

  submitBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: 240,
  height: 45,
  backgroundColor: 'white',
  borderColor: '#FF5722',
  borderRadius: 25,
  marginTop: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},

btnContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},

disabledBtn: {
  opacity: 0.5,
},

mechanicBtnText: {
  color: '#FF5722',
  fontSize: 16,
  fontWeight: 'bold',
  textAlign: 'center',
},
backButtonContainerBottom: { 
  position: 'absolute',
   bottom: 40, 
   left: 20
},
  errorText: {
    color: 'red',
    marginTop: 5,
    fontSize: 14 
  },
  });
