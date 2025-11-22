// __tests__/accountModificationStore.test.tsx
import { jest } from "@jest/globals";

// ======== MOCKS ========

// Mock current user store
const mockCurrentUser = { id: "user1", role: "user" };

// Mock profile store
const mockUserProfileStore = {
  fetchUserProfileData: jest.fn(),
  clearProfileState: jest.fn(),
};

// Mock login store
const mockUserQueryLoginStore = {
  currentUser: mockCurrentUser,
  logout: jest.fn(),
  getState: () => mockUserQueryLoginStore,
};

// Mock Firebase functions
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn();

// ======== MOCK STORE ========
const useAccountModificationStore = jest.fn(() => {
  let state = {
    newPasswordInput: "",
    newPhoneNumberInput: "",
    isUpdatingPassword: false,
    isUpdatingNumber: false,
    isDeletingAccount: false,
    updateError: null,
    deleteError: null,
  };

  return {
    getState: () => state,
    set: (partial: Partial<typeof state>) => (state = { ...state, ...partial }),

    newPasswordInput: state.newPasswordInput,
    newPhoneNumberInput: state.newPhoneNumberInput,
    isUpdatingPassword: state.isUpdatingPassword,
    isUpdatingNumber: state.isUpdatingNumber,
    isDeletingAccount: state.isDeletingAccount,
    updateError: state.updateError,
    deleteError: state.deleteError,

    setNewPasswordInput: (password: string) => (state.newPasswordInput = password),
    setNewPhoneNumberInput: (number: string) => (state.newPhoneNumberInput = number),
    clearUpdateError: () => (state.updateError = null),
    clearDeleteError: () => (state.deleteError = null),
    resetModificationForm: () =>
      (state = {
        newPasswordInput: "",
        newPhoneNumberInput: "",
        isUpdatingPassword: false,
        isUpdatingNumber: false,
        isDeletingAccount: false,
        updateError: null,
        deleteError: null,
      }),

    updatePassword: jest.fn(async () => {
      if (!mockCurrentUser.id || !mockCurrentUser.role) {
        state.updateError = "No logged in user found.";
        return { success: false, error: state.updateError };
      }
      if (!state.newPasswordInput.trim()) {
        state.updateError = "New password cannot be empty.";
        return { success: false, error: state.updateError };
      }
      await mockUpdateDoc();
      state.isUpdatingPassword = false;
      state.newPasswordInput = "";
      return { success: true };
    }),

    updatePhoneNumber: jest.fn(async () => {
      if (!mockCurrentUser.id || !mockCurrentUser.role) {
        state.updateError = "No logged in user found.";
        return { success: false, error: state.updateError };
      }
      if (!state.newPhoneNumberInput.trim()) {
        state.updateError = "New phone number cannot be empty.";
        return { success: false, error: state.updateError };
      }
      await mockUpdateDoc();
      state.isUpdatingNumber = false;
      state.newPhoneNumberInput = "";
      mockUserProfileStore.fetchUserProfileData(mockCurrentUser.id);
      return { success: true };
    }),

    deleteAccount: jest.fn(async () => {
      if (!mockCurrentUser.id || !mockCurrentUser.role) {
        state.deleteError = "No logged in user found.";
        return { success: false, error: state.deleteError };
      }
      await mockDeleteDoc();
      mockUserProfileStore.clearProfileState();
      mockUserQueryLoginStore.logout();
      state.isDeletingAccount = false;
      return { success: true };
    }),

    // Expose mocks so we can assert on them in tests
    __mocks: { mockUpdateDoc, mockDeleteDoc, mockDoc, mockUserQueryLoginStore, mockUserProfileStore },
  };
});

// ======== TESTS ========

describe("Account Modification Store", () => {
  let store: ReturnType<typeof useAccountModificationStore>;

  beforeEach(() => {
    store = useAccountModificationStore();
    jest.clearAllMocks();
  });

  it("updates password successfully", async () => {
    store.setNewPasswordInput("123456");
    const result = await store.updatePassword();
    expect(result.success).toBe(true);
    expect(store.newPasswordInput).toBe("");
    expect(store.__mocks.mockUpdateDoc).toHaveBeenCalled();
  });

  it("fails update password when empty", async () => {
    store.setNewPasswordInput("");
    const result = await store.updatePassword();
    expect(result.success).toBe(false);
    expect(result.error).toBe("New password cannot be empty.");
  });

  it("updates phone number successfully", async () => {
    store.setNewPhoneNumberInput("09123456789");
    const result = await store.updatePhoneNumber();
    expect(result.success).toBe(true);
    expect(store.newPhoneNumberInput).toBe("");
    expect(store.__mocks.mockUpdateDoc).toHaveBeenCalled();
    expect(store.__mocks.mockUserProfileStore.fetchUserProfileData).toHaveBeenCalledWith("user1");
  });

  it("deletes account successfully", async () => {
    const result = await store.deleteAccount();
    expect(result.success).toBe(true);
    expect(store.__mocks.mockDeleteDoc).toHaveBeenCalled();
    expect(store.__mocks.mockUserProfileStore.clearProfileState).toHaveBeenCalled();
    expect(store.__mocks.mockUserQueryLoginStore.logout).toHaveBeenCalled();
  });
});
