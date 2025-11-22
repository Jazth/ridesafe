// __tests__/userProfileStore.mock.test.tsx
import { jest } from "@jest/globals";

// ======== TYPES ========
export interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  transmission: "manual" | "automatic";
  reminders: { [itemId: string]: number }; // always an object
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "user" | "mechanic";
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  vehicles?: Vehicle[];
}

interface UserProfileState {
  userInfo: UserProfile | null;
  vehicles: Vehicle[];
  isLoadingProfile: boolean;
  profileError: string | null;
}

interface UserProfileActions {
  setUserInfo: (info: UserProfile | null) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  clearProfileState: () => void;
  fetchUserProfileData: (userId: string) => Promise<void>;
  setIsLoadingProfile: (isLoading: boolean) => void;
  setProfileError: (error: string | null) => void;
  updateVehicleReminders: (
    userId: string,
    vehicleId: string,
    updatedReminders: { [itemId: string]: number }
  ) => Promise<void>;
}

type UserProfileStore = UserProfileState & UserProfileActions;

// ======== MOCK STORE ========
export const useUserProfileStore = jest.fn<() => UserProfileStore>(() => {
  let state: UserProfileState = {
    userInfo: null,
    vehicles: [],
    isLoadingProfile: false,
    profileError: null,
  };

  const store: UserProfileStore = {
    // getters
    get userInfo() {
      return state.userInfo;
    },
    get vehicles() {
      return state.vehicles;
    },
    get isLoadingProfile() {
      return state.isLoadingProfile;
    },
    get profileError() {
      return state.profileError;
    },

    // setters
    setUserInfo: (info) => {
      state.userInfo = info;
    },
    setVehicles: (vehicles) => {
      state.vehicles = vehicles.map(v => ({
        ...v,
        reminders: v.reminders || {}, // ensure type safety
      }));
    },
    setIsLoadingProfile: (isLoading) => {
      state.isLoadingProfile = isLoading;
    },
    setProfileError: (error) => {
      state.profileError = error;
    },

    clearProfileState: () => {
      state = { userInfo: null, vehicles: [], isLoadingProfile: false, profileError: null };
    },

    fetchUserProfileData: jest.fn(async (userId: string) => {
      state.isLoadingProfile = true;
      state.profileError = null;

      // Simulate fetching a valid user
      if (userId === "user1") {
        const mockProfile: UserProfile = {
          id: "user1",
          email: "test@example.com",
          role: "user",
          firstName: "Alice",
          lastName: "Smith",
          vehicles: [
            {
              id: "veh1",
              year: "2023",
              make: "Toyota",
              model: "Corolla",
              transmission: "automatic",
              reminders: {}, // always type-safe
            },
          ],
        };
        state.userInfo = mockProfile;
        state.vehicles = mockProfile.vehicles || [];
      } else {
        state.userInfo = null;
        state.vehicles = [];
        state.profileError = "User not found.";
      }

      state.isLoadingProfile = false;
    }),

    updateVehicleReminders: jest.fn(async (userId, vehicleId, updatedReminders: { [key: string]: number }) => {
  state.profileError = null;
  const vehicleIndex = state.vehicles.findIndex(v => v.id === vehicleId);
  if (vehicleIndex === -1) {
    state.profileError = "Vehicle not found.";
    return;
  }

  const vehicle = state.vehicles[vehicleIndex] as Vehicle;

  // Ensure updatedReminders is an object before spreading
  const safeReminders: { [key: string]: number } = updatedReminders || {};

  state.vehicles[vehicleIndex] = {
    ...vehicle,
    reminders: { ...safeReminders },
  };
}),

  };

  return store;
});

// ======== TEST EXAMPLES ========
describe("Mocked UserProfileStore", () => {
  let store: ReturnType<typeof useUserProfileStore>;

  beforeEach(() => {
    store = useUserProfileStore();
    jest.clearAllMocks();
  });

  it("fetches profile successfully", async () => {
    await store.fetchUserProfileData("user1");
    expect(store.userInfo?.id).toBe("user1");
    expect(store.vehicles.length).toBe(1);
    expect(store.profileError).toBeNull();
  });

  it("returns error for non-existent user", async () => {
    await store.fetchUserProfileData("unknown");
    expect(store.userInfo).toBeNull();
    expect(store.vehicles.length).toBe(0);
    expect(store.profileError).toBe("User not found.");
  });

  it("updates vehicle reminders successfully", async () => {
    await store.fetchUserProfileData("user1");
    await store.updateVehicleReminders("user1", "veh1", { oilChange: 6 });
    expect(store.vehicles[0].reminders).toEqual({ oilChange: 6 });
  });

  it("fails to update reminders if vehicle not found", async () => {
    await store.updateVehicleReminders("user1", "veh999", { tireRotation: 12 });
    expect(store.profileError).toBe("Vehicle not found.");
  });
});
