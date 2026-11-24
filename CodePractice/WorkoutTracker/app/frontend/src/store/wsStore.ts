import { create } from "zustand";

type Listener = (data: any) => void;

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  listeners: Record<string, Listener[]>;
  connect: (token: string) => void;
  disconnect: () => void;
  subscribe: (type: string, listener: Listener) => () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  listeners: {},

  connect: (token: string) => {
    const { socket, isConnected } = get();
    const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "";
    if (!baseUrl || !token) return;

    // Если уже есть активное соединение, повторно не открываем
    if (socket && isConnected) return;

    const wsBase = baseUrl.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/api/ws?token=${encodeURIComponent(token)}`;

    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      set({ isConnected: true });
    };

    newSocket.onclose = () => {
      set({ socket: null, isConnected: false });
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        const type = data?.type;
        if (!type) return;
        const { listeners } = get();
        const callbacks = listeners[type] || [];
        callbacks.forEach((cb) => cb(data));
      } catch {
        // игнорируем некорректные сообщения
      }
    };

    newSocket.onerror = () => {
      // Можно добавить логирование при необходимости
    };

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  subscribe: (type: string, listener: Listener) => {
    const { listeners } = get();
    const current = listeners[type] || [];
    set({ listeners: { ...listeners, [type]: [...current, listener] } });

    // Возвращаем функцию отписки
    return () => {
      const { listeners: latest } = get();
      const arr = latest[type] || [];
      set({ listeners: { ...latest, [type]: arr.filter((l) => l !== listener) } });
    };
  },
}));
