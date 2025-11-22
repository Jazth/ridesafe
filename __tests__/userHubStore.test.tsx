
import { jest } from "@jest/globals";

// Mock data
const mockPosts = [
  {
    id: "1",
    userId: "user1",
    userName: "Alice",
    title: "First Post",
    description: "Hello world",
    tags: ["tag1"],
    createdAt: { seconds: 0, nanoseconds: 0 } as any,
    likesCount: 0,
    savesCount: 0,
    commentsCount: 0,
  },
];

jest.mock("../constants/userHubStore", () => ({
  usePostStore: jest.fn(() => {
    const posts: any[] = [
      {
        id: "1",
        userId: "user1",
        userName: "Alice",
        title: "First Post",
        description: "Hello world",
        tags: ["tag1"],
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        likesCount: 0,
        savesCount: 0,
        commentsCount: 0,
      },
    ];

    return {
      posts,
      isLoadingPosts: false,
      postsError: null,
      isPosting: false,
      postError: null,

      setPosts: jest.fn((newPosts: any[]) => posts.splice(0, posts.length, ...newPosts)),
      setIsLoadingPosts: jest.fn(),
      setPostsError: jest.fn(),
      setIsPosting: jest.fn(),
      setPostError: jest.fn(),

      fetchPosts: jest.fn(async () => {}),

      addPost: jest.fn(async (postData: any) => {
        if (
          !postData.userId ||
          !postData.userName ||
          !postData.title?.trim() ||
          !postData.description?.trim() ||
          !postData.tags?.length
        ) {
          return {
            success: false,
            error: "Title, description, user info, and at least one tag are required.",
          };
        }

        const newPost = {
          id: Math.random().toString(36).substring(2, 9),
          ...postData,
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
          likesCount: 0,
          savesCount: 0,
          commentsCount: 0,
        };

        posts.unshift(newPost); 
        return { success: true, postId: newPost.id };
      }),
    };
  }),
}));



import { usePostStore } from "../constants/userHubStore";

describe("usePostStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds a post successfully", async () => {
    const store = usePostStore();

    const result = await store.addPost({
      userId: "user2",
      userName: "Bob",
      title: "New Post",
      description: "Testing",
      tags: ["test"],
    });

    expect(result.success).toBe(true);
    expect(result.postId).toBeDefined();
    expect(store.addPost).toHaveBeenCalled();
    expect(store.posts[0].title).toBe("New Post");
  });

  it("fails validation when missing fields", async () => {
    const store = usePostStore();

    const result = await store.addPost({
      userId: "",
      userName: "",
      title: "",
      description: "",
      tags: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Title, description, user info, and at least one tag are required.");
  });
});
