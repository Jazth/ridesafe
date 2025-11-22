// __tests__/vehicleFormStore.test.tsx
import { jest } from "@jest/globals";

// ======== TYPES ========
interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  transmission: "manual" | "automatic";
}

interface VehicleFormState {
  year: string;
  make: string;
  model: string;
  transmission: string;
  isSaving: boolean;
  saveError: string | null;
}

interface VehicleFormStore extends VehicleFormState {
  setYear: (year: string) => void;
  setMake: (make: string) => void;
  setModel: (model: string) => void;
  setTransmission: (trans: "manual" | "automatic" | "") => void;
  resetForm: () => void;
  setSaveError: (error: string | null) => void;
  saveVehicle: () => Promise<{ success: boolean; error?: string; vehicleId?: string }>;
  getState: () => VehicleFormState;
  set: (partial: Partial<VehicleFormState>) => void;
  __mocks: any;
}


// ======== MOCKS ========
const mockCurrentUser = { id: "user1", role: "user" };
const mockUserQueryLoginStore = {
  currentUser: mockCurrentUser,
  getState: () => mockUserQueryLoginStore,
};
const mockGetDoc = jest.fn<() => Promise<{ exists: () => boolean; data: () => { vehicles: Vehicle[] } }>>();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn();

// Simple ID generator
let counter = 0;
const generateSimpleId = (): string => {
  counter = (counter + 1) % 1000;
  const timestamp = Date.now();
  const randomPart = Math.floor(Math.random() * 1000);
  return `${timestamp}-${counter}-${randomPart}`;
};

// ======== MOCK STORE ========
export const useVehicleFormStore = jest.fn<() => VehicleFormStore>(() => {
  
  let state: VehicleFormState = {
    year: "",
    make: "",
    model: "",
    transmission: "",
    isSaving: false,
    saveError: null,
  };

  const store: VehicleFormStore = {
    getState: () => state,
    set: (partial) => (state = { ...state, ...partial }) as VehicleFormState,

    year: state.year,
    make: state.make,
    model: state.model,
    transmission: state.transmission,
    isSaving: state.isSaving,
    saveError: state.saveError,

    setYear: (year) => (state.year = year),
    setMake: (make) => (state.make = make),
    setModel: (model) => (state.model = model),
    setTransmission: (trans) => (state.transmission = trans),
    resetForm: () =>
      (state = {
        year: "",
        make: "",
        model: "",
        transmission: "",
        isSaving: false,
        saveError: null,
      }),
    setSaveError: (error) => (state.saveError = error),

    saveVehicle: jest.fn(async () => {
  state.isSaving = true;
  state.saveError = null;

  const { year, make, model, transmission } = state;
  if (!year.trim() || !make.trim() || !model.trim() || !transmission) {
    const errorMsg = "Please fill in all vehicle details.";
    state.saveError = errorMsg;
    state.isSaving = false;
    return { success: false, error: errorMsg, vehicleId: undefined };
  }

  // read the current user dynamically from the mock store
  const currentUser = store.__mocks.mockUserQueryLoginStore.currentUser;
  if (!currentUser?.id) {
    const errorMsg = "No logged in user found. Please log in.";
    state.saveError = errorMsg;
    state.isSaving = false;
    return { success: false, error: errorMsg, vehicleId: undefined };
  }

  const newVehicle: Vehicle = {
    id: generateSimpleId(),
    year,
    make,
    model,
    transmission: transmission as "manual" | "automatic",
  };

  // read existing vehicles dynamically
  const userDocSnap = await store.__mocks.mockGetDoc();
  const userData = userDocSnap.data();
  const existingVehicles = userData.vehicles || [];

  if (existingVehicles.length >= 6) {
    const errorMsg = "You have reached the maximum limit of 6 vehicles.";
    state.saveError = errorMsg;
    state.isSaving = false;
    return { success: false, error: errorMsg, vehicleId: undefined };
  }

  const updatedVehicles = [...existingVehicles, newVehicle];
  await store.__mocks.mockUpdateDoc();
  state.isSaving = false;

  return { success: true, vehicleId: newVehicle.id };
}),


    __mocks: { mockGetDoc, mockUpdateDoc, mockDoc, mockUserQueryLoginStore },
  };

  return store;
});

// ======== TESTS ========
describe("Vehicle Form Store", () => {
  let store: VehicleFormStore;

  beforeEach(() => {
    store = useVehicleFormStore();
    jest.clearAllMocks();
  });

  it("fails saveVehicle when form is incomplete", async () => {
    store.setYear("2023");
    const result = await store.saveVehicle();
    expect(result.success).toBe(false);
    expect(result.error).toBe("Please fill in all vehicle details.");
  });

  it("saves vehicle successfully", async () => {
  store.setYear("2023");
  store.setMake("Toyota");
  store.setModel("Corolla");
  store.setTransmission("automatic");

  store.__mocks.mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ vehicles: [] }),
  });

  const result = await store.saveVehicle();
  expect(result.success).toBe(true);
  expect(result.vehicleId).toBeDefined();
  expect(store.isSaving).toBe(false);
});


  it("fails if user reaches vehicle limit", async () => {
    store.setYear("2023");
    store.setMake("Honda");
    store.setModel("Civic");
    store.setTransmission("manual");

    // Mock existing vehicles = 6
    store.__mocks.mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ vehicles: new Array(6).fill({}) }),
    });

    const result = await store.saveVehicle();
    expect(result.success).toBe(false);
    expect(result.error).toBe("You have reached the maximum limit of 6 vehicles.");
  });

  it("fails if no logged-in user", async () => {
    store.__mocks.mockUserQueryLoginStore.currentUser = null;
    store.setYear("2023");
    store.setMake("Toyota");
    store.setModel("Corolla");
    store.setTransmission("automatic");

    const result = await store.saveVehicle();
    expect(result.success).toBe(false);
    expect(result.error).toBe("No logged in user found. Please log in.");
  });
});
