import { useUserQueryLoginStore } from '@/constants/store';
import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc, // For filtering saved posts
    increment,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    updateDoc,
    where, // For filtering saved posts
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    RefreshControl,
    Image as RNImage,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Consistent Post interface
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
  savesCount?: number; // Included for consistency and potential display
  savedBy?: string[];   // Included for consistency
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
}

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

// This item component can be largely shared or adapted
const FavoritePostItem: React.FC<{
  post: Post;
  currentUserId: string | null;
  onShowLikes: (likedBy: string[]) => void;
  onToggleSave: (postId: string, currentSaveStatus: boolean) => void; // Renamed for clarity
}> = React.memo(({ post, currentUserId, onShowLikes, onToggleSave }) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  // isSaved will be true for all items initially on this screen
  const [isSavedForThisItem, setIsSavedForThisItem] = useState(true);
  const [saveCount, setSaveCount] = useState(post.savesCount || 0);


  useEffect(() => {
    setIsLiked(post.isLikedByCurrentUser || false);
    setLikeCount(post.likesCount || 0);
    setIsSavedForThisItem(post.isSavedByCurrentUser || true); // Default to true on this screen
    setSaveCount(post.savesCount || 0);
  }, [post.isLikedByCurrentUser, post.likesCount, post.isSavedByCurrentUser, post.savesCount]);

  const handleLikeToggle = async () => {
    if (!currentUserId || !post.id) {
      Alert.alert('Action Required', 'Please log in to interact with posts.');
      return;
    }
    const postRef = doc(db, 'posts', post.id);
    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);
    setLikeCount(prev => newLikedStatus ? prev + 1 : prev - 1);
    try {
      await updateDoc(postRef, {
        likesCount: increment(newLikedStatus ? 1 : -1),
        likedBy: newLikedStatus ? arrayUnion(currentUserId) : arrayRemove(currentUserId),
      });
    } catch (error) {
      console.error('Error updating like status:', error);
      setIsLiked(!newLikedStatus);
      setLikeCount(prev => newLikedStatus ? prev - 1 : prev + 1);
      Alert.alert('Error', 'Could not update like. Please try again.');
    }
  };

  const handleSaveToggleClick = () => {
    if (!currentUserId || !post.id) return;
    // Call the prop function to handle the Firestore update
    // The local state `isSavedForThisItem` will be updated via prop changes from the parent
    onToggleSave(post.id, isSavedForThisItem);
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
          <TouchableOpacity onPress={handleSaveToggleClick} style={styles.actionIconTouchable}>
            {/* On this screen, the icon is always filled because it's a "favorite" */}
            <Ionicons name={'bookmark'} size={24} color={'#007AFF'} />
            {/* Optionally display saveCount */}
            {/* {saveCount > 0 && <Text style={styles.likeCountText}>{saveCount}</Text>} */}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

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
                    const userIdsToFetch = userIds.slice(0, 20);
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
            setLikedByUsers([]);
        }
    }, [visible, userIds]);
    const defaultProfilePic = 'https://placehold.co/40x40/E0E0E0/B0B0B0/png?text=U';
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
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
                                    <RNImage source={{ uri: item.profilePictureUrl || defaultProfilePic }} style={styles.likedByUserImage} />
                                    <Text style={styles.likedByUserName}>{item.firstName} {item.lastName?.trim()}</Text>
                                </View>
                            )} />
                    ) : (<Text style={styles.noLikesText}>No one has liked this post yet.</Text>)}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const ViewFavoritePostsScreen = () => {
  const router = useRouter();
  const { currentUser } = useUserQueryLoginStore();
  const currentUserId = currentUser?.id || null;

  const [favoritePosts, setFavoritePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [isLikedByModalVisible, setIsLikedByModalVisible] = useState(false);
  const [userIdsForModal, setUserIdsForModal] = useState<string[]>([]);

  const fetchFavoritePosts = useCallback(() => {
    if (!currentUserId) {
      setLoading(false);
      setError("Please log in to see your favorite posts.");
      setFavoritePosts([]);
      return () => {};
    }

    setLoading(true);
    const postsCollectionRef = collection(db, 'posts');
    const q = query(
      postsCollectionRef,
      where('savedBy', 'array-contains', currentUserId), // Query based on savedBy array
      orderBy('createdAt', 'desc') // Or order by a 'savedAt' field if you add it to the main post
    );

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const fetchedPosts: Post[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const likedByArray = Array.isArray(data.likedBy) ? data.likedBy : [];
          const savedByArray = Array.isArray(data.savedBy) ? data.savedBy : [];
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
            savesCount: data.savesCount || 0,
            savedBy: savedByArray,
            isLikedByCurrentUser: currentUserId ? likedByArray.includes(currentUserId) : false,
            isSavedByCurrentUser: true, // All posts here are considered saved by the current user
          };
        });
        setFavoritePosts(fetchedPosts);
        setError(null);
        setLoading(false);
        setRefreshing(false);
      },
      err => {
        console.error('Error fetching favorite posts:', err);
        setError('Failed to fetch your favorite posts.');
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsubscribe;
  }, [currentUserId]);

  useEffect(() => {
    const unsubscribe = fetchFavoritePosts();
    return () => unsubscribe();
  }, [fetchFavoritePosts]);

  const handleToggleSave = async (postId: string, currentIsSaved: boolean) => {
    if (!currentUserId) return;
    const postRef = doc(db, 'posts', postId);
    const newSavedStatus = !currentIsSaved; // This will always be false here, meaning "unsave"

    // Optimistically update UI by removing the post from the list
    // The onSnapshot listener will then confirm this from Firestore
    if (!newSavedStatus) { // If unsaving
        setFavoritePosts(prev => prev.filter(p => p.id !== postId));
    }

    try {
      await updateDoc(postRef, {
        savesCount: increment(newSavedStatus ? 1 : -1), // Decrement if unsaving
        savedBy: newSavedStatus ? arrayUnion(currentUserId) : arrayRemove(currentUserId), // Remove user
      });
      Alert.alert(
        newSavedStatus ? 'Post Saved' : 'Removed from Favorites',
        newSavedStatus ? 'Post added back to your favorites.' : 'Post removed from your favorites.'
      );
    } catch (error) {
      console.error('Error updating save status:', error);
      // If error, might need to re-fetch or add the post back to the list if UI was too optimistic
      Alert.alert('Error', 'Could not update favorite status.');
      if (!newSavedStatus) { // If unsaving failed, re-fetch to be safe
        fetchFavoritePosts();
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavoritePosts();
  }, [fetchFavoritePosts]);

  const handleShowLikes = (likedByUserIds: string[]) => {
    setUserIdsForModal(likedByUserIds);
    setIsLikedByModalVisible(true);
  };

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/user/Profile')} style={styles.backButton}>
        <Ionicons name="arrow-back-outline" size={26} color="#333" />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Favorite Posts</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (!currentUserId && !loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <Ionicons name="log-in-outline" size={48} color="#888" style={{marginTop: 20}}/>
        <Text style={styles.messageText}>Please log in to view your favorite posts.</Text>
         <TouchableOpacity onPress={() => router.replace('/login')} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading && favoritePosts.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        <Text style={styles.messageText}>Loading favorite posts...</Text>
      </SafeAreaView>
    );
  }

   if (error && !loading) {
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
        data={favoritePosts}
        renderItem={({ item }) => (
          <FavoritePostItem
            post={item}
            currentUserId={currentUserId}
            onShowLikes={handleShowLikes}
            onToggleSave={handleToggleSave} // Pass the correct handler
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="bookmark-outline" size={60} color="#B0B0B0" />
              <Text style={styles.emptyStateText}>No favorite posts yet.</Text>
              <Text style={styles.emptyStateSubText}>Posts you save will appear here.</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    width: '85%',
    maxHeight: '70%',
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
  likedByUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
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

export default ViewFavoritePostsScreen;
