import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { Dimensions, Image as RNImage, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router'; 
import * as ImagePicker from 'expo-image-picker';import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirebaseError } from 'firebase/app'; 
import { db, app } from '@/scripts/firebaseConfig';
import { usePostStore } from '@/constants/userHubStore';
import { useUserQueryLoginStore } from '@/constants/store';
import { useUserProfileStore } from '@/constants/userProfileStore';

const { width } = Dimensions.get('window');
const availableTags = ['Safety', 'Tips', 'Facts', 'Experience'];
const storage = getStorage(app);

const CreatePostScreen = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { addPost, isPosting, postError, setPostError } = usePostStore();
  const { currentUser } = useUserQueryLoginStore();
  const { userInfo, isLoadingProfile, profileError, fetchUserProfileData } = useUserProfileStore();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const requestPermissions = async () => {
        console.log("[CreatePostScreen] Requesting media library permissions...");
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Sorry, we need media library permissions to upload an image.');
          console.warn("[CreatePostScreen] Media library permission denied.");
        } else {
          console.log("[CreatePostScreen] Media library permission granted.");
        }
      };
      requestPermissions();
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id && !userInfo && !isLoadingProfile && !profileError) {
      console.log("[CreatePostScreen] User logged in but userInfo missing. Fetching profile for ID:", currentUser.id);
      fetchUserProfileData(currentUser.id);
    }
  }, [currentUser?.id, userInfo, isLoadingProfile, profileError, fetchUserProfileData]);

  const handleTagPress = (tag: string) => {
    setSelectedTags(prevTags =>
      prevTags.includes(tag) ? prevTags.filter(t => t !== tag) : [...prevTags, tag]
    );
  };

  const pickImage = async () => {
    console.log('[pickImage] Launching image library...');
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      console.log('[pickImage] ImagePicker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUri(selectedAsset.uri);
        console.log('[pickImage] Selected image URI:', selectedAsset.uri);
      } else {
        console.log('[pickImage] Image picking cancelled or no assets selected.');
        setImageUri(null);
      }
    } catch (error) {
        console.error('[pickImage] Error during image picking:', error);
        Alert.alert('Image Picker Error', `An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleCancel = () => {
    router.replace('../Discover');
  };

 const uploadImageAsync = async (uri: string): Promise<string | null> => {
    console.log('[uploadImageAsync] Starting. URI:', uri);
    if (!uri) {
      console.error('[uploadImageAsync] URI is null or empty.');
      Alert.alert("Upload Failed", "No image URI provided.");
      return null;
    }

    let blob: Blob | null = null;
    try {
      console.log('[uploadImageAsync] Creating blob promise using XMLHttpRequest...');
      blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          console.log('[uploadImageAsync] XHR onload triggered. Status:', xhr.status, 'ReadyState:', xhr.readyState, 'for URI:', uri);
          
          // MODIFIED CONDITION:
          // For file:/// URIs, a status of 0 can indicate success.
          // Also check xhr.response to ensure it's not null.
          if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && uri.startsWith('file:'))) {
            if (xhr.response) {
              console.log('[uploadImageAsync] XHR request appears successful.');
              resolve(xhr.response as Blob);
            } else {
              console.error('[uploadImageAsync] XHR response is null despite seemingly successful status.');
              reject(new TypeError('XHR response is null for URI: ' + uri));
            }
          } else {
            console.error('[uploadImageAsync] XHR failed with status:', xhr.status, 'StatusText:', xhr.statusText);
            reject(new TypeError(`XHR request failed: status ${xhr.status}, text ${xhr.statusText} for URI: ${uri}`));
          }
        };
        xhr.onerror = function (e) {
          console.error("[uploadImageAsync] XHR onerror triggered for URI:", uri, "Event:", e);
          reject(new TypeError("Network request failed for URI to Blob conversion (XHR onerror) for URI: " + uri));
        };
        xhr.onabort = function () {
          console.error("[uploadImageAsync] XHR onabort triggered for URI:", uri);
          reject(new Error("Blob conversion aborted (XHR onabort) for URI: " + uri));
        };
        xhr.ontimeout = function () {
          console.error("[uploadImageAsync] XHR ontimeout triggered for URI:", uri);
          reject(new Error("Blob conversion timed out (XHR ontimeout) for URI: " + uri));
        };
        xhr.responseType = "blob";
        console.log(`[uploadImageAsync] XHR opening GET for URI: ${uri}`);
        xhr.open("GET", uri, true);
        console.log('[uploadImageAsync] XHR sending request for URI:', uri);
        xhr.send(null);
      });
      console.log('[uploadImageAsync] Blob promise resolved.');
    } catch (error) {
      console.error("[uploadImageAsync] Error during blob creation promise:", error);
      Alert.alert("Upload Failed", `Could not prepare image for upload. Error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }

    if (!blob) {
      console.error("[uploadImageAsync] Image URI could not be converted to blob. Blob is null after promise.");
      Alert.alert("Upload Failed", "Could not prepare image for upload. (Blob is null)");
      return null;
    }
    
    console.log(`[uploadImageAsync] Blob created. Size: ${blob.size}, Type: ${blob.type}`);

    if (!currentUser?.id) {
      console.error("[uploadImageAsync] Current user ID is not available. Cannot determine storage path.");
      Alert.alert("Upload Failed", "User information is missing. Cannot upload image.");
      return null;
    }
    const imageName = uri.substring(uri.lastIndexOf('/') + 1) || `image_${Date.now()}`;
    // Sanitize file name slightly more for storage, replacing common problematic characters
    const sanitizedImageName = imageName.replace(/[^a-zA-Z0-9._-\s]/g, '').replace(/\s+/g, '_'); 
    const imagePath = `post_images/${currentUser.id}/${Date.now()}_${sanitizedImageName}`; 
    console.log(`[uploadImageAsync] Storage path: ${imagePath}`);
    const storageRef = ref(storage, imagePath);

    try {
      console.log('[uploadImageAsync] Attempting to upload bytes...');
      await uploadBytes(storageRef, blob); 
      console.log('[uploadImageAsync] UploadBytes successful.');

      console.log('[uploadImageAsync] Attempting to get download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log("[uploadImageAsync] Image uploaded successfully. Download URL:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("[uploadImageAsync] Error uploading image to Firebase Storage or getting URL:", error);
      if (error instanceof FirebaseError) { 
        console.error("[uploadImageAsync] Firebase error code:", error.code);
        console.error("[uploadImageAsync] Firebase error message:", error.message);
        Alert.alert("Upload Failed", `Firebase error: ${error.code}. Please check your connection and storage rules.`);
      } else if (error instanceof Error) {
        Alert.alert("Upload Failed", `Failed to upload image to server. Error: ${error.message}`);
      } else {
        Alert.alert("Upload Failed", `An unknown error occurred during image upload.`);
      }
      return null;
    }
  };

  const handlePost = async () => {
    console.log("[handlePost] Initiating post creation.");
    setPostError(null);

    // Ensure currentUser and userInfo are loaded before allowing post.
    // The button is disabled if !userInfo, but this is an extra safeguard.
    if (!currentUser?.id || !userInfo?.firstName) {
      Alert.alert('Error', 'User information is missing. Please ensure you are logged in and profile data is loaded.');
      console.warn("[handlePost] User information missing. CurrentUser ID:", currentUser?.id, "UserInfo FirstName:", userInfo?.firstName);
      if (currentUser?.id && !userInfo) {
        console.log("[handlePost] Attempting to re-fetch user profile for ID:", currentUser.id);
        fetchUserProfileData(currentUser.id);
      }
      return;
    }

    if (!title.trim() || !description.trim() || selectedTags.length === 0) {
      Alert.alert('Validation Error', 'Title, description, and at least one tag are required.');
      console.warn("[handlePost] Validation failed: Title, description, or tags missing.");
      return;
    }

    let uploadedImageUrl: string | undefined = undefined;

    if (imageUri) {
      console.log("[handlePost] Attempting to upload image. URI:", imageUri);
      const downloadUrl = await uploadImageAsync(imageUri);
      console.log("[handlePost] uploadImageAsync completed. Download URL received:", downloadUrl);
      if (downloadUrl) {
        uploadedImageUrl = downloadUrl;
        console.log("[handlePost] Image uploaded successfully. URL:", uploadedImageUrl);
      } else {
        setPostError("Image upload failed. Please try again.");
        console.error("[handlePost] Image upload failed, downloadUrl is null or undefined. Post creation aborted.");
        return;
      }
    }

    // Type for data passed to addPost; matches structure expected by store's addPost,
    // which then adds Firestore-specific fields like Timestamp.
    const postDataForStore: {
        userId: string;
        userName: string;
        userProfilePictureUrl?: string;
        title: string;
        description: string;
        tags: string[];
        imageUrl?: string;
        // createdAt will be added by the store using Timestamp.now()
        // but if your component needs to work with a Date object before sending, it's fine.
        // Here, we define what we send to the store.
    } = {
      userId: currentUser.id, // Known to be defined due to check above
      userName: userInfo.firstName + (userInfo.lastName ? ' ' + userInfo.lastName : ''), // userInfo.firstName known
      userProfilePictureUrl: userInfo?.profilePictureUrl || undefined,
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags,
    };

    if (uploadedImageUrl !== undefined) {
      postDataForStore.imageUrl = uploadedImageUrl;
    }
    console.log("[handlePost] Post data prepared for store:", JSON.stringify(postDataForStore, null, 2));

    // addPost in your store expects an object and internally adds `createdAt: Timestamp.now()`
    // and other counts. So the object from component doesn't need to send these.
    const result = await addPost(postDataForStore);
    console.log("[handlePost] addPost result:", result);

    if (result.success) {
      Alert.alert('Success', 'Post created successfully!');
      console.log("[handlePost] Post created successfully, navigating to Discover.");
      router.replace('/(tabs)/Discover');
    } else if (result.error) {
      Alert.alert('Post Failed', result.error);
      console.error("[handlePost] Post creation failed in addPost. Error:", result.error);
    }
  };

  // --- UI Rendering ---
  if (isLoadingProfile) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading user profile info...</Text>
      </View>
    );
  }

  if (profileError && !userInfo) {
    console.error("[CreatePostScreen] Profile error and no user info. Error:", profileError);
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="warning-outline" size={48} color="red" />
        <Text style={{ textAlign: 'center', color: 'red', marginBottom: 10, marginTop:10, fontSize: 16 }}>
          Error loading user profile:
        </Text>
        <Text style={{ textAlign: 'center', color: 'red', marginBottom: 20 }}>
            {profileError}
        </Text>
        {currentUser?.id && (
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            console.log("[CreatePostScreen] Retry Load Profile pressed for ID:", currentUser.id);
            fetchUserProfileData(currentUser.id);
          }}>
            <Text style={styles.retryButtonText}>Retry Load Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!currentUser?.id) {
    console.warn("[CreatePostScreen] No current user ID. Prompting to log in.");
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
         <Ionicons name="log-in-outline" size={48} color="gray" />
        <Text style={{ textAlign: 'center', color: 'gray', marginTop: 10, fontSize: 16 }}>
          Please log in to create a post.
        </Text>
        {/* You might want a button here to navigate to login screen */}
        {/* <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginPromptButton}><Text style={styles.loginPromptButtonText}>Go to Login</Text></TouchableOpacity> */}
      </View>
    );
  }

  // This state means user is logged in, profile isn't loading, but userInfo is still missing.
  // This might happen if fetchUserProfileData failed silently or returned no data.
  if (!userInfo && currentUser?.id && !isLoadingProfile) {
    console.warn("[CreatePostScreen] User ID exists, but no user info after loading attempts.");
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="person-circle-outline" size={48} color="orange" />
        <Text style={{ textAlign: 'center', color: 'orange', marginTop: 10, fontSize: 16, marginBottom: 20 }}>
          User profile information could not be loaded.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => {
            console.log("[CreatePostScreen] Retry Load Profile (from !userInfo state) pressed for ID:", currentUser.id);
            fetchUserProfileData(currentUser.id);
        }}>
            <Text style={styles.retryButtonText}>Retry Load Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If userInfo is still null here, it means the above conditions didn't catch it,
  // which implies currentUser.id might be present but userInfo is unexpectedly null.
  // The Post button is disabled if !userInfo, but the UI needs to be graceful.
  if (!userInfo) {
     return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Waiting for user information...</Text>
      </View>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={styles.backButtonText}> Back</Text>
        </TouchableOpacity>
    
        <View style={{ width: 70 }} /> {/* Spacer */}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker} disabled={isPosting}>
          {imageUri ? (
            <RNImage source={{ uri: imageUri }} style={styles.postImage} resizeMode="cover" />
          ) : (
            <View style={{alignItems: 'center'}}>
                <Ionicons name="image-outline" size={80} color="#aaa" />
                <Text style={{color: '#777', marginTop: 5}}>Add an image (optional)</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.titleInput}
          placeholder="Post Title..."
          value={title}
          onChangeText={setTitle}
          editable={!isPosting}
        />

        <TextInput
          style={styles.descriptionInput}
          placeholder="What's on your mind...?"
          value={description}
          onChangeText={setDescription}
          multiline
          editable={!isPosting}
        />

        <View style={styles.tagsSection}>
          <Text style={styles.tagsLabel}>Select Tags (at least one):</Text>
          <View style={styles.tagsContainer}>
            {availableTags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagButton, selectedTags.includes(tag) && styles.selectedTagButton]}
                onPress={() => handleTagPress(tag)}
                disabled={isPosting}
              >
                <Text style={[styles.tagButtonText, selectedTags.includes(tag) && styles.selectedTagButtonText]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {postError && (
          <Text style={styles.errorText}>{postError}</Text>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity 
            style={[styles.postButton, (isPosting || !userInfo) && styles.disabledPostButton]} 
            onPress={handlePost} 
            disabled={isPosting || !userInfo} // Ensure userInfo is loaded
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.postButtonText}>Post </Text>
              <Ionicons name="send" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F8', // Softer background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 20 : 10, // More padding for Android status bar
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Softer border
    backgroundColor: 'white',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5, // Make easier to tap
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 17,
    marginLeft: 6,
    color: '#007AFF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: 36, // Slightly smaller
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#E0E0E0', // Placeholder background
  },
  userName: {
    fontSize: 16,
    fontWeight: '600', // Semibold
    color: '#222',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16, // Consistent padding
  },
  imagePicker: {
    width: '100%',
    height: width * 0.45, // Adjusted height
    backgroundColor: '#E9ECEF', // Lighter placeholder
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CED4DA', // Softer border
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  titleInput: {
    fontSize: 20, // Slightly smaller
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1, // Border all around
    borderColor: '#CED4DA',
    backgroundColor: 'white',
    borderRadius: 6,
  },
  descriptionInput: {
    fontSize: 16,
    color: '#444',
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingTop: 10, // Ensure padding top for multiline
    borderWidth: 1,
    borderColor: '#CED4DA',
    minHeight: 100, // Adjusted min height
    textAlignVertical: 'top',
    backgroundColor: 'white',
    borderRadius: 6,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsLabel: {
    fontSize: 15, // Slightly smaller
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // Use gap for spacing if supported, otherwise use margin
  },
  tagButton: {
    backgroundColor: '#E9ECEF',
    borderRadius: 16, // More pill-like
    paddingVertical: 6,
    paddingHorizontal: 12,
    // marginRight: 8, // Replaced by gap
    // marginBottom: 8, // Replaced by gap
    borderWidth: 1,
    borderColor: 'transparent', // No border initially
  },
  selectedTagButton: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
  },
  tagButtonText: {
    fontSize: 14,
    color: '#495057', // Darker gray
  },
  selectedTagButtonText: {
    color: 'white',
    fontWeight: '500', // Medium weight
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12, // Reduced padding
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  postButton: {
    flexDirection: 'row',
    backgroundColor: '#007BFF', // Changed to blue
    paddingVertical: 10, // Slightly smaller
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  disabledPostButton: {
    opacity: 0.5,
    backgroundColor: '#ADB5BD', // Gray out when disabled
  },
  postButtonText: {
    fontSize: 16, // Slightly smaller
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16, // Consistent margin
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop:10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreatePostScreen;