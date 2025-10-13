import { create } from 'zustand';
export type BreakdownRequest = {
  id: string;
  userId: string;
  userName?: string;
  phoneNum: string;
  location: { latitude: number; longitude: number };
  address: string;
  vehicleId: string | null;

  // ✅ Add this new optional property
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: string;
    transmission?: string;
  } | null;

  reason: string;
  timestamp: any;
  status: 'pending' | 'claimed' | 'approved' | 'cancelled' | 'done';
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
  updateRequestStatus: (id: string, status: BreakdownRequest['status']) => void; // ✅ include here
};

export const useBreakdownStore = create<BreakdownStore>((set) => ({
  requests: [],
  addRequest: (request) =>
    set((state) => ({
      requests: [...state.requests, request],
    })),
  clearRequests: () => set({ requests: [] }),
  updateRequestStatus: (id, status) =>
    set((state) => ({
      requests: state.requests.map((req) =>
        req.id === id ? { ...req, status } : req
      ),
    })),
}));
