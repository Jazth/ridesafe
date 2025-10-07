import { useUserQueryLoginStore } from '@/constants/store'; // To get currentUser
import { useUserProfileStore } from '@/constants/userProfileStore'; // To get userInfo for header
import { db, storage } from '@/scripts/firebaseConfig'; // Import Firestore and Storage
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    Image as RNImage,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Re-using the Post interface, ensure it matches your Firestore structure
export interface Post {
  id: string;
  userId: string;
  userName: string;
  userProfilePictureUrl?: string | null;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  createdAt?: Timestamp;
}

const formatTimeAgo = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'some time ago';
  const now = new Date();
  const postDate = timestamp.toDate();
  const seconds = Math.round((now.getTime() - postDate.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
};

const UserPostItem: React.FC<{ post: Post; onDelete: (postId: string, imageUrl?: string) => void }> = React.memo(
  ({ post, onDelete }) => {
    const defaultProfilePic = 'https://placehold.co/50x50/E0E0E0/B0B0B0/png?text=User';
    const placeholderImage = 'https://placehold.co/600x400/CCCCCC/FFFFFF/png?text=No+Image';

    const handleDelete = () => {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete(post.id, post.imageUrl),
          },
        ]
      );
    };

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <RNImage
            source={{ uri: post.userProfilePictureUrl || defaultProfilePic }}
            style={styles.profilePicture}
          />
          <View style={styles.postHeaderTextContainer}>
            <Text style={styles.userName}>{post.userName}</Text>
            {post.createdAt && <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>}
          </View>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {post.imageUrl ? (
           <RNImage source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
        ) : (
            <View style={[styles.postImage, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={80} color="#B0B0B0" />
            </View>
        )}


        <View style={styles.postContent}>
          <Text style={styles.postTitle}>{post.title}</Text>
          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {post.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.postDescription}>{post.description}</Text>
        </View>
      </View>
    );
  }
);

const ViewHubPostsScreen = () => {
  const router = useRouter();
  const { currentUser } = useUserQueryLoginStore();
  const { userInfo } = useUserProfileStore(); // For displaying current user's name in header

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserPosts = useCallback(() => {
    if (!currentUser?.id) {
      setLoading(false);
      setError("User not logged in.");
      setPosts([]); // Clear posts if no user
      return () => {}; // Return an empty unsubscribe function
    }

    setLoading(true);
    const postsCollectionRef = collection(db, 'posts');
    const q = query(
      postsCollectionRef,
      where('userId', '==', currentUser.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const fetchedPosts: Post[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || '',
            userName: data.userName || 'Unknown User',
            userProfilePictureUrl: data.userProfilePictureUrl || null,
            title: data.title || 'No Title',
            description: data.description || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            imageUrl: data.imageUrl,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
          };
        });
        setPosts(fetchedPosts);
        setError(null);
        setLoading(false);
        setRefreshing(false);
      },
      err => {
        console.error('Error fetching user posts:', err);
        setError('Failed to fetch your posts.');
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsubscribe;
  }, [currentUser?.id]);

  useEffect(() => {
    const unsubscribe = fetchUserPosts();
    return () => unsubscribe(); // Cleanup on unmount
  }, [fetchUserPosts]);

  const handleDeletePost = async (postId: string, imageUrl?: string) => {
    console.log(`Attempting to delete post: ${postId}`);
    try {
      // 1. Delete image from Storage (if it exists)
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl); // Firebase SDK v9+ uses full URL for ref from URL
        try {
            await deleteObject(imageRef);
            console.log('Post image deleted from Storage:', imageUrl);
        } catch (storageError: any) {
            // If image deletion fails (e.g., file not found, permissions), log it but proceed to delete Firestore doc
            console.warn('Failed to delete post image from Storage, or image did not exist:', storageError.message);
            if (storageError.code === 'storage/object-not-found') {
                console.log("Image was already deleted or never existed at the path.");
            } else {
                 // For other storage errors, you might want to alert the user or handle differently
                Alert.alert('Image Deletion Error', 'Could not delete the associated image, but will try to delete the post data.');
            }
        }
      }

      // 2. Delete post document from Firestore
      const postDocRef = doc(db, 'posts', postId);
      await deleteDoc(postDocRef);
      console.log('Post document deleted from Firestore:', postId);

      Alert.alert('Success', 'Post deleted successfully.');
      // The onSnapshot listener will automatically update the UI by removing the post.
    } catch (err: any) {
      console.error('Error deleting post:', err);
      Alert.alert('Error', `Failed to delete post: ${err.message}`);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserPosts();
  }, [fetchUserPosts]);

  const renderHeader = () => (
    <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/user/Profile')} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={26} color="#333" />
        </TouchableOpacity>
      <Text style={styles.screenTitle}>My Hub Posts</Text>
      <View style={{width: 26}} />
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}} />
        <Text style={styles.messageText}>Loading your posts...</Text>
      </SafeAreaView>
    );
  }

  if (error && !loading) { // Show error only if not loading
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <Ionicons name="warning-outline" size={48} color="red" style={{marginTop: 20}}/>
        <Text style={styles.errorText}>{error}</Text>
         <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!currentUser?.id && !loading) { // If user logs out while on this screen
     return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <Ionicons name="log-in-outline" size={48} color="#888" style={{marginTop: 20}}/>
        <Text style={styles.messageText}>Please log in to see your posts.</Text>
        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      <FlatList
        data={posts}
        renderItem={({ item }) => <UserPostItem post={item} onDelete={handleDeletePost} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="documents-outline" size={60} color="#B0B0B0" />
              <Text style={styles.emptyStateText}>No posts yet.</Text>
              <Text style={styles.emptyStateSubText}>Create your first post to see it here!</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5, // Increase touchable area
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  listContentContainer: {
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  profilePicture: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
  },
  postHeaderTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  postTime: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8, // Make delete button easier to tap
  },
  postImage: {
    width: '100%',
    height: Dimensions.get('window').width * 0.6, // Image height based on screen width
    backgroundColor: '#E9ECEF',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContent: {
    padding: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  tag: {
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  postDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#343A40',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: Dimensions.get('window').height * 0.2,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6C757D',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#ADB5BD',
    marginTop: 4,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginVertical: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 15,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ViewHubPostsScreen;
