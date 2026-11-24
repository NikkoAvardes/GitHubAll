import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, TextInput, FlatList, Alert, Modal, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/src/store/authStore";
import { useWebSocketStore } from "@/src/store/wsStore";
import { useNotificationsStore } from "@/src/store/notificationsStore";
import { api } from "@/src/api/client";
import { WorkoutSession, Stats, UserSearchResponse, FriendRequest, SessionDetailsResponse } from "@/src/types";

export default function Profile() {
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const { connect: connectWS, subscribe } = useWebSocketStore();
  const { setFriendRequestsCount } = useNotificationsStore();
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
  const [friends, setFriends] = useState<UserSearchResponse[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<UserSearchResponse[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetailsResponse | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const openSearch = () => {
    setQuery("");
    setSearchResults([]);
    setSearchVisible(true);
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearchVisible(false);
    setQuery("");
    setSearchResults([]);
  };

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
      setFriendRequestsCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch (e) {
      console.log("Friends requests load error:", e);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await api.get("/friends");
      setFriends(res.data);
    } catch (e) {
      console.log("Friends load error:", e);
    }
  };

  const fetchOutgoingRequests = async () => {
    try {
      const res = await api.get("/friends/requests/outgoing");
      setOutgoingRequests(res.data);
    } catch (e) {
      console.log("Outgoing friends requests load error:", e);
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

  const declineRequest = async (requestId: string) => {
    try {
      await api.post(`/friends/requests/${requestId}/decline`);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e) {
      console.log("Decline request error:", e);
      Alert.alert("Ошибка", "Не удалось отклонить заявку");
    }
  };

  useEffect(() => {
    loadData();
    fetchRequests();
    fetchFriends();
    fetchOutgoingRequests();
  }, []);

  // Подключаем WebSocket и подписываемся на обновления друзей/заявок
  useEffect(() => {
    if (!token) return;

    connectWS(token);
    const unsubscribe = subscribe("friends_update", () => {
      void fetchRequests();
      void fetchFriends();
      void fetchOutgoingRequests();
    });

    return unsubscribe;
  }, [token, connectWS, subscribe]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await fetchRequests();
    await fetchFriends();
    await fetchOutgoingRequests();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
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

  const openSessionDetails = async (session: WorkoutSession) => {
    if (!session.end_time) return; // показываем только завершённые тренировки
    setSelectedSession(session);
    setDetailsVisible(true);
    setDetailsLoading(true);
    try {
      const res = await api.get<SessionDetailsResponse>(`/sessions/${session.id}/details`);
      setSessionDetails(res.data);
    } catch (e) {
      console.log("Session details load error:", e);
      Alert.alert("Ошибка", "Не удалось загрузить детали тренировки");
      setDetailsVisible(false);
    } finally {
      setDetailsLoading(false);
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

  const removeFriend = async (friendId: string, username: string) => {
    Alert.alert("Удалить из друзей?", `Вы уверены, что хотите удалить ${username} из друзей?`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/friends/${friendId}`);
            setFriends((prev) => prev.filter((f) => f.id !== friendId));
          } catch (e) {
            Alert.alert("Ошибка", "Не удалось удалить из друзей");
          }
        },
      },
    ]);
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
          <View style={styles.friendsHeaderRow}>
            <Text style={styles.sectionTitle}>Друзья</Text>
            <TouchableOpacity style={styles.searchOpenButton} onPress={openSearch}>
              <Ionicons name="search" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.friendsSectionInner}>
            {friends.length === 0 ? (
              <Text style={styles.noFriendsText}>Пока нет друзей</Text>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={styles.friendCard}>
                  <View>
                    <Text style={styles.friendName}>{friend.username}</Text>
                    <Text style={styles.friendEmail}>{friend.email}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeFriendButton} onPress={() => removeFriend(friend.id, friend.username)}>
                    <Ionicons name="trash-outline" size={18} color="#F97316" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {outgoingRequests.length > 0 && (
            <View style={styles.friendsSectionInner}>
              <Text style={styles.friendsSectionTitle}>Заявки в ожидании</Text>
              {outgoingRequests.map((u) => (
                <View key={u.id} style={styles.friendCard}>
                  <View>
                    <Text style={styles.friendName}>{u.username}</Text>
                    <Text style={styles.friendEmail}>{u.email}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time" size={16} color="#FBBF24" />
                    <Text style={styles.pendingText}>В ожидании</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {incomingRequests.length > 0 && (
            <View style={styles.friendsSectionInner}>
              <Text style={styles.friendsSectionTitle}>Входящие заявки</Text>
              {incomingRequests.map((req) => (
                <View key={req.id} style={styles.friendCard}>
                  <Text style={styles.friendName}>{req.from_username}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity style={styles.declineButton} onPress={() => declineRequest(req.id)}>
                      <Text style={styles.friendButtonText}>Отклонить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptButton} onPress={() => acceptRequest(req.id)}>
                      <Text style={styles.friendButtonText}>Принять</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
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
              <TouchableOpacity key={session.id} style={styles.historyItem} onPress={() => openSessionDetails(session)} activeOpacity={0.8}>
                <View style={styles.historyIcon}>
                  <Ionicons name="barbell" size={20} color="#4F46E5" />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyName}>{session.program_name}</Text>
                  <Text style={styles.historyDate}>{formatDate(session.start_time)}</Text>
                </View>
                <Text style={styles.historyDuration}>{formatDuration(session.start_time, session.end_time || undefined)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно с деталями тренировки — прозрачное, по центру экрана */}
      <Modal visible={detailsVisible} transparent animationType="slide" onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.detailsOverlay}>
          {/* Клик по фону закрывает модалку */}
          <TouchableWithoutFeedback onPress={() => setDetailsVisible(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={[styles.modalContent, styles.detailsModalContent]}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>Детали тренировки</Text>
                <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                  <Ionicons name="close" size={24} color="#F9FAFB" />
                </TouchableOpacity>
              </View>

              {detailsLoading || !sessionDetails || !selectedSession ? (
                <View style={styles.detailsLoadingContainer}>
                  <Text style={styles.detailsText}>Загрузка...</Text>
                </View>
              ) : (
                <ScrollView style={styles.detailsContent} contentContainerStyle={{ paddingBottom: 4 }} showsVerticalScrollIndicator>
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsProgramHeader}>
                      <View style={styles.detailsProgramIcon}>
                        <Ionicons name="barbell" size={20} color="#4F46E5" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailsProgramName}>{sessionDetails.session.program_name}</Text>
                        <Text style={styles.detailsSubText}>
                          {formatDate(sessionDetails.session.start_time)} · {formatDuration(sessionDetails.session.start_time, sessionDetails.session.end_time)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {sessionDetails.exercises.map((ex) => (
                    <View key={ex.exercise_id} style={styles.detailsExerciseCard}>
                      <View style={styles.detailsExerciseHeader}>
                        <Text style={styles.detailsExerciseName}>{ex.exercise_name}</Text>
                        {ex.muscle_group && <Text style={styles.detailsMuscleGroup}>{ex.muscle_group}</Text>}
                      </View>
                      <Text style={styles.detailsSubText}>Подходов: {ex.total_sets}</Text>

                      {ex.sets.map((s, idx) => (
                        <Text key={s.id} style={styles.detailsText}>
                          {idx + 1}) {s.weight} кг × {s.reps} повт.
                        </Text>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={closeSearch}>
        {/* Нажатие на фон закроет клавиатуру и закроет поиск */}
        <TouchableWithoutFeedback onPress={closeSearch}>
          <View style={styles.modalOverlay}>
            {/* Сдвигает контент вверх, чтобы клавиатура его не перекрыла */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Поиск друзей</Text>
                  <TouchableOpacity onPress={closeSearch}>
                    <Ionicons name="close" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#64748B" />
                  <TextInput style={styles.searchInput} placeholder="Поиск атлетов..." placeholderTextColor="#64748B" value={query} onChangeText={handleSearch} />
                </View>

                <View style={styles.friendsSectionInner}>
                  <Text style={styles.friendsSectionTitle}>Результаты поиска</Text>
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.friendCard}>
                        <View>
                          <Text style={styles.friendName}>{item.username}</Text>
                          <Text style={styles.friendEmail}>{item.email}</Text>
                        </View>
                        {item.is_friend ? (
                          <View style={styles.friendBadge}>
                            <Ionicons name="checkmark" size={16} color="#10B981" />
                            <Text style={styles.friendBadgeText}>В друзьях</Text>
                          </View>
                        ) : item.has_pending_request ? (
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
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Весь экран профиля (фон приложения)
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollView: {
    flex: 1,
  },
  // Шапка с аватаром и именем
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
  // Плашка когда нет завершённых тренировок
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
  // Элемент истории тренировки в списке
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
  // Кнопка выхода снизу
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
  // Строка поиска друзей в модалке
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
  // Внутренние секции друзей/заявок
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
  // Карточка друга / заявки
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
  // Бейджи «в ожидании» и «в друзьях»
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(36, 251, 47, 0.1)",
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
  friendBadgeText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
  },
  // Кнопки принять / отклонить заявку
  acceptButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineButton: {
    backgroundColor: "#EF4444",
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
  removeFriendButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(248, 113, 113, 0.08)",
  },
  // Заголовок секции друзей с иконкой поиска
  friendsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  searchOpenButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  // Общий overlay для модалки поиска друзей (bottom sheet)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.7)",
    justifyContent: "flex-end",
  },
  // Общий контейнер контента модалок (дно экрана)
  modalContent: {
    backgroundColor: "#0F172A",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Детали тренировки — прозрачное модальное окно по центру
  detailsOverlay: {
    flex: 1,
    backgroundColor: "rgba(12, 21, 40, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  detailsModalContent: {
    borderRadius: 20,
    width: "100%",
    maxHeight: "70%",
    minHeight: 550,
    paddingBottom: 0,
    paddingTop: 25,
  },
  // Ниже стили контента внутри модалки деталей
  detailsScreen: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  detailsTitle: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "bold",
  },
  detailsLoadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsContent: {
    maxHeight: "70%",
  },
  // Карточка с общей информацией о тренировке (название, дата, длительность)
  detailsCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    paddingVertical: 20, // больше места сверху/снизу
    paddingHorizontal: 20, // больше места слева/справа
    marginBottom: 16,
  },
  detailsProgramHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailsProgramIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsProgramName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailsSubText: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 13,
  },
  // Карточка отдельного упражнения в тренировке
  detailsExerciseCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
  },
  detailsExerciseHeader: {
    marginBottom: 4,
  },
  detailsExerciseName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  detailsMuscleGroup: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  detailsText: {
    fontSize: 13,
    color: "#E5E7EB",
    marginTop: 2,
  },
});
