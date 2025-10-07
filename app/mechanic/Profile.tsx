import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, SettableMetadata, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Image as RNImage,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { db, storage } from '@/scripts/firebaseConfig';

const ProfileSettingsScreen = () => {
  const router = useRouter();
  const { currentUser, logout } = useUserQueryLoginStore();
  const {
    userInfo,
    isLoadingProfile,
    profileError,
    fetchUserProfileData,
  } = useUserProfileStore();

  const [isUploading, setIsUploading] = useState(false);
  const [localProfilePicUri, setLocalProfilePicUri] = useState<string | null>(null);

  // Fetch user profile data when the component mounts or currentUser.id changes
  useEffect(() => {
  if (currentUser?.id && !userInfo && !isLoadingProfile && !profileError) {
    console.log('[ProfileSettingsScreen] Fetching profile for ID:', currentUser.id);
    fetchUserProfileData(currentUser.id).catch(error => {
      console.error('[fetchUserProfileData] Error:', error);
    });
  }
}, [currentUser?.id, userInfo, isLoadingProfile, profileError, fetchUserProfileData]);


  // Update localProfilePicUri when userInfo changes (e.g., after fetching or updating)
  useEffect(() => {
    if (userInfo?.profilePictureUrl) {
      setLocalProfilePicUri(userInfo.profilePictureUrl);
    } else {
      setLocalProfilePicUri(null); // Reset if no URL in userInfo
    }
  }, [userInfo?.profilePictureUrl]);

  const handleLogout = async () => {
    try {
      await logout(); // Assuming logout is async
      console.log('User logged out successfully!');
      router.replace('/login');
    } catch (error: any) {
      console.error('Error during logout:', error);
      Alert.alert('Logout Error', error.message || 'An error occurred during logout.');
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need media library permissions to upload an image.');
        return false;
      }
      return true;
    }
    return true; // Assume granted on web or handle web-specific logic
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Or ImagePicker.MediaType.Images if you switched import style
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.7, // Compress image slightly
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setLocalProfilePicUri(selectedUri); // Show preview locally
        await uploadProfilePicture(selectedUri);
      }
    } catch (error) {
      console.error('[pickImage] Error:', error);
      Alert.alert('Image Picker Error', 'Could not select image.');
      setLocalProfilePicUri(userInfo?.profilePictureUrl || null); // Revert to original if error
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not found. Cannot upload picture.');
      return;
    }
    setIsUploading(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExtension = uri.split('.').pop() || 'jpg';
      const imageName = `profile_${currentUser.id}.${fileExtension}`;
      const imagePath = `profile_pictures/${currentUser.id}/${imageName}`;
      const storageRef = ref(storage, imagePath);

      const metadata: SettableMetadata = { contentType: blob.type || `image/${fileExtension}` };

      await uploadBytes(storageRef, blob, metadata);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const userDocRef = doc(db, 'users', currentUser.id); // Assuming 'users' collection
      await updateDoc(userDocRef, {
        profilePictureUrl: downloadURL,
      });

      Alert.alert('Success', 'Profile picture updated!');
      fetchUserProfileData(currentUser.id); // Refresh user profile data in the store
      // setLocalProfilePicUri(downloadURL); // Already handled by useEffect on userInfo change

    } catch (error) {
      console.error('[uploadProfilePicture] Error:', error);
      if (error instanceof FirebaseError) {
        Alert.alert('Upload Failed', `Firebase error: ${error.message}`);
      } else {
        Alert.alert('Upload Failed', 'An error occurred while uploading the picture.');
      }
      setLocalProfilePicUri(userInfo?.profilePictureUrl || null); // Revert to original if error
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingProfile && !userInfo) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    // This case should ideally be handled by route protection
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.messageText}>Please log in to view your profile.</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.replace('/login')}>
          <Text style={styles.actionButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Use userInfo from the store for display, fallback to currentUser if userInfo is still loading/null
  const displayName = userInfo?.firstName || currentUser.firstName || currentUser.email || 'User';
  const displayProfilePic = localProfilePicUri;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} disabled={isUploading} style={styles.profilePicContainer}>
            {isUploading ? (
              <ActivityIndicator size="large" color="#FFFFFF" style={styles.profilePicPlaceholder} />
            ) : displayProfilePic ? (
              <RNImage source={{ uri: displayProfilePic }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Ionicons name="person-outline" size={60} color="#B0B0B0" />
                <View style={styles.addIconContainer}>
                  <Ionicons name="add-circle" size={28} color="#007AFF" />
                </View>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.welcomeText}>
            {`Welcome, ${displayName}!`}
          </Text>
          {profileError && <Text style={styles.errorText}>Error loading profile: {profileError}</Text>}
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/mechanic_settings')}>
            <Ionicons name="settings-outline" size={22} color="#4A4A4A" style={styles.settingIcon} />
            <Text style={styles.settingText}>Account Settings</Text>
            <Ionicons name="chevron-forward-outline" size={22} color="#FF5722" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isUploading}>
          <Ionicons name="log-out-outline" size={22} color="white" style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Light background for the whole screen
  },
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  profilePicContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePicPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'white', // Circle background for the add icon
    borderRadius: 15,
    padding: 1, // Small padding to make the blue icon pop
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 5, // Padding inside the white box
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15, // Padding for items
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5', // Lighter separator
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    fontSize: 17,
    color: '#1C1C1E',
    flex: 1, // Allow text to take available space
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF5722', // Standard iOS destructive red
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    alignSelf: 'center',
    width: '80%', // Make button wider
    maxWidth: 300,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default ProfileSettingsScreen;
