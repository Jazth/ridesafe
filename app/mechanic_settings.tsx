import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useRouter } from 'expo-router';
import { doc, DocumentReference, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore, Vehicle } from '@/constants/userProfileStore';

const navigateToEditProfile = () => {
  router.push('/mechanic_account_change');
};

const ProfileLogoWithPicker = ({ userInfo }: { userInfo: any }) => {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your media library!');
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const displayPicture = profilePicture || userInfo?.profilePictureUrl;

  return (
    <View style={styles.logoWithPickerContainer}>
      <TouchableOpacity onPress={pickImage} style={styles.profilePictureContainer}>
        {displayPicture ? (
          <Image source={{ uri: displayPicture }} style={styles.profilePicture} />
        ) : (
          <View style={styles.profilePicturePlaceholder}>
            <Text style={styles.placeholderText}>+</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.logoText}>
        {userInfo?.firstName} {userInfo?.lastName}
      </Text>
    </View>
  );
};

const MechanicSettingsScreen = () => {
  const router = useRouter();
  const { currentUser } = useUserQueryLoginStore();
  const {
    userInfo,
    setVehicles,
    vehicles,
    setUserInfo,
    clearProfileState,
    isLoadingProfile,
    profileError,
  } = useUserProfileStore();

  useEffect(() => {
    const fetchUserData = async (userId: string) => {
      try {
        const role = currentUser?.role || 'user';
        const collection = role === 'mechanic' ? 'mechanics' : 'users';
        const docRef: DocumentReference = doc(db, collection, userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserInfo(data);
          setVehicles(data.vehicles || []);
        } else {
          setUserInfo(null);
          setVehicles([]);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load profile.');
      } finally {
        useUserProfileStore.getState().setIsLoadingProfile(false);
      }
    };

    if (currentUser?.id) {
      fetchUserData(currentUser.id);
    } else {
      clearProfileState();
    }
  }, [currentUser?.id]);

  const openFileLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open file.');
      });
    }
  };

  const handleLogout = async () => {
    const { logout } = useUserQueryLoginStore.getState();
    logout();
    router.replace('/login');
  };

  if (isLoadingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="black" />
        <Text>Loading profile data...</Text>
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View style={styles.centered}>
        <Text>No user data found. Please log in again.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topSection}>
        <ProfileLogoWithPicker userInfo={userInfo} />
      </View>

      <ScrollView style={styles.cont}>
        <View style={styles.profile}>
          <View style={styles.profEdit}>
            <Text style={styles.headertxt}>Profile</Text>
            <TouchableOpacity onPress={navigateToEditProfile}>
              <Ionicons name="pencil-sharp" size={18} color="black" />
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>Email</Text><Text style={styles.emailInput}>{userInfo.email}</Text></View>
          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>Phone Number</Text><Text style={styles.emailInput}>{userInfo.phoneNumber}</Text></View>
          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>Business Name</Text><Text style={styles.emailInput}>{userInfo.businessName || 'Not provided'}</Text></View>
          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>Service Area</Text><Text style={styles.emailInput}>{userInfo.serviceArea || 'Not provided'}</Text></View>
          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>License Number</Text><Text style={styles.emailInput}>{userInfo.licenseNumber || 'Not provided'}</Text></View>

          {/* Document Links */}
          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>Business License</Text>{userInfo.businessLicenseUrl ? (<TouchableOpacity onPress={() => openFileLink(userInfo.businessLicenseUrl)}><Text style={styles.linkText}>View Business License</Text></TouchableOpacity>) : (<Text style={styles.emailInput}>Not uploaded</Text>)}</View>

          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>Driver’s License</Text>{userInfo.driversLicenseUrl ? (<TouchableOpacity onPress={() => openFileLink(userInfo.driversLicenseUrl)}><Text style={styles.linkText}>View Driver’s License</Text></TouchableOpacity>) : (<Text style={styles.emailInput}>Not uploaded</Text>)}</View>

          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>NBI Clearance</Text>{userInfo.nbiClearanceUrl ? (<TouchableOpacity onPress={() => openFileLink(userInfo.nbiClearanceUrl)}><Text style={styles.linkText}>View NBI Clearance</Text></TouchableOpacity>) : (<Text style={styles.emailInput}>Not uploaded</Text>)}</View>

          <View style={styles.profileInfo}><Text style={styles.subHeadertxt}>Other Certificate</Text>{userInfo.otherCertUrl ? (<TouchableOpacity onPress={() => openFileLink(userInfo.otherCertUrl)}><Text style={styles.linkText}>View Other Certificate</Text></TouchableOpacity>) : (<Text style={styles.emailInput}>None</Text>)}</View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MechanicSettingsScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  topSection: { paddingVertical: 20, alignItems: 'center', borderBottomWidth: 1, borderColor: '#ddd' },
  cont: { flex: 1, paddingHorizontal: 20 },
  profile: { marginTop: 10 },
  profEdit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headertxt: { fontSize: 22, fontWeight: 'bold' },
  subHeadertxt: { fontSize: 16, fontWeight: '600', marginTop: 10 },
  emailInput: { fontSize: 16, color: '#333', marginTop: 5 },
  profileInfo: { marginBottom: 10 },
  profilePictureContainer: {
    borderRadius: 50,
    overflow: 'hidden',
    width: 80,
    height: 80,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicture: { width: 80, height: 80, borderRadius: 40 },
  profilePicturePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 36, color: '#888' },
  logoWithPickerContainer: { alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  logoutButton: {
    marginTop: 40,
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: {
    color: 'blue',
    textDecorationLine: 'underline',
    fontSize: 16,
    marginTop: 5,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
