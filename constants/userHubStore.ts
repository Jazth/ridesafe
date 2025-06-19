import { db } from '@/scripts/firebaseConfig'; // Ensure this path is correct
import { addDoc, collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { create } from 'zustand';

import { serverTimestamp } from 'firebase/firestore';

// When creating the data object for Firestore:
const postData = {
  // ... your other fields
  createdAt: serverTimestamp(), // Add this line
};
export interface Post {
    id: string; // Firestore document ID
    userId: string; // ID of the user who posted
    userName: string; // Name of the user who posted
    userProfilePictureUrl?: string; // Profile picture URL of the user
    title: string;
    description: string;
    tags: string[];
    imageUrl?: string; // URL of the post image (optional)
    createdAt: Timestamp; // Timestamp of creation
    // Add fields for likes, saves, comments count if needed
    likesCount?: number;
    savesCount?: number;
    commentsCount?: number;
}

interface PostState {
    posts: Post[]; // Array of posts
    isLoadingPosts: boolean; // Loading state for fetching posts
    postsError: string | null; // Error state for fetching posts

    isPosting: boolean; // Loading state for creating a new post
    postError: string | null; // Error state for creating a new post
}

interface PostActions {
    setPosts: (posts: Post[]) => void;
    setIsLoadingPosts: (isLoading: boolean) => void;
    setPostsError: (error: string | null) => void;

    setIsPosting: (isPosting: boolean) => void;
    setPostError: (error: string | null) => void;

    // Action to fetch posts from Firestore
    fetchPosts: () => Promise<void>;
    // Action to add a new post to Firestore and the store
    addPost: (postData: {
        userId: string;
        userName: string;
        userProfilePictureUrl?: string;
        title: string;
        description: string;
        tags: string[];
        imageUrl?: string;
    }) => Promise<{ success: boolean; error?: string; postId?: string }>;
}

type PostStore = PostState & PostActions;

export const usePostStore = create<PostStore>((set, get) => ({
    posts: [],
    isLoadingPosts: false,
    postsError: null,

    isPosting: false,
    postError: null,

    setPosts: (posts) => set({ posts: posts }),
    setIsLoadingPosts: (isLoading) => set({ isLoadingPosts: isLoading }),
    setPostsError: (error) => set({ postsError: error }),

    setIsPosting: (isPosting) => set({ isPosting: isPosting }),
    setPostError: (error) => set({ postError: error }),

    fetchPosts: async () => {
        set({ isLoadingPosts: true, postsError: null });

        try {
            const postsCollectionRef = collection(db, 'posts');
            // Example query: order by creation date descending
            const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            const fetchedPosts: Post[] = [];
            querySnapshot.forEach((doc) => {
                fetchedPosts.push({ id: doc.id, ...doc.data() } as Post);
            });

            console.log("Fetched posts:", fetchedPosts);
            set({ posts: fetchedPosts, isLoadingPosts: false });

        } catch (error: any) {
            console.error("Error fetching posts:", error);
            const message = error.message || "Failed to load posts.";
            set({ posts: [], isLoadingPosts: false, postsError: message });
        }
    },

    addPost: async (postData) => {
        set({ isPosting: true, postError: null });
        if (!postData.userId || !postData.userName || !postData.title.trim() || !postData.description.trim() || !postData.tags || postData.tags.length === 0) {
             const errorMsg = "Title, description, user info, and at least one tag are required.";
             set({ postError: errorMsg, isPosting: false });
             return { success: false, error: errorMsg };
        }


        const postToSave = {
            ...postData,
            createdAt: Timestamp.now(), 
            likesCount: 0,
            savesCount: 0,
            commentsCount: 0,
        };

        try {
            const docRef = await addDoc(collection(db, 'posts'), postToSave);
            console.log("Post saved with ID:", docRef.id);

            // Optionally add the new post to the store's posts array immediately
            // This provides optimistic updates
             const newPost: Post = { id: docRef.id, ...postToSave };
             set(state => ({
                 posts: [newPost, ...state.posts] // Add new post to the beginning of the array
             }));


            set({ isPosting: false });
            return { success: true, postId: docRef.id };

        } catch (error: any) {
            console.error("Error adding post:", error);
            const message = error.message || "Failed to create post.";
            set({ postError: message, isPosting: false });
            return { success: false, error: message };
        }
    },
}));
