import { db } from '@/scripts/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt?: any;
  likes?: string[];
}

export const CommentsSection = ({ postId, currentUser }: { postId: string; currentUser: any }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyMap, setReplyMap] = useState<Record<string, Comment[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [postOwnerId, setPostOwnerId] = useState<string | null>(null);

  // 🔹 Fetch post owner
  useEffect(() => {
    const fetchPostOwner = async () => {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      const postData = postSnap.data();
      setPostOwnerId(postData?.userId || postData?.user?.id || null);
    };
    fetchPostOwner();
  }, [postId]);

  // 🔹 Fetch comments
  useEffect(() => {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Comment));
      setComments(list);
    });
    return unsubscribe;
  }, [postId]);

  // 🔹 Fetch replies
  useEffect(() => {
    const unsubscribes = comments.map((comment) => {
      const repliesRef = collection(db, 'posts', postId, 'comments', comment.id, 'replies');
      const q = query(repliesRef, orderBy('createdAt', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const replies: Comment[] = [];
        snapshot.forEach((doc) => replies.push({ id: doc.id, ...doc.data() } as Comment));
        setReplyMap((prev) => ({ ...prev, [comment.id]: replies }));
      });
    });
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [comments, postId]);

  // 🔹 Add new comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const commentsRef = collection(db, 'posts', postId, 'comments');
    await addDoc(commentsRef, {
      text: newComment.trim(),
      userId: currentUser.id,
      userName: currentUser.firstName || 'User',
      createdAt: serverTimestamp(),
      likes: [],
    });
    setNewComment('');
    if (postOwnerId && currentUser.id !== postOwnerId) {
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  const postData = postSnap.data();
  const postTitle = postData?.title?.trim() || 'Untitled post';

  await addDoc(collection(db, 'notifications'), {
    receiverId: postOwnerId,
    senderId: currentUser.id,
    senderName: currentUser.firstName || 'Someone',
    senderProfileUrl: currentUser.profilePictureUrl || null,
    message: `${currentUser.firstName || 'Someone'} commented on your post "${postTitle}".`,
    createdAt: serverTimestamp(),
    postId: postId,
    postTitle: postTitle,
    type: 'comment',
    text: newComment.trim(),
  });
}
  };
  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!currentUser) return;

    if (currentUser.id !== commentUserId && currentUser.id !== postOwnerId) {
      alert("You don't have permission to delete this comment.");
      return;
    }

    // Delete the comment
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await deleteDoc(commentRef);

    // Delete replies
    const repliesRef = collection(db, 'posts', postId, 'comments', commentId, 'replies');
    const repliesSnap = await getDocs(repliesRef);
    const batch = writeBatch(db);
    repliesSnap.forEach((replyDoc) => batch.delete(replyDoc.ref));
    await batch.commit();
  };

  // 🔹 Add reply
  const handleAddReply = async (commentId: string) => {
    const text = replyText[commentId];
    if (!text?.trim() || !currentUser) return;

    const repliesRef = collection(db, 'posts', postId, 'comments', commentId, 'replies');
    await addDoc(repliesRef, {
      text: text.trim(),
      userId: currentUser.id,
      userName: currentUser.firstName || 'User',
      createdAt: serverTimestamp(),
      likes: [],
    });

    setReplyText((prev) => ({ ...prev, [commentId]: '' }));
    setReplyingTo(null);
  };

  // 🔹 Like/unlike comment
  const handleToggleLike = async (commentId: string, isReply = false, parentCommentId?: string) => {
    if (!currentUser) return;

    const docRef = isReply
      ? doc(db, 'posts', postId, 'comments', parentCommentId!, 'replies', commentId)
      : doc(db, 'posts', postId, 'comments', commentId);

    const docSnap = await getDoc(docRef);
    const data = docSnap.data() || {};
    const likes: string[] = data.likes || [];

    if (likes.includes(currentUser.id)) {
      await updateDoc(docRef, { likes: likes.filter((id) => id !== currentUser.id) });
    } else {
      await updateDoc(docRef, { likes: [...likes, currentUser.id] });
    }
    
  };

  return (
    <View style={commentStyles.container}>
      <Text style={commentStyles.sectionTitle}>Comments</Text>

      <FlatList
  data={comments}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View style={commentStyles.commentBlock}>
      
      {/* Row: Author + Delete */}
      <View style={commentStyles.commentHeaderRow}>
        <Text style={commentStyles.commentAuthor}>{item.userName}</Text>
        {(currentUser.id === item.userId || currentUser.id === postOwnerId) && (
          <TouchableOpacity
            onPress={() => handleDeleteComment(item.id, item.userId)}
          >
            <Text style={[commentStyles.replyBtn, { color: 'red' }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comment Text */}
      <Text style={commentStyles.commentText}>{item.text}</Text>

      {/* Buttons Row: Like + Reply */}
      <View style={commentStyles.commentActionsRow}>
        <TouchableOpacity onPress={() => handleToggleLike(item.id)}>
          <Text style={commentStyles.replyBtn}>
            {item.likes?.includes(currentUser.id) ? '❤️' : '🤍'} {item.likes?.length || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
        >
          <Text style={commentStyles.replyBtn}>Reply</Text>
        </TouchableOpacity>
      </View>

      {/* Reply Input */}
      {replyingTo === item.id && (
        <View style={commentStyles.replyInputRow}>
          <TextInput
            placeholder="Write a reply..."
            value={replyText[item.id] || ''}
            onChangeText={(t) => setReplyText((prev) => ({ ...prev, [item.id]: t }))}
            style={commentStyles.inputReply}
          />
          <TouchableOpacity onPress={() => handleAddReply(item.id)}>
            <Ionicons name="send" size={22} color="#FF5722" />
          </TouchableOpacity>
        </View>
      )}

      {/* Replies */}
      {replyMap[item.id]?.length > 0 && (
        <View style={commentStyles.replySection}>
          {replyMap[item.id].map((reply) => (
            <View key={reply.id} style={commentStyles.replyBubble}>
              <Text style={commentStyles.commentAuthor}>{reply.userName}</Text>
              <Text style={commentStyles.commentText}>{reply.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )}
/>


      <View style={commentStyles.newCommentRow}>
        <TextInput
          placeholder="Write a comment..."
          value={newComment}
          onChangeText={setNewComment}
          style={commentStyles.input}
        />
        <TouchableOpacity onPress={handleAddComment}>
          <Ionicons name="send" size={24} color="#FF5722" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const commentStyles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginVertical: 8, color: '#222' },
  commentBlock: { marginBottom: 14, backgroundColor: '#fafafa', padding: 10, borderRadius: 8 },
  commentAuthor: { fontWeight: '600', color: '#333' },
  commentText: { color: '#444', marginVertical: 4 },
  replyBtn: { color: '#FF5722', fontSize: 13, marginVertical: 2 },
  replySection: { paddingLeft: 16, borderLeftWidth: 2, borderColor: '#eee', marginTop: 8 },
  replyBubble: { backgroundColor: '#f2f2f2', padding: 8, borderRadius: 8, marginBottom: 6 },
  newCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  input: { flex: 1, paddingVertical: 8, paddingHorizontal: 6 },
  inputReply: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, fontSize: 13 },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 20,
    paddingHorizontal: 8,
  },
  commentHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
commentActionsRow: {
  flexDirection: 'row',
  marginTop: 4,
},

});

export default CommentsSection;
