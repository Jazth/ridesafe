import { useUserQueryLoginStore } from '@/constants/store'; // Ensure this path is correct
import { db } from '@/scripts/firebaseConfig'; // Ensure this path is correct
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp, // For fetching user details
  where
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Image as RNImage,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// From discover.tsx - ensure these are consistent or imported from a shared types file
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
  likesCount?: number;
  likedBy?: string[];
  // ... other post fields
}

export interface UserBasicInfo {
    id: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string | null;
}

// Interface for an aggregated "Like Activity" item
export interface LikeActivityItem {
  id: string; // Unique key for the list, e.g., `postId-likerId`
  postId: string;
  postTitle: string;
  postImageUrl?: string | null; // Image of the post that was liked
  liker: UserBasicInfo;       // Information about the user who liked the post
  likedAt: Timestamp;         // Timestamp of the post creation (as a proxy for activity time)
                                // Ideally, you'd store like timestamps for accurate sorting
}


// This interface might be part of your store or defined elsewhere
export interface CurrentUserInfo {
    id: string;
    // Add other fields from your user store as needed
}

const formatTimeAgo = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'Just Now';
  const now = new Date();
  const activityDate = timestamp.toDate();
  const seconds = Math.round((now.getTime() - activityDate.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
};


const ActivityScreen = () => {
  const { currentUser } = useUserQueryLoginStore() as { currentUser: CurrentUserInfo | null };
  const currentUserId = currentUser?.id || null;

  const [likeActivities, setLikeActivities] = useState<LikeActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLikeActivities = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      setError("User not logged in.");
      setLikeActivities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const postsCollectionRef = collection(db, 'posts');
      // Query for posts created by the current user
      const q = query(
        postsCollectionRef,
        where('userId', '==', currentUserId),
        orderBy('createdAt', 'desc') // Get user's most recent posts first
      );

      const postsSnapshot = await getDocs(q);
      const activities: LikeActivityItem[] = [];

      // Iterate over each post by the current user
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data() as Post;
        if (postData.likedBy && postData.likedBy.length > 0) {
          // Iterate over users who liked this specific post
          for (const likerId of postData.likedBy) {
            // Don't show self-likes as activity for "others liked your post"
            if (likerId === currentUserId) continue;

            try {
              const userDocRef = doc(db, 'users', likerId);
              const userDocSnap = await getDoc(userDocRef);

              if (userDocSnap.exists()) {
                const likerData = userDocSnap.data();
                activities.push({
                  id: `${postDoc.id}-${likerId}`, // Composite key
                  postId: postDoc.id,
                  postTitle: postData.title,
                  postImageUrl: postData.imageUrl || null,
                  liker: {
                    id: likerId,
                    firstName: likerData.firstName || 'Unknown',
                    lastName: likerData.lastName || '',
                    profilePictureUrl: likerData.profilePictureUrl || null,
                  },
                  // Using post's createdAt as a proxy for when the activity might be relevant.
                  // For true chronological like activity, each 'like' would need its own timestamp.
                  likedAt: postData.createdAt || Timestamp.now(),
                });
              } else {
                 activities.push({ // Fallback if liker's user doc is missing
                  id: `${postDoc.id}-${likerId}`,
                  postId: postDoc.id,
                  postTitle: postData.title,
                  postImageUrl: postData.imageUrl || null,
                  liker: { id: likerId, firstName: 'An unknown user' },
                  likedAt: postData.createdAt || Timestamp.now(),
                });
              }
            } catch (userFetchError) {
                console.error(`Error fetching user ${likerId}:`, userFetchError);
                // Optionally add a fallback activity item here too
            }
          }
        }
      }

      // Sort all activities by the (proxied) likedAt timestamp, most recent first
      activities.sort((a, b) => b.likedAt.toMillis() - a.likedAt.toMillis());

      setLikeActivities(activities);
    } catch (err) {
      console.error('Error fetching like activities:', err);
      setError('Failed to fetch recent activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchLikeActivities();
  }, [fetchLikeActivities]);

  // Optional: Refetch when screen is focused if you expect data to change frequently
  // while the user is away from this screen.
  useFocusEffect(
    useCallback(() => {
      // Only refetch if not initial load, to avoid double fetch on mount
      if (!loading) {
        fetchLikeActivities();
      }
    }, [loading, fetchLikeActivities])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLikeActivities();
  };

  const handleActivityPress = (activity: LikeActivityItem) => {
    // Navigate to the post that was liked
    if (activity.postId) {
      // router.push(`/post/${activity.postId}`); // Adjust route as needed
      Alert.alert("Notification", `User ${activity.liker.firstName} liked your post: ${activity.postTitle}`);
    }
  };

  const renderActivityItem = ({ item }: { item: LikeActivityItem }) => {
    const defaultLikerProfilePic = 'https://placehold.co/40x40/E0E0E0/B0B0B0/png?text=U';
    const defaultPostImage = 'https://placehold.co/40x40/CCCCCC/999999/png?text=Post';

    return (
      <TouchableOpacity
        style={styles.activityItem}
        onPress={() => handleActivityPress(item)}
      >
        <RNImage
            source={{ uri: item.liker.profilePictureUrl || defaultLikerProfilePic }}
            style={styles.profileImage}
        />
        <View style={styles.activityTextContainer}>
          <Text style={styles.activityMessage} numberOfLines={2}>
            <Text style={styles.likerName}>{`${item.liker.firstName || ''} ${item.liker.lastName || ''}`.trim()}</Text>
            {` liked your post: `}
            <Text style={styles.postTitleSnippet}>{item.postTitle}</Text>
          </Text>
          <Text style={styles.activityTime}>{formatTimeAgo(item.likedAt)}</Text>
        </View>
        {item.postImageUrl && (
            <RNImage
                source={{ uri: item.postImageUrl || defaultPostImage }}
                style={styles.postThumbnail}
            />
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/user/Discover')} style={styles.backButton}>
        <Ionicons name="arrow-back" size={26} color="#FF5722" />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Recent Activity</Text>
      <View style={{width: 26}} />{/* Placeholder for balance */}
    </View>
  );

  if (loading && likeActivities.length === 0) { // Show loading only on initial load
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <Ionicons name="warning-outline" size={48} color="red" style={{ marginTop: 20 }} />
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
        data={likeActivities}
        renderItem={renderActivityItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          !loading ? ( // Don't show "no activity" if still loading
            <View style={styles.emptyStateContainer}>
              <Ionicons name="sparkles-outline" size={60} color="#B0B0B0" />
              <Text style={styles.emptyStateText}>No recent like activity.</Text>
              <Text style={styles.emptyStateSubText}>When someone likes your posts, you'll see it here.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={likeActivities.length === 0 && !loading ? styles.centered : styles.listContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"}/>
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
    flex: 1,
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
  backButton: {
    padding: 5,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  listContentContainer: {
    paddingVertical: 8,
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileImage: { // Liker's profile image
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E9ECEF',
  },
  activityTextContainer: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 3,
  },
  likerName: {
    fontWeight: 'bold',
  },
  postTitleSnippet: {
    fontStyle: 'italic',
  },
  activityTime: {
    fontSize: 12,
    color: '#777777',
  },
  postThumbnail: { // Thumbnail of the liked post
    width: 48,
    height: 48,
    borderRadius: 6,
    marginLeft: 10,
    backgroundColor: '#E9ECEF',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    // marginTop: '30%', // Removed to allow contentContainerStyle to center
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
    backgroundColor: '#FF5722',
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

export default ActivityScreen;
