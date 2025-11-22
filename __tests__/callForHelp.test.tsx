
import { jest } from "@jest/globals";

type BreakdownRequest = {
  id: string;
  userId: string;
  userName?: string;
  phoneNum: string;
  location: { latitude: number; longitude: number };
  address: string;
  vehicleId: string | null;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: string;
    transmission?: string;
  } | null;
  reason: string;
  timestamp: any;
  status: "pending" | "claimed" | "approved" | "cancelled" | "done";
  claimedBy?: { id: string; name: string } | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | number | null;
  userConfirmed?: boolean;
  userConfirmedAt?: any;
  userFeedback?: {
    rating?: number;
    text?: string;
    submittedAt?: any;
    autoConfirmed?: boolean;
  };
  mechanicConfirmed?: boolean;
};

type BreakdownStore = {
  requests: BreakdownRequest[];
  addRequest: (request: BreakdownRequest) => void;
  clearRequests: () => void;
  updateRequestStatus: (id: string, status: BreakdownRequest["status"]) => void;
};

// ======== MOCK STORE ========
export const useBreakdownStore = jest.fn<() => BreakdownStore>(() => {
  let state: { requests: BreakdownRequest[] } = {
    requests: [],
  };

  const store: BreakdownStore = {
    get requests() {
      return state.requests;
    },
    addRequest: (request) => {
      state.requests = [...state.requests, request];
    },
    clearRequests: () => {
      state.requests = [];
    },
    updateRequestStatus: (id, status) => {
      state.requests = state.requests.map((req) =>
        req.id === id ? { ...req, status } : req
      );
    },
  };

  return store;
});

// ======== TESTS ========
describe("Breakdown Store", () => {
  let store: ReturnType<typeof useBreakdownStore>;

  beforeEach(() => {
    store = useBreakdownStore();
    jest.clearAllMocks();
  });

  it("adds a new request", () => {
    const request: BreakdownRequest = {
      id: "req1",
      userId: "user1",
      phoneNum: "09123456789",
      location: { latitude: 1, longitude: 2 },
      address: "123 Street",
      vehicleId: null,
      reason: "Engine failure",
      timestamp: Date.now(),
      status: "pending",
    };

    store.addRequest(request);
    expect(store.requests.length).toBe(1);
    expect(store.requests[0].id).toBe("req1");
  });

  it("clears all requests", () => {
    store.addRequest({
      id: "req1",
      userId: "user1",
      phoneNum: "09123456789",
      location: { latitude: 1, longitude: 2 },
      address: "123 Street",
      vehicleId: null,
      reason: "Flat tire",
      timestamp: Date.now(),
      status: "pending",
    });

    expect(store.requests.length).toBe(1);

    store.clearRequests();
    expect(store.requests.length).toBe(0);
  });

  it("updates request status", () => {
    store.addRequest({
      id: "req1",
      userId: "user1",
      phoneNum: "09123456789",
      location: { latitude: 1, longitude: 2 },
      address: "123 Street",
      vehicleId: null,
      reason: "Flat tire",
      timestamp: Date.now(),
      status: "pending",
    });

    store.updateRequestStatus("req1", "claimed");
    expect(store.requests[0].status).toBe("claimed");
  });

  it("does not update status if request ID does not exist", () => {
    store.addRequest({
      id: "req1",
      userId: "user1",
      phoneNum: "09123456789",
      location: { latitude: 1, longitude: 2 },
      address: "123 Street",
      vehicleId: null,
      reason: "Flat tire",
      timestamp: Date.now(),
      status: "pending",
    });

    store.updateRequestStatus("req2", "claimed");
    expect(store.requests[0].status).toBe("pending");
  });
});
