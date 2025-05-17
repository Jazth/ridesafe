import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image as RNImage,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/scripts/firebaseConfig'; 
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp, 
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userProfilePictureUrl?: string | null;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  createdAt?: Timestamp; // Make createdAt optional for robustness, but it's needed for ordering
  // Add other fields like likes, saves count if you have them
  isLiked?: boolean; // For local state or if fetched
  isSaved?: boolean; // For local state or if fetched
}

// Utility function to format Firestore Timestamp to a "time ago" string
const formatTimeAgo = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'just now'; // Fallback if timestamp is missing
  const now = new Date();
  const postDate = timestamp.toDate(); // Convert Firestore Timestamp to JS Date
  const seconds = Math.round((now.getTime() - postDate.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30); // Approximate
  const years = Math.round(days / 365); // Approximate

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
};

// Component to render a single post item
const PostItem: React.FC<{ post: Post }> = React.memo(({ post }) => {
  // React.memo for performance optimization with FlatList
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: Implement logic to update like status in Firestore for post.id
    console.log(isLiked ? 'Unliked post:' : 'Liked post:', post.id);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    // TODO: Implement logic to update save status in Firestore for post.id
    console.log(isSaved ? 'Unsaved post:' : 'Saved post:', post.id);
  };

  const defaultProfilePic = 'https://placehold.co/50x50/E0E0E0/B0B0B0/png?text=User';
  const placeholderImage = 'https://placehold.co/600x400/CCCCCC/FFFFFF/png?text=No+Image';

  return (
    <View style={styles.postContainer}>
      {/* Post Header: User Info */}
      <View style={styles.postHeader}>
        <RNImage
          source={{ uri: post.userProfilePictureUrl || defaultProfilePic }}
          style={styles.profilePicture}
          onError={(e) => console.log("Failed to load profile picture:", e.nativeEvent.error)}
        />
        <View style={styles.postHeaderTextContainer}>
          <Text style={styles.userName}>{post.userName || 'Anonymous User'}</Text>
          {post.createdAt && <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>}
        </View>
      </View>

      {/* Post Image (if available) */}
      {post.imageUrl ? (
        <RNImage
          source={{ uri: post.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
          onError={(e) => console.log("Failed to load post image:", e.nativeEvent.error)}
        />
      ) : (
        <View style={[styles.postImage, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={80} color="#B0B0B0" />
        </View>
      )}


      {/* Post Content */}
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

        <Text style={styles.postDescription} numberOfLines={3} ellipsizeMode="tail">
          {post.description}
        </Text>
        {/* TODO: Add a "Read More" button if description is long */}

        {/* Action Icons: Like, Save */}
        <View style={styles.postActions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionIconTouchable}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? '#FF4500' : '#333'} />
            {/* Optional: Display like count */}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.actionIconTouchable}>
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={24} color={isSaved ? '#007AFF' : '#333'} />
          </TouchableOpacity>
          {/* You can add a comment icon/button here if needed */}
        </View>
      </View>
    </View>
  );
});

const DiscoverScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // For pull-to-refresh

  const fetchPosts = useCallback(() => {
    // Ensure createdAt field exists and is a Timestamp for ordering.
    // If posts are missing 'createdAt', they might not appear or cause errors.
    const postsCollectionRef = collection(db, 'posts');
    const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

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
            // Initialize isLiked/isSaved if needed, e.g., from user-specific data
            isLiked: false, 
            isSaved: false,
          };
        });
        setPosts(fetchedPosts);
        setError(null);
        setLoading(false);
        setRefreshing(false); // Stop pull-to-refresh indicator
        console.log('Fetched posts:', fetchedPosts.length);
      },
      err => {
        console.error('Error fetching posts:', err);
        setError('Failed to fetch posts. Please try again.');
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsubscribe; // Return unsubscribe function for cleanup
  }, []);


  useEffect(() => {
    setLoading(true);
    const unsubscribe = fetchPosts();
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts(); // Re-fetch posts
  }, [fetchPosts]);


  const navigateToCreatePost = () => {
    router.push('/createPostScreen'); // Use push for better navigation stack, or replace if preferred
  };

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <Text style={styles.screenTitle}>Discover</Text>
      <TouchableOpacity style={styles.notificationIcon}>
        <Ionicons name="notifications-outline" size={26} color="#333" />
      </TouchableOpacity>
    </View>
  );


  if (loading && posts.length === 0) { // Show loading only on initial load
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}}/>
        <Text style={{ marginTop: 10, color: '#555' }}>Loading posts...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostItem post={item} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          !loading ? ( // Show only if not loading and posts are empty
            <View style={styles.emptyStateContainer}>
              <Ionicons name="compass-outline" size={60} color="#B0B0B0" />
              <Text style={styles.emptyStateText}>No posts yet.</Text>
              <Text style={styles.emptyStateSubText}>Be the first to share something!</Text>
            </View>
          ) : null
        }
        refreshControl={ // Added pull-to-refresh
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"}/>
        }
      />
      {/* Floating Action Button to Create Post */}
      <TouchableOpacity style={styles.fab} onPress={navigateToCreatePost}>
        <Ionicons name="add-outline" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Lighter, modern background
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  notificationIcon: {
    padding: 8, // Make touch target larger
  },
  listContentContainer: {
    paddingBottom: 80, // Space for FAB
    paddingHorizontal: 8, // Add some horizontal padding for posts
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 8, // Consistent horizontal margin
    overflow: 'hidden', // Ensures image corners are rounded if image itself isn't
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
    backgroundColor: '#E0E0E0', // Placeholder background
  },
  postHeaderTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600', // Semi-bold for better readability
    color: '#1C1C1E',
  },
  postTime: {
    fontSize: 12,
    color: '#6C757D', // Softer gray
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: width * 0.7, // Adjust aspect ratio as needed, e.g. 16:9 or 4:3
    backgroundColor: '#E9ECEF', // Placeholder for image loading
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContent: {
    padding: 12,
  },
  postTitle: {
    fontSize: 18, // Slightly smaller for balance
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow tags to wrap
    marginBottom: 10,
    gap: 6, // Use gap for spacing between tags
  },
  tag: {
    backgroundColor: '#E9ECEF', // Lighter tag background
    borderRadius: 12, // Pill-shaped tags
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    fontSize: 12,
    color: '#495057', // Darker gray for tag text
    fontWeight: '500',
  },
  postDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#343A40', // Slightly darker for better contrast
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5', // Very light separator
  },
  actionIconTouchable: {
    flexDirection: 'row', // For icon and text (e.g., like count)
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12, // More touch area
    marginRight: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 10,
    bottom: 10,
    backgroundColor: '#007AFF', // iOS Blue
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: width * 0.3, // Push it down a bit
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

export default DiscoverScreen;
