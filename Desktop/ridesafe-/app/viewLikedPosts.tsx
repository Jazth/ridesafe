import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image as RNImage,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/scripts/firebaseConfig'; // Your Firestore instance
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc, // For fetching user details for likes list
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where, // For filtering liked posts
  increment,
} from 'firebase/firestore';
import { useUserQueryLoginStore } from '@/constants/store'; // To get current user

const { width } = Dimensions.get('window');

// Re-using the Post interface from DiscoverScreen
export interface Post {
  id: string;
  userId: string; // UID of the post creator
  userName: string;
  userProfilePictureUrl?: string | null;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  createdAt?: Timestamp;
  likesCount?: number;
  likedBy?: string[];
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean; // Keep for consistency if PostItem expects it
}

// Re-using UserBasicInfo for the "Liked By" modal
export interface UserBasicInfo {
    id: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string | null;
}


const formatTimeAgo = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return 'Just Now';
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
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
};

// Adapted PostItem - it's mostly the same as in DiscoverScreen
const LikedPostItem: React.FC<{
  post: Post;
  currentUserId: string | null;
  onShowLikes: (likedBy: string[]) => void;
  // No onSave prop needed here unless you want to save/unsave from this screen too
}> = React.memo(({ post, currentUserId, onShowLikes }) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  // You might not need save functionality on this screen, but keep for consistency if PostItem is shared
  const [isSaved, setIsSaved] = useState(post.isSavedByCurrentUser || false);


  useEffect(() => {
    setIsLiked(post.isLikedByCurrentUser || false);
    setLikeCount(post.likesCount || 0);
    setIsSaved(post.isSavedByCurrentUser || false);
  }, [post.isLikedByCurrentUser, post.likesCount, post.isSavedByCurrentUser]);

  const handleLikeToggle = async () => {
    if (!currentUserId) {
      Alert.alert('Action Required', 'Please log in to like posts.');
      return;
    }
    if (!post.id) return;

    const postRef = doc(db, 'posts', post.id);
    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus); // Optimistic UI update
    setLikeCount(prevCount => (newLikedStatus ? prevCount + 1 : prevCount - 1)); // Optimistic

    try {
      await updateDoc(postRef, {
        likesCount: increment(newLikedStatus ? 1 : -1),
        likedBy: newLikedStatus ? arrayUnion(currentUserId) : arrayRemove(currentUserId),
      });
      console.log('Post like status updated in Firestore from LikedPostsScreen.');
    } catch (error) {
      console.error('Error updating like status from LikedPostsScreen:', error);
      setIsLiked(!newLikedStatus); // Revert optimistic update
      setLikeCount(prevCount => (newLikedStatus ? prevCount - 1 : prevCount + 1)); // Revert
      Alert.alert('Error', 'Could not update like. Please try again.');
    }
  };

  // Placeholder for save toggle if you decide to add it to this screen
  const handleSaveToggle = async () => {
    if (!currentUserId) {
      Alert.alert('Action Required', 'Please log in to save posts.');
      return;
    }
    // Implement save/unsave logic similar to DiscoverScreen if needed
    // For now, it just toggles local state
    const newSavedStatus = !isSaved;
    setIsSaved(newSavedStatus);
    Alert.alert('Save Action', newSavedStatus ? 'Post saved (locally)' : 'Post unsaved (locally)');
    // Remember to implement Firestore logic for saves if this button is functional
  };


  const defaultProfilePic = 'https://placehold.co/50x50/E0E0E0/B0B0B0/png?text=User';

  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <RNImage
          source={{ uri: post.userProfilePictureUrl || defaultProfilePic }}
          style={styles.profilePicture}
        />
        <View style={styles.postHeaderTextContainer}>
          <Text style={styles.userName}>{post.userName || 'Anonymous User'}</Text>
          {post.createdAt && <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>}
        </View>
      </View>

      {post.imageUrl && (
        <RNImage source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{post.title}</Text>
        {post.tags?.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.map(tag => (
              <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>
        )}
        <Text style={styles.postDescription} numberOfLines={3} ellipsizeMode="tail">
          {post.description}
        </Text>
        <View style={styles.postActions}>
          <TouchableOpacity onPress={handleLikeToggle} style={styles.actionIconTouchable}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? '#FF4500' : '#333'} />
            {likeCount > 0 && (
              <TouchableOpacity onPress={() => post.likedBy && onShowLikes(post.likedBy)}>
                 <Text style={styles.likeCountText}>{likeCount}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {/* Optional: Save button, if you want this functionality here */}
          {/* <TouchableOpacity onPress={handleSaveToggle} style={styles.actionIconTouchable}>
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={24} color={isSaved ? '#007AFF' : '#333'} />
          </TouchableOpacity> */}
        </View>
      </View>
    </View>
  );
});

// Re-using LikedByModal from DiscoverScreen
const LikedByModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    userIds: string[];
}> = ({ visible, onClose, userIds }) => {
    const [likedByUsers, setLikedByUsers] = useState<UserBasicInfo[]>([]);
    const [isLoadingLikes, setIsLoadingLikes] = useState(false);

    useEffect(() => {
        if (visible && userIds.length > 0) {
            const fetchLikedByUsers = async () => {
                setIsLoadingLikes(true);
                const usersData: UserBasicInfo[] = [];
                try {
                    // Fetch details for a limited number of users to avoid too many reads
                    const userIdsToFetch = userIds.slice(0, 20); // Example: fetch first 20
                    for (const userId of userIdsToFetch) {
                        const userDocRef = doc(db, 'users', userId);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            usersData.push({
                                id: userDocSnap.id,
                                firstName: userData.firstName || 'User',
                                lastName: userData.lastName || '',
                                profilePictureUrl: userData.profilePictureUrl || null,
                            });
                        } else {
                             usersData.push({ id: userId, firstName: 'Unknown', lastName: 'User' });
                        }
                    }
                    setLikedByUsers(usersData);
                } catch (error) {
                    console.error("Error fetching users who liked:", error);
                } finally {
                    setIsLoadingLikes(false);
                }
            };
            fetchLikedByUsers();
        } else if (!visible) {
            setLikedByUsers([]); // Clear data when modal is closed
        }
    }, [visible, userIds]);

    const defaultProfilePic = 'https://placehold.co/40x40/E0E0E0/B0B0B0/png?text=U';

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => { /* Prevents closing when tapping inside modal */ }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Liked by</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle-outline" size={28} color="#555" />
                        </TouchableOpacity>
                    </View>
                    {isLoadingLikes ? (
                        <ActivityIndicator size="small" color="#007AFF" style={{marginVertical: 20}}/>
                    ) : likedByUsers.length > 0 ? (
                        <FlatList
                            data={likedByUsers}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.likedByUserItem}>
                                    <RNImage
                                        source={{ uri: item.profilePictureUrl || defaultProfilePic }}
                                        style={styles.likedByUserImage}
                                    />
                                    <Text style={styles.likedByUserName}>
                                        {item.firstName} {item.lastName?.trim()}
                                    </Text>
                                </View>
                            )}
                        />
                    ) : (
                        <Text style={styles.noLikesText}>No one has liked this post yet.</Text>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};


const ViewLikedPostsScreen = () => {
  const router = useRouter();
  const { currentUser } = useUserQueryLoginStore();
  const currentUserId = currentUser?.id || null;

  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [isLikedByModalVisible, setIsLikedByModalVisible] = useState(false);
  const [userIdsForModal, setUserIdsForModal] = useState<string[]>([]);


  const fetchLikedPosts = useCallback(() => {
    if (!currentUserId) {
      setLoading(false);
      setError("Please log in to see your liked posts.");
      setLikedPosts([]);
      return () => {}; // Return an empty unsubscribe function
    }

    setLoading(true);
    const postsCollectionRef = collection(db, 'posts');
    // Query for posts where the 'likedBy' array contains the current user's ID
    const q = query(
      postsCollectionRef,
      where('likedBy', 'array-contains', currentUserId),
      orderBy('createdAt', 'desc') // Optional: order liked posts by when they were created
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const fetchedPosts: Post[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const likedByArray = Array.isArray(data.likedBy) ? data.likedBy : [];
          return {
            id: docSnap.id,
            userId: data.userId || '',
            userName: data.userName || 'Unknown User',
            userProfilePictureUrl: data.userProfilePictureUrl || null,
            title: data.title || 'No Title',
            description: data.description || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            imageUrl: data.imageUrl,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
            likesCount: data.likesCount || 0,
            likedBy: likedByArray,
            isLikedByCurrentUser: true, // All posts here are liked by the current user
            // isSavedByCurrentUser: check if saved (requires fetching saved posts list if needed)
          };
        });
        setLikedPosts(fetchedPosts);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        console.log('Fetched liked posts:', fetchedPosts.length);
      },
      err => {
        console.error('Error fetching liked posts:', err);
        setError('Failed to fetch liked posts. Please try again.');
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsubscribe;
  }, [currentUserId]);

  useEffect(() => {
    const unsubscribe = fetchLikedPosts();
    return () => unsubscribe(); // Cleanup on unmount
  }, [fetchLikedPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLikedPosts();
  }, [fetchLikedPosts]);

  const handleShowLikes = (likedByUserIds: string[]) => {
    setUserIdsForModal(likedByUserIds);
    setIsLikedByModalVisible(true);
  };

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/Profile')} style={styles.backButton}>
        <Ionicons name="arrow-back-outline" size={26} color="#333" />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Liked Posts</Text>
      <View style={{ width: 26 }} /> {/* Spacer for centering title */}
    </View>
  );

  if (!currentUserId && !loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <Ionicons name="log-in-outline" size={48} color="#888" style={{marginTop: 20}}/>
        <Text style={styles.messageText}>Please log in to view your liked posts.</Text>
         <TouchableOpacity onPress={() => router.replace('/login')} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading && likedPosts.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        <Text style={styles.messageText}>Loading liked posts...</Text>
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
        data={likedPosts}
        renderItem={({ item }) => (
          <LikedPostItem
            post={item}
            currentUserId={currentUserId}
            onShowLikes={handleShowLikes}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="heart-dislike-outline" size={60} color="#B0B0B0" />
              <Text style={styles.emptyStateText}>No liked posts yet.</Text>
              <Text style={styles.emptyStateSubText}>Posts you like will appear here.</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"}/>
        }
      />
       <LikedByModal
        visible={isLikedByModalVisible}
        onClose={() => setIsLikedByModalVisible(false)}
        userIds={userIdsForModal}
      />
    </SafeAreaView>
  );
};

// Styles (largely reused from DiscoverScreen, with minor adjustments if needed)
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
    padding: 5,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  listContentContainer: {
    paddingBottom: 20, // Adjusted padding
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
  postImage: {
    width: '100%',
    height: width * 0.7,
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
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
  actionIconTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  likeCountText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: width * 0.3,
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
  // Modal styles (reused)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15, // Adjusted padding
    width: '85%',
    maxHeight: '70%', // Adjusted maxHeight
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  likedByUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  likedByUserItemLast: { // Style for the last item to remove border
    borderBottomWidth: 0,
  },
  likedByUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12, // Increased margin
    backgroundColor: '#E0E0E0',
  },
  likedByUserName: {
    fontSize: 16,
    color: '#333',
  },
  noLikesText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontSize: 15,
  }
});

export default ViewLikedPostsScreen;
