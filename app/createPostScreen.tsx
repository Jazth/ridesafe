import { useUserQueryLoginStore } from '@/constants/store';
import { usePostStore } from '@/constants/userHubStore';
import { useUserProfileStore } from '@/constants/userProfileStore';
import { storage } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import {
<<<<<<< HEAD
    launchImageLibraryAsync,
    MediaTypeOptions,
    requestMediaLibraryPermissionsAsync
=======
<<<<<<< HEAD
    launchImageLibraryAsync,
    MediaTypeOptions,
    requestMediaLibraryPermissionsAsync
=======
    launchImageLibraryAsync,
    MediaTypeOptions,
    requestMediaLibraryPermissionsAsync
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
} from 'expo-image-picker';
import { router } from 'expo-router';
import { FirebaseError } from 'firebase/app';
import { serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, SettableMetadata, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
<<<<<<< HEAD
=======
=======
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const availableTags = ['Safety', 'Tips', 'Facts', 'Experience'];

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
        console.log('[CreatePostScreen] Requesting media library permissions...');
        const { status } = await requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Sorry, we need media library permissions to upload an image.');
          console.warn('[CreatePostScreen] Media library permission denied.');
        } else {
          console.log('[CreatePostScreen] Media library permission granted.');
        }
      };
      requestPermissions();
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id && !userInfo && !isLoadingProfile && !profileError) {
      console.log('[CreatePostScreen] User logged in but userInfo missing. Fetching profile for ID:', currentUser.id);
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
      let result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
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
    router.replace('/(tabs)/Discover');
  };

  const uploadImageAsync = async (uri: string): Promise<string | null> => {
    console.log('[uploadImageAsync] Starting. URI:', uri);
    if (!uri) {
      console.error('[uploadImageAsync] URI is null or empty.');
      Alert.alert('Upload Failed', 'No image URI provided.');
      return null;
    }

    let blob: Blob;
    try {
      console.log('[uploadImageAsync] Fetching URI to create blob:', uri);
      const response = await fetch(uri);
      console.log('[uploadImageAsync] Converting response to blob...');
      blob = await response.blob();
      console.log(`[uploadImageAsync] Blob created. Size: ${blob.size}, Type: ${blob.type}`);
    } catch (error) {
      console.error('[uploadImageAsync] Error creating blob from URI:', error);
      Alert.alert(
        'Upload Failed',
        `Could not prepare image for upload. Error: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }

    if (!currentUser?.id) {
      console.error('[uploadImageAsync] Current user ID is not available. Cannot determine storage path.');
      Alert.alert('Upload Failed', 'User information is missing. Cannot upload image.');
      return null;
    }

    let imageName = uri.split('/').pop() || `image_${Date.now()}`;
    imageName = imageName.split('?')[0];
    const sanitizedImageName = imageName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const imagePath = `post_images/${currentUser.id}/${Date.now()}_${sanitizedImageName}`;
    console.log(`[uploadImageAsync] Storage path: ${imagePath}`);
    const storageRef = ref(storage, imagePath);

    const metadata: SettableMetadata = {
      contentType: blob.type || 'image/jpeg',
    };
    console.log('[uploadImageAsync] Upload metadata:', metadata);

    try {
      console.log('[uploadImageAsync] Attempting to upload blob with metadata...');
      await uploadBytes(storageRef, blob, metadata);
      console.log('[uploadImageAsync] UploadBytes successful.');

      console.log('[uploadImageAsync] Attempting to get download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('[uploadImageAsync] Image uploaded successfully. Download URL:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('[uploadImageAsync] Error uploading image to Firebase Storage or getting URL:', error);
      if (error instanceof FirebaseError) {
        console.error('[uploadImageAsync] Firebase error code:', error.code);
        console.error('[uploadImageAsync] Firebase error message:', error.message);
        console.error('[uploadImageAsync] Firebase error object (raw):', error);
        console.error('[uploadImageAsync] Firebase error object (JSON):', JSON.stringify(error, null, 2));
        Alert.alert(
          'Upload Failed',
          `Firebase error: ${error.code}. ${error.message}. Check console for more details.`
        );
      } else if (error instanceof Error) {
        Alert.alert('Upload Failed', `Failed to upload image to server. Error: ${error.message}`);
      } else {
        Alert.alert('Upload Failed', 'An unknown error occurred during image upload.');
      }
      return null;
    }
  };

  const handlePost = async () => {
    console.log('[handlePost] Initiating post creation.');
    setPostError(null);

    if (!currentUser?.id || !userInfo?.firstName) {
      Alert.alert('Error', 'User information is missing. Please ensure you are logged in and profile data is loaded.');
      console.warn('[handlePost] User information missing. CurrentUser ID:', currentUser?.id, 'UserInfo FirstName:', userInfo?.firstName);
      if (currentUser?.id && !userInfo) {
        console.log('[handlePost] Attempting to re-fetch user profile for ID:', currentUser.id);
        fetchUserProfileData(currentUser.id);
      }
      return;
    }

    if (!title.trim() || !description.trim() || selectedTags.length === 0) {
      Alert.alert('Validation Error', 'Title, description, and at least one tag are required.');
      console.warn('[handlePost] Validation failed: Title, description, or tags missing.');
      return;
    }

    let uploadedImageUrl: string | undefined = undefined;

    if (imageUri) {
      console.log('[handlePost] Attempting to upload image. URI:', imageUri);
      const downloadUrl = await uploadImageAsync(imageUri);
      console.log('[handlePost] uploadImageAsync completed. Download URL received:', downloadUrl);
      if (downloadUrl) {
        uploadedImageUrl = downloadUrl;
        console.log('[handlePost] Image uploaded successfully. URL:', uploadedImageUrl);
      } else {
        console.error('[handlePost] Image upload failed, downloadUrl is null or undefined. Post creation aborted.');
        return;
      }
    }
    const postDataForStore = {
      userId: currentUser.id,
      userName: userInfo.firstName + (userInfo.lastName ? ' ' + userInfo.lastName : ''),
      userProfilePictureUrl: userInfo?.profilePictureUrl || null,
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags,
      imageUrl: uploadedImageUrl || null,
      createdAt: serverTimestamp(),
      likesCount: 0,
      likedBy: [],
      savesCount: 0,
      savedBy: [],
    };

    console.log('[handlePost] Post data prepared for store:', JSON.stringify(postDataForStore, null, 2));
    const result = await addPost(postDataForStore as any);
    console.log('[handlePost] addPost result:', result);

    if (result.success) {
      Alert.alert('Success', 'Post created successfully!');
      console.log('[handlePost] Post created successfully, navigating to Discover.');
      setTitle('');
      setDescription('');
      setSelectedTags([]);
      setImageUri(null);
      router.replace('/(tabs)/Discover');
    } else if (result.error) {
      Alert.alert('Post Failed', result.error as string);
      console.error('[handlePost] Post creation failed in addPost. Error:', result.error);
    }
  };

  if (isLoadingProfile) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading user profile info...</Text>
      </View>
    );
  }

  if (profileError && !userInfo) {
    console.error('[CreatePostScreen] Profile error and no user info. Error:', profileError);
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="warning-outline" size={48} color="red" />
        <Text style={{ textAlign: 'center', color: 'red', marginBottom: 10, marginTop: 10, fontSize: 16 }}>
          Error loading user profile:
        </Text>
        <Text style={{ textAlign: 'center', color: 'red', marginBottom: 20 }}>
          {profileError as string}
        </Text>
        {currentUser?.id && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              console.log('[CreatePostScreen] Retry Load Profile pressed for ID:', currentUser.id);
              fetchUserProfileData(currentUser.id);
            }}
          >
            <Text style={styles.retryButtonText}>Retry Load Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (!currentUser?.id) {
    console.warn('[CreatePostScreen] No current user ID. Prompting to log in.');
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="log-in-outline" size={48} color="gray" />
        <Text style={{ textAlign: 'center', color: 'gray', marginTop: 10, fontSize: 16 }}>
          Please log in to create a post.
        </Text>
      </View>
    );
  }

  if (!userInfo && currentUser?.id && !isLoadingProfile) {
    console.warn('[CreatePostScreen] User ID exists, but no user info after loading attempts.');
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="person-circle-outline" size={48} color="orange" />
        <Text style={{ textAlign: 'center', color: 'orange', marginTop: 10, fontSize: 16, marginBottom: 20 }}>
          User profile information could not be loaded.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            console.log('[CreatePostScreen] Retry Load Profile (from !userInfo state) pressed for ID:', currentUser.id);
            fetchUserProfileData(currentUser.id);
          }}
        >
          <Text style={styles.retryButtonText}>Retry Load Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }
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
<<<<<<< HEAD
          <Ionicons name="arrow-back" size={24} color="#FF5722" />
=======
<<<<<<< HEAD
          <Ionicons name="arrow-back" size={24} color="#FF5722" />
=======
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
          <Text style={styles.backButtonText}> Back</Text>
        </TouchableOpacity>
        <View style={{ width: 70 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker} disabled={isPosting}>
          {imageUri ? (
            <RNImage source={{ uri: imageUri }} style={styles.postImage} resizeMode="cover" />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="image-outline" size={80} color="#aaa" />
              <Text style={{ color: '#777', marginTop: 5 }}>Add an image (optional)</Text>
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
          keyboardAppearance="dark"
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
                <Text style={[styles.tagButtonText, selectedTags.includes(tag) && styles.selectedTagButtonText]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {postError && <Text style={styles.errorText}>{postError as string}</Text>}
        <View style={{ height: 100 }} />
      </ScrollView>
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.postButton, (isPosting || !userInfo) && styles.disabledPostButton]}
          onPress={handlePost}
          disabled={isPosting || !userInfo}
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
    backgroundColor: '#F4F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 17,
    marginLeft: 6,
<<<<<<< HEAD
    color: '#FF5722',
=======
<<<<<<< HEAD
    color: '#FF5722',
=======
    color: '#007AFF',
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  imagePicker: {
    width: '100%',
    height: width * 0.5,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CED4DA',
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CED4DA',
    backgroundColor: 'white',
    borderRadius: 6,
  },
  descriptionInput: {
    fontSize: 16,
    color: '#444',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: '#CED4DA',
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: 'white',
    borderRadius: 6,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagButton: {
    backgroundColor: '#E9ECEF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedTagButton: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
  },
  tagButtonText: {
    fontSize: 14,
    color: '#495057',
  },
  selectedTagButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  postButton: {
    flexDirection: 'row',
<<<<<<< HEAD
    backgroundColor: '#FF5722',
=======
<<<<<<< HEAD
    backgroundColor: '#FF5722',
=======
    backgroundColor: '#007BFF',
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  disabledPostButton: {
    opacity: 0.6,
    backgroundColor: '#ADB5BD',
  },
  postButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreatePostScreen;