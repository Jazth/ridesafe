import { CommentsSection } from "@/app/commentSection";
import { useUserQueryLoginStore } from "@/constants/store";
import { db } from "@/scripts/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
    arrayRemove,
    arrayUnion,
    doc,
    increment,
    onSnapshot,
    Timestamp,
    updateDoc
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const formatTimeAgo = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return "Just Now";
  const now = new Date();
  const postDate = timestamp.toDate();
  const seconds = Math.round((now.getTime() - postDate.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
};

export default function ViewPost() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { currentUser } = useUserQueryLoginStore();
  const currentUserId = currentUser?.id || null;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!postId || !currentUserId) return;

    const postRef = doc(db, "posts", postId);
    const unsubscribe = onSnapshot(postRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.userId === currentUserId) {
          setPost({
            id: snapshot.id,
            ...data,
            isLikedByCurrentUser: data.likedBy?.includes(currentUserId),
          });
        } else {
          Alert.alert("Access Denied", "You can only view your own posts.");
          setPost(null);
        }
      } else {
        setPost(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, currentUserId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleLikeToggle = async () => {
    if (!currentUserId || !post) return;
    const postRef = doc(db, "posts", post.id);
    const newLiked = !post.isLikedByCurrentUser;
    setPost((prev: any) => ({
      ...prev,
      isLikedByCurrentUser: newLiked,
      likesCount: (prev.likesCount || 0) + (newLiked ? 1 : -1),
    }));

    try {
      await updateDoc(postRef, {
        likesCount: increment(newLiked ? 1 : -1),
        likedBy: newLiked
          ? arrayUnion(currentUserId)
          : arrayRemove(currentUserId),
      });
    } catch (error) {
      console.error("Error liking post:", error);
      Alert.alert("Error", "Failed to update like.");
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  if (!post)
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={40} color="#999" />
        <Text style={styles.noPostText}>Post not found or inaccessible.</Text>
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={() => router.push("/notifications")}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Back to Notifications</Text>
        </TouchableOpacity>
      </View>
    );

  const defaultProfilePic =
    "https://placehold.co/50x50/E0E0E0/B0B0B0/png?text=User";

  return (
  <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>

  <View style={styles.header}>
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      style={styles.headerBackButton}
    >
      <Ionicons name="arrow-back" size={24} color="#FF5722" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>View Post</Text>
    <View style={{ width: 24 }} />
  </View>


      <FlatList
        data={[post]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              <RNImage
                source={{
                  uri: item.userProfilePictureUrl || defaultProfilePic,
                }}
                style={styles.profilePicture}
              />
              <View>
                <Text style={styles.userName}>
                  {item.userName || "Anonymous"}
                </Text>
                {item.createdAt && (
                  <Text style={styles.postTime}>
                    {formatTimeAgo(item.createdAt)}
                  </Text>
                )}
              </View>
            </View>

            {item.imageUrl && (
              <RNImage
                source={{ uri: item.imageUrl }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.postContent}>
              <Text style={styles.postTitle}>{item.title}</Text>
              {item.tags?.length > 0 && (
                <View style={styles.tagsContainer}>
                  {item.tags.map((tag: string) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.postDescription}>{item.description}</Text>

              <View style={styles.postActions}>
                <TouchableOpacity
                  onPress={handleLikeToggle}
                  style={styles.actionIconTouchable}
                >
                  <Ionicons
                    name={
                      post.isLikedByCurrentUser
                        ? "heart"
                        : "heart-outline"
                    }
                    size={24}
                    color={
                      post.isLikedByCurrentUser ? "#FF4500" : "#333"
                    }
                  />
                  {post.likesCount > 0 && (
                    <Text style={styles.likeCountText}>
                      {post.likesCount}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <CommentsSection
              postId={post.id}
              currentUser={currentUserId ? currentUser : null}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
          />
        }
      />
    
</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  headerBackButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF5722",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF5722",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 15,
  },
  noPostText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  postContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    margin: 12,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  profilePicture: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#E0E0E0",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  postTime: {
    fontSize: 12,
    color: "#6C757D",
  },
  postImage: {
    width: "100%",
    height: width * 0.7,
    backgroundColor: "#E9ECEF",
  },
  postContent: {
    padding: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
    gap: 6,
  },
  tag: {
    backgroundColor: "#E9ECEF",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    fontSize: 12,
    color: "#495057",
    fontWeight: "500",
  },
  postDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#343A40",
    marginBottom: 12,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
  },
  actionIconTouchable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  likeCountText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  safeHeader: {
  backgroundColor: "#FFFFFF",
},
header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#E0E0E0",
},

});
