<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
import { useUserQueryLoginStore } from '@/constants/store';
import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
<<<<<<< HEAD
=======
=======
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
<<<<<<< HEAD
  Modal,
  RefreshControl,
  Image as RNImage,
=======
<<<<<<< HEAD
  Modal,
  RefreshControl,
  Image as RNImage,
=======
  Image as RNImage,
  RefreshControl,
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
<<<<<<< HEAD
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
=======
<<<<<<< HEAD
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
=======
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '@/scripts/firebaseConfig';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore';
import { useUserQueryLoginStore } from '@/constants/store';
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5

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
  createdAt?: Timestamp;
  likesCount?: number;
  likedBy?: string[];
  savesCount?: number;
  savedBy?: string[];
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

const PostItem: React.FC<{
  post: Post;
  currentUserId: string | null;
  onShowLikes: (likedBy: string[]) => void;
}> = React.memo(({ post, currentUserId, onShowLikes }) => {
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState(post.isSavedByCurrentUser || false);
  const [saveCount, setSaveCount] = useState(post.savesCount || 0);


  useEffect(() => {
    setIsLiked(post.isLikedByCurrentUser || false);
    setLikeCount(post.likesCount || 0);
    setIsSaved(post.isSavedByCurrentUser || false);
    setSaveCount(post.savesCount || 0);
  }, [post.isLikedByCurrentUser, post.likesCount, post.isSavedByCurrentUser, post.savesCount]);

  const handleLikeToggle = async () => {
    if (!currentUserId) {
      Alert.alert('Action Required', 'Please log in to like posts.');
      return;
    }
    if (!post.id) return;

    const postRef = doc(db, 'posts', post.id);
    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);
    setLikeCount(prevCount => (newLikedStatus ? prevCount + 1 : prevCount - 1));

    try {
      await updateDoc(postRef, {
        likesCount: increment(newLikedStatus ? 1 : -1),
        likedBy: newLikedStatus ? arrayUnion(currentUserId) : arrayRemove(currentUserId),
      });
      console.log('Post like status updated in Firestore.');
    } catch (error) {
      console.error('Error updating like status:', error);
      setIsLiked(!newLikedStatus);
      setLikeCount(prevCount => (newLikedStatus ? prevCount - 1 : prevCount + 1));
      Alert.alert('Error', 'Could not update like. Please try again.');
    }
  };

  const handleSaveToggle = async () => {
    if (!currentUserId) {
      Alert.alert('Action Required', 'Please log in to save posts.');
      return;
    }
    if (!post.id) return;

    const postRef = doc(db, 'posts', post.id);
    const newSavedStatus = !isSaved;
    setIsSaved(newSavedStatus);
    setSaveCount(prevCount => (newSavedStatus ? prevCount + 1 : prevCount - 1));


    try {
      await updateDoc(postRef, {
        savesCount: increment(newSavedStatus ? 1 : -1), // Ensure this line is active
        savedBy: newSavedStatus ? arrayUnion(currentUserId) : arrayRemove(currentUserId),
      });
      Alert.alert('Post Status', newSavedStatus ? 'Post added to your saved items.' : 'Post removed from your saved items.');
    } catch (error) {
      console.error('Error updating save status:', error);
      setIsSaved(!newSavedStatus);
      setSaveCount(prevCount => (newSavedStatus ? prevCount - 1 : prevCount + 1));
      Alert.alert('Error', 'Could not update save status. Please try again.');
    }
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
          <TouchableOpacity onPress={handleSaveToggle} style={styles.actionIconTouchable}>
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={24} color={isSaved ? '#007AFF' : '#333'} />
             {/* Optionally display saveCount here if desired */}
             {saveCount > 0 && <Text style={styles.likeCountText}>{saveCount}</Text>}
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
                    for (const userId of userIds) {
                        const userDocRef = doc(db, 'users', userId);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const userData = userDocSnap.data();
                            usersData.push({
                                id: userDocSnap.id,
                                firstName: userData.firstName || 'Unknown',
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
        } else if(!visible) { // Clear data when modal is not visible
            setLikedByUsers([]);
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
                <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {/* Prevents closing on inner tap */}}>
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


const DiscoverScreen = () => {
  const { currentUser } = useUserQueryLoginStore();
  const currentUserId = currentUser?.id || null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [isLikedByModalVisible, setIsLikedByModalVisible] = useState(false);
  const [userIdsForModal, setUserIdsForModal] = useState<string[]>([]);

  const fetchPosts = useCallback(() => {
    const postsCollectionRef = collection(db, 'posts');
    const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

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
            isSavedByCurrentUser: currentUserId ? savedByArray.includes(currentUserId) : false,
          };
        });
        setPosts(fetchedPosts);
        setError(null);
        setLoading(false);
        setRefreshing(false);
      },
      err => {
        console.error('Error fetching posts:', err);
        setError('Failed to fetch posts. Please try again.');
        setLoading(false);
        setRefreshing(false);
      }
    );
    return unsubscribe;
  }, [currentUserId]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = fetchPosts();
    return () => unsubscribe();
  }, [fetchPosts]);


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  const handleShowLikes = (likedByUserIds: string[]) => {
    setUserIdsForModal(likedByUserIds);
    setIsLikedByModalVisible(true);
  };

  const navigateToCreatePost = () => {
    if (!currentUserId) {
      Alert.alert("Action Required", "Please log in to create a post.");
      return;
    }
    router.push('/createPostScreen');
  };
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
  const notificationpage = () => {
    router.replace('../notifications')
  }
  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <Text style={styles.screenTitle}>Discover</Text>
      <TouchableOpacity style={styles.notificationIcon} onPress={notificationpage}>
<<<<<<< HEAD
=======
=======

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <Text style={styles.screenTitle}>Discover</Text>
      <TouchableOpacity style={styles.notificationIcon}>
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
        <Ionicons name="notifications-outline" size={26} color="#FF5722" />
      </TouchableOpacity>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        <Text style={{ marginTop: 10, color: '#555' }}>Loading posts...</Text>
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
        data={posts}
        renderItem={({ item }) => (
          <PostItem
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
              <Ionicons name="compass-outline" size={60} color="#B0B0B0" />
              <Text style={styles.emptyStateText}>No posts yet.</Text>
              <Text style={styles.emptyStateSubText}>Be the first to share something!</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />
        }
      />
      <TouchableOpacity style={styles.fab} onPress={navigateToCreatePost}>
        <Ionicons name="add-outline" size={30} color="white" />
      </TouchableOpacity>
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
    color: '#FF5722',
  },
  notificationIcon: {
    padding: 8,
  },
  listContentContainer: {
    paddingBottom: 80,
    paddingHorizontal: 8,
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
    marginHorizontal: 8,
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 10,
    bottom: 10,
<<<<<<< HEAD
    backgroundColor: '#FF5722',
=======
<<<<<<< HEAD
    backgroundColor: '#FF5722',
=======
    backgroundColor: '#007AFF',
>>>>>>> 37131de55e8a1344d5b8276595e16875b0564bf4
>>>>>>> 6d11d91f191d747b1e3937cdd953aaf6a6cf41b5
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
    padding: 20,
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
  },
  likedByUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#E0E0E0',
  },
  likedByUserName: {
    fontSize: 16,
  },
  noLikesText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  }
});

export default DiscoverScreen;
