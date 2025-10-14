import { useUserQueryLoginStore } from '@/constants/store';
import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  collection,
  getDocs,
  query,
  Timestamp,
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
}

export interface UserBasicInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
}

export interface LikeActivityItem {
  id: string;
  postId: string;
  postTitle: string;
  postImageUrl?: string | null;
  liker: UserBasicInfo;
  likedAt: Timestamp;
  type: string; // ✅ added this
  text: string; // ✅ added this
}

export interface CurrentUserInfo {
  id: string;
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
    if (!currentUserId) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'notifications'),
        where('receiverId', '==', currentUserId)
      );
      const snapshot = await getDocs(q);

      console.log("Fetched notifications count:", snapshot.size);
      console.log("Current user ID:", currentUserId);
      console.log("Querying notifications where receiverId == currentUserId");

      snapshot.forEach((doc) => console.log(doc.id, doc.data()));

      const activities: LikeActivityItem[] = [];

    snapshot.forEach((docSnap) => {
  const data = docSnap.data();

  const likedAt =
    data.createdAt instanceof Timestamp
      ? data.createdAt
      : Timestamp.fromMillis(Date.now());

  const senderName = data.senderName?.trim() || 'Someone';
  const postTitle = data.postTitle?.trim() || 'Untitled post';
  const type = data.type || 'unknown';

  // ✅ Proper text based on notification type
  let text = '';
  switch (type) {
    case 'like':
      text = `${senderName} liked your post "${postTitle}".`;
      break;
    case 'comment':
      text = `${senderName} commented on your post "${postTitle}".`;
      break;
    case 'reply':
      text = `${senderName} replied to your comment.`;
      break;
    case 'comment_like':
      text = `${senderName} liked your comment.`;
      break;
    case 'reply_like':
      text = `${senderName} liked your reply.`;
      break;
    case 'save':
      text = `${senderName} saved your post "${postTitle}".`;
      break;
    default:
      text = data.message || `${senderName} made a new activity.`;
  }

  activities.push({
    id: docSnap.id,
    postId: data.postId || '',
    postTitle,
    postImageUrl: data.postImageUrl || null,
    liker: {
      id: data.senderId || 'unknown',
      firstName: senderName,
      lastName: '',
      profilePictureUrl: data.senderProfileUrl || null,
    },
    likedAt,
    type,
    text,
  });
});



      activities.sort((a, b) => b.likedAt.toMillis() - a.likedAt.toMillis());
      setLikeActivities(activities);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchLikeActivities();
  }, [fetchLikeActivities]);

  useFocusEffect(
  useCallback(() => {
    fetchLikeActivities();

    // ✅ Only refresh once when screen is focused
    // Not continuously on every re-render
    return () => {};
  }, [currentUserId])
);


  const onRefresh = () => {
    setRefreshing(true);
    fetchLikeActivities();
  };

  const handleActivityPress = (activity: LikeActivityItem) => {
  if (activity.postId) {
    router.push({
      pathname: "/viewPost",
      params: { postId: activity.postId },
    });
  } else {
    Alert.alert("Notice", "This activity isn’t linked to a specific post.");
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
            {item.text}
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
      <TouchableOpacity
        onPress={() =>  router.push('/user/Discover')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={26} color="#FF5722" />
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Recent Activity</Text>
      <View style={{ width: 26 }} />
    </View>
  );

  if (loading && likeActivities.length === 0) {
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
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="sparkles-outline" size={60} color="#B0B0B0" />
              <Text style={styles.emptyStateText}>No recent like activity.</Text>
              <Text style={styles.emptyStateSubText}>
                When someone likes your posts, you'll see it here.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={
          likeActivities.length === 0 && !loading
            ? styles.centered
            : styles.listContentContainer
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor={'#007AFF'}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F2F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  backButton: { padding: 5 },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF5722' },
  listContentContainer: { paddingVertical: 8 },
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
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E9ECEF',
  },
  activityTextContainer: { flex: 1 },
  activityMessage: { fontSize: 15, color: '#333333', marginBottom: 3 },
  activityTime: { fontSize: 12, color: '#777777' },
  postThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginLeft: 10,
    backgroundColor: '#E9ECEF',
  },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#6C757D', marginTop: 16, textAlign: 'center' },
  emptyStateSubText: { fontSize: 14, color: '#ADB5BD', marginTop: 4, textAlign: 'center' },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginVertical: 10 },
  retryButton: { backgroundColor: '#FF5722', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20, marginTop: 15 },
  retryButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});

export default ActivityScreen;
