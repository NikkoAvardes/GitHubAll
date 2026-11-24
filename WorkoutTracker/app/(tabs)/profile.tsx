import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, TextInput, FlatList, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/src/store/authStore";
import { api } from "@/src/api/client";
import { WorkoutSession, Stats, UserSearchResponse, FriendRequest } from "@/src/types";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    total_sessions: 0,
    total_sets: 0,
    total_weight_lifted: 0,
  });
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Friends state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResponse[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);

  const loadData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([api.get("/stats"), api.get("/sessions/history")]);
      setStats(statsRes.data);
      setHistory(historyRes.data);
    } catch (e) {
      console.log("Profile load error:", e);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get("/friends/requests/incoming");
      setIncomingRequests(res.data);
    } catch (e) {
      console.log("Friends requests load error:", e);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await api.post(`/friends/requests/${requestId}/accept`);
      // Убираем заявку из списка после успешного принятия
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      Alert.alert("Готово", "Заявка принята");
    } catch (e) {
      console.log("Accept request error:", e);
      Alert.alert("Ошибка", "Не удалось принять заявку");
    }
  };

  useEffect(() => {
    loadData();
    fetchRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await fetchRequests();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return "-";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} мин`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}ч ${remMins}м`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      try {
        const res = await api.get(`/users/search?query=${encodeURIComponent(text)}`);
        setSearchResults(res.data);
      } catch (e) {
        console.log("User search error:", e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const sendRequest = async (userId: string) => {
    try {
      await api.post(`/friends/request/${userId}`);
      Alert.alert("Успех", "Заявка отправлена!");
      // Обновляем локальное состояние, чтобы показать статус ожидания
      setSearchResults((prev) => prev.map((u) => (u.id === userId ? { ...u, has_pending_request: true } : u)));
    } catch (e: any) {
      Alert.alert(
        "Ошибка",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        e?.response?.data?.detail || "Не удалось отправить заявку",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || "U"}</Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_sessions}</Text>
            <Text style={styles.statLabel}>Тренировок</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_sets}</Text>
            <Text style={styles.statLabel}>Подходов</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(stats.total_weight_lifted)}kg</Text>
            <Text style={styles.statLabel}>Поднято</Text>
          </View>
        </View>

        {/* Friends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Друзья</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748B" />
            <TextInput style={styles.searchInput} placeholder="Поиск атлетов..." placeholderTextColor="#64748B" value={query} onChangeText={handleSearch} />
          </View>

          {incomingRequests.length > 0 && (
            <View style={styles.friendsSectionInner}>
              <Text style={styles.friendsSectionTitle}>Входящие заявки</Text>
              {incomingRequests.map((req) => (
                <View key={req.id} style={styles.friendCard}>
                  <Text style={styles.friendName}>{req.from_username}</Text>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => acceptRequest(req.id)}>
                    <Text style={styles.friendButtonText}>Принять</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.friendsSectionInner}>
            <Text style={styles.friendsSectionTitle}>Результаты поиска</Text>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.friendCard}>
                  <View>
                    <Text style={styles.friendName}>{item.username}</Text>
                    <Text style={styles.friendEmail}>{item.email}</Text>
                  </View>
                  {item.has_pending_request ? (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time" size={16} color="#FBBF24" />
                      <Text style={styles.pendingText}>В ожидании</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.addButton} onPress={() => sendRequest(item.id)}>
                      <Ionicons name="person-add" size={20} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={query.length > 2 ? <Text style={styles.noFriendsText}>Ничего не найдено</Text> : null}
            />
          </View>
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>История тренировок</Text>
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="calendar-outline" size={32} color="#64748B" />
              <Text style={styles.emptyHistoryText}>Пока нет завершённых тренировок</Text>
            </View>
          ) : (
            history.slice(0, 10).map((session) => (
              <View key={session.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Ionicons name="barbell" size={20} color="#4F46E5" />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyName}>{session.program_name}</Text>
                  <Text style={styles.historyDate}>{formatDate(session.start_time)}</Text>
                </View>
                <Text style={styles.historyDuration}>{formatDuration(session.start_time, session.end_time || undefined)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  email: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#334155",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  emptyHistory: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  emptyHistoryText: {
    color: "#64748B",
    marginTop: 8,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  historyDate: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  historyDuration: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginVertical: 32,
    padding: 16,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    paddingVertical: 12,
    marginLeft: 10,
  },
  friendsSectionInner: {
    marginBottom: 16,
  },
  friendsSectionTitle: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  friendCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  friendName: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  friendEmail: {
    color: "#64748B",
    fontSize: 12,
  },
  addButton: {
    backgroundColor: "#4F46E5",
    padding: 10,
    borderRadius: 8,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  pendingText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  friendButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  noFriendsText: {
    color: "#64748B",
    fontSize: 14,
  },
});
