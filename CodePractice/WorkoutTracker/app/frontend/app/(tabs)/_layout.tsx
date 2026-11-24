import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/src/store/authStore";
import { useWebSocketStore } from "@/src/store/wsStore";
import { useNotificationsStore } from "@/src/store/notificationsStore";

export default function TabLayout() {
  const { token } = useAuthStore();
  const { connect, subscribe } = useWebSocketStore();
  const { friendRequestsCount, refreshFriendRequestsCount } = useNotificationsStore();

  // Глобально подключаем WebSocket и обновляем счётчик заявок
  useEffect(() => {
    if (!token) return;

    connect(token);
    void refreshFriendRequestsCount();

    const unsubscribe = subscribe("friends_update", () => {
      void refreshFriendRequestsCount();
    });

    return unsubscribe;
  }, [token, connect, subscribe, refreshFriendRequestsCount]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          backgroundColor: "#1E293B",
          borderTopColor: "#334155",
          height: 80,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "#0F172A",
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Упражнения",
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: "Программы",
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconWrapper}>
              <Ionicons name="person" size={size} color={color} />
              {friendRequestsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{friendRequestsCount > 9 ? "9+" : friendRequestsCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
