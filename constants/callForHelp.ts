import { create } from 'zustand';

export type BreakdownRequest = {
  id: string;
  userId: string;
  userName?: string; 
  phoneNum: string;
  location: { latitude: number; longitude: number };
  address: string;
  vehicleId: string | null;
  reason: string;
  timestamp: any;
  status: 'pending' | 'claimed' | 'approved' | 'cancelled' | 'done'; // optional
  claimedBy?: { id: string; name: string } | null;
  cancelledBy?: string | null;     // ✅ add this
  cancelledAt?: Date | number | null; // ✅ optional for logging cancel time
};




type BreakdownStore = {
  requests: BreakdownRequest[];
  addRequest: (request: BreakdownRequest) => void;
  clearRequests: () => void;
};

export const useBreakdownStore = create<BreakdownStore>((set) => ({
  requests: [],
  addRequest: (request) =>
    set((state) => ({
      requests: [...state.requests, request],
    })),
  clearRequests: () => set({ requests: [] }),
}));
