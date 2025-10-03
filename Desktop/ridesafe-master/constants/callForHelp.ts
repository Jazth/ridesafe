import { create } from 'zustand';

type BreakdownRequest = {
  id: string;
  userId: string;
  location: { latitude: number; longitude: number };
  address: string;
  vehicleId: string | null;
  reason: string;
  timestamp: number;
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
