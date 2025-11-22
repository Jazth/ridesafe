import { CommentsSection } from '@/app/commentSection';
import { useUserQueryLoginStore } from '@/constants/store';
import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addDoc, serverTimestamp } from "firebase/firestore";

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  currentUser: any;
  onShowLikes: (likedBy: string[]) => void;
}> = React.memo(({ post, currentUserId, currentUser, onShowLikes }) => {
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
    if (!post.id || !post.userId) return;

    const postRef = doc(db, 'posts', post.id);
    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);
    setLikeCount(prevCount => (newLikedStatus ? prevCount + 1 : prevCount - 1));

    try {
      await updateDoc(postRef, {
        likesCount: increment(newLikedStatus ? 1 : -1),
        likedBy: newLikedStatus ? arrayUnion(currentUserId) : arrayRemove(currentUserId),
      });

      if (newLikedStatus && post.userId !== currentUserId) {
        const senderName = currentUser?.firstName || currentUser?.userName || 'Someone';
        const postTitle = post.title && post.title.trim() !== '' ? post.title : 'Untitled post';

        await addDoc(collection(db, "notifications"), {
          receiverId: post.userId,
          senderId: currentUserId,
          senderName,
          senderProfileUrl: currentUser?.profilePictureUrl || null,
          message: `${senderName} liked your post: "${postTitle}"`,
          createdAt: serverTimestamp(),
          postId: post.id,
          postTitle,
          postImageUrl: post.imageUrl || null,
          type: "like",
        });
      }

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
    if (!post.id || !post.userId) return;

    const postRef = doc(db, 'posts', post.id);
    const newSavedStatus = !isSaved;
    setIsSaved(newSavedStatus);
    setSaveCount(prevCount => (newSavedStatus ? prevCount + 1 : prevCount - 1));

    try {
      await updateDoc(postRef, {
        savesCount: increment(newSavedStatus ? 1 : -1),
        savedBy: newSavedStatus ? arrayUnion(currentUserId) : arrayRemove(currentUserId),
      });

      if (newSavedStatus && post.userId !== currentUserId) {
        const senderName = currentUser?.firstName || currentUser?.userName || 'Someone';
        const postTitle = post.title && post.title.trim() !== '' ? post.title : 'Untitled post';

        await addDoc(collection(db, "notifications"), {
          receiverId: post.userId,
          senderId: currentUserId,
          senderName,
          senderProfileUrl: currentUser?.profilePictureUrl || null,
          message: `${senderName} saved your post: "${postTitle}"`,
          createdAt: serverTimestamp(),
          postId: post.id,
          postTitle,
          postImageUrl: post.imageUrl || null,
          type: "save",
        });
      }
    } catch (error) {
      console.error('Error updating save status:', error);
      setIsSaved(!newSavedStatus);
      setSaveCount(prevCount => (newSavedStatus ? prevCount - 1 : prevCount + 1));
      Alert.alert('Error', 'Could not update save status. Please try again.');
    }
  };

  const defaultProfilePic = 'https://placehold.co/50x50/E0E0E0/B0B0B0/png?text=User';

  const handleAskAIRiderCardo = () => {
    const prompt = `Explain or give advice about this topic: "${post.title}". Description: "${post.description}"`;
    router.push({
      pathname: '/chatbot',
      params: { prompt },
    });
  };

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

        {/* ✅ Ask AI Rider Cardo button */}
        <TouchableOpacity style={styles.askAIButton} onPress={handleAskAIRiderCardo}>
          <Ionicons name="chatbubbles-outline" size={20} color="white" />
          <Text style={styles.askAIButtonText}>Ask AI Rider Cardo</Text>
        </TouchableOpacity>

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
            {saveCount > 0 && <Text style={styles.likeCountText}>{saveCount}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});


// 🔵 Floating Chatbot Button + Everything else remains unchanged below
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

  const goToChatbot = () => {
    router.push('/chatbot');
  };

  const notificationpage = () => {
    router.replace('../notifications');
  };

  const renderHeader = () => (
    <View style={styles.screenHeader}>
      <Text style={styles.screenTitle}>Discover</Text>
      <TouchableOpacity style={styles.notificationIcon} onPress={notificationpage}>
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
          <View style={{ marginBottom: 12 }}>
            <PostItem
              post={item}
              currentUserId={currentUserId}
              currentUser={currentUser}
              onShowLikes={handleShowLikes}
            />
            <CommentsSection postId={item.id} currentUser={currentUserId ? currentUser : null} />
          </View>
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} tintColor={"#007AFF"} />}
      />

      {/* 🔵 Floating Chatbot Button */}
      <TouchableOpacity style={styles.chatbotFab} onPress={goToChatbot}>
        <Ionicons name="chatbubbles-outline" size={26} color="white" />
      </TouchableOpacity>

      {/* 🟠 Floating Add Post Button */}
      <TouchableOpacity style={styles.fab} onPress={navigateToCreatePost}>
        <Ionicons name="add-outline" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F2F5' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: '#FF5722' },
  notificationIcon: { padding: 8 },
  listContentContainer: { paddingBottom: 120, paddingHorizontal: 8 },
  postContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, marginVertical: 8, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  profilePicture: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#E0E0E0' },
  postHeaderTextContainer: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  postTime: { fontSize: 12, color: '#6C757D', marginTop: 2 },
  postImage: { width: '100%', height: width * 0.7, backgroundColor: '#E9ECEF' },
  postContent: { padding: 12 },
  postTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#1C1C1E' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 6 },
  tag: { backgroundColor: '#E9ECEF', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  tagText: { color: '#495057', fontSize: 12 },
  postDescription: { fontSize: 15, color: '#343A40', marginBottom: 10 },
  postActions: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 8 },
  actionIconTouchable: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  likeCountText: { marginLeft: 4, color: '#6C757D', fontSize: 14 },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#FF5722', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },
  chatbotFab: { position: 'absolute', bottom: 110, right: 20, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4 },
  askAIButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  askAIButtonText: { color: 'white', fontWeight: '600', marginLeft: 6 },
    errorText: {
    marginTop: 16,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

});

export default DiscoverScreen;
