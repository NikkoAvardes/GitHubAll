import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorkoutStore } from "@/src/store/workoutStore";
import { api } from "@/src/api/client";
import { ProgramExercise, SessionSet } from "@/src/types";

export default function Workout() {
  const router = useRouter();
  const { activeSession, fetchActiveSession, finishSession, sessionSets, addSet, deleteSet, fetchLastSets, lastSets } = useWorkoutStore();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<ProgramExercise | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [program, setProgram] = useState<{ exercises: ProgramExercise[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const init = async () => {
      await fetchActiveSession();
      await fetchLastSets();
    };
    init();
  }, []);

  useEffect(() => {
    if (activeSession) {
      // Fetch program details
      api.get("/programs").then((res) => {
        const p = res.data.find((pr: any) => pr.id === activeSession.program_id);
        if (p) setProgram(p);
      });

      // Start timer (server time is in UTC, ensure we parse as UTC)
      const rawStartTime = activeSession.start_time as unknown as string;
      const normalizedStartTime = rawStartTime.endsWith("Z") ? rawStartTime : `${rawStartTime}Z`;
      const startTime = Date.parse(normalizedStartTime);
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const openExerciseModal = (exercise: ProgramExercise) => {
    setSelectedExercise(exercise);
    // Smart memory: pre-fill last weight/reps
    const last = lastSets[exercise.exercise_id];
    if (last) {
      setWeight(last.weight.toString());
      setReps(last.reps.toString());
    } else {
      setWeight("");
      setReps("");
    }
    setShowModal(true);
  };

  const handleAddSet = async () => {
    if (!selectedExercise || !weight || !reps) {
      Alert.alert("Ошибка", "Введите вес и повторения");
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      await addSet(selectedExercise.exercise_id, parseFloat(weight), parseInt(reps, 10));
      setShowModal(false);
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось добавить подход");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    Alert.alert("Завершить тренировку?", `Время: ${formatTime(elapsedTime)}\nПодходов: ${sessionSets.length}`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Завершить",
        style: "destructive",
        onPress: async () => {
          await finishSession();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const getExerciseSets = (exerciseId: string) => {
    return sessionSets.filter((s) => s.exercise_id === exerciseId);
  };

  if (!activeSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noSession}>
          <Ionicons name="barbell-outline" size={64} color="#64748B" />
          <Text style={styles.noSessionText}>Нет активной тренировки</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.replace("/(tabs)")}>
            <Text style={styles.goBackButtonText}>Вернуться</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{activeSession.program_name}</Text>
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={16} color="#4F46E5" />
            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleFinish} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>Готово</Text>
        </TouchableOpacity>
      </View>

      {/* Exercises */}
      <ScrollView style={styles.exercisesList} contentContainerStyle={styles.exercisesContent}>
        {program?.exercises.map((exercise) => {
          const sets = getExerciseSets(exercise.exercise_id);
          const lastSet = lastSets[exercise.exercise_id];
          return (
            <View key={exercise.exercise_id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View>
                  <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                  <Text style={styles.exerciseMeta}>
                    Цель: {exercise.target_sets} подх. • Сделано: {sets.length}
                  </Text>
                  {lastSet && (
                    <Text style={styles.lastSetHint}>
                      Прошлый раз: {lastSet.weight}кг × {lastSet.reps}
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={styles.addSetButton} onPress={() => openExerciseModal(exercise)}>
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {sets.length > 0 && (
                <View style={styles.setsGrid}>
                  {sets.map((set, idx) => (
                    <TouchableOpacity
                      key={set.id}
                      style={styles.setChip}
                      onLongPress={() => {
                        Alert.alert("Удалить подход?", `${set.weight}кг × ${set.reps}`, [
                          { text: "Отмена", style: "cancel" },
                          { text: "Удалить", style: "destructive", onPress: () => deleteSet(set.id) },
                        ]);
                      }}
                    >
                      <Text style={styles.setNumber}>#{idx + 1}</Text>
                      <Text style={styles.setWeight}>{set.weight}кг</Text>
                      <Text style={styles.setReps}>×{set.reps}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Set Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        {/* Нажатие на фон закроет клавиатуру */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            {/* Сдвигает контент вверх, чтобы клавиатура его не перекрыла */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedExercise?.exercise_name}</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Вес (кг)</Text>
                    <TextInput
                      style={styles.input}
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="decimal-pad" // Для iOS лучше decimal-pad (есть точка)
                      placeholder="0"
                      placeholderTextColor="#64748B"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Повторения</Text>
                    <TextInput style={styles.input} value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="0" placeholderTextColor="#64748B" onSubmitEditing={Keyboard.dismiss} />
                  </View>
                </View>

                <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleAddSet} disabled={loading}>
                  <Text style={styles.saveButtonText}>{loading ? "Сохранение..." : "Добавить подход"}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  noSession: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noSessionText: {
    fontSize: 18,
    color: "#94A3B8",
    marginTop: 16,
    marginBottom: 24,
  },
  goBackButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  timerText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  finishButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  finishButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  exercisesList: {
    flex: 1,
  },
  exercisesContent: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  exerciseMeta: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  lastSetHint: {
    fontSize: 12,
    color: "#4F46E5",
    marginTop: 4,
  },
  addSetButton: {
    backgroundColor: "#4F46E5",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  setsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  setChip: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  setNumber: {
    color: "#64748B",
    fontSize: 12,
  },
  setWeight: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  setReps: {
    color: "#94A3B8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  inputRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
