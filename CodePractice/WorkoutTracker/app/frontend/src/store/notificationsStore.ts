import { create } from "zustand";
import { api } from "../api/client";

interface NotificationsState {
  friendRequestsCount: number;
  setFriendRequestsCount: (count: number) => void;
  refreshFriendRequestsCount: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  friendRequestsCount: 0,

  setFriendRequestsCount: (count: number) => {
    set({ friendRequestsCount: count });
  },

  refreshFriendRequestsCount: async () => {
    try {
      const res = await api.get("/friends/requests/incoming");
      const count = Array.isArray(res.data) ? res.data.length : 0;
      set({ friendRequestsCount: count });
    } catch {
      // игнорируем ошибки получения уведомлений
      set({ friendRequestsCount: 0 });
    }
  },
}));
