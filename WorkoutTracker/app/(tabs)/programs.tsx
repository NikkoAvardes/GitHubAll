import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { WorkoutProgram } from '@/src/types';

export default function Programs() {
  const router = useRouter();
  const { programs, fetchPrograms, deleteProgram, startSession } = useWorkoutStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPrograms();
    setRefreshing(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Удалить программу?',
      `Вы уверены, что хотите удалить "${name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => deleteProgram(id) },
      ]
    );
  };

  const handleStart = async (program: WorkoutProgram) => {
    try {
      await startSession(program.id, program.name);
      router.push('/workout');
    } catch (error: any) {
      if (error.response?.data?.detail?.includes('active')) {
        Alert.alert('Внимание', 'У вас уже есть активная тренировка', [
          { text: 'Продолжить', onPress: () => router.push('/workout') },
        ]);
      } else {
        Alert.alert('Ошибка', 'Не удалось начать тренировку');
      }
    }
  };

  const renderProgram = ({ item }: { item: WorkoutProgram }) => (
    <View style={styles.programCard}>
      <View style={styles.programHeader}>
        <Text style={styles.programName}>{item.name}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <View style={styles.exercisesList}>
        {item.exercises.slice(0, 3).map((ex, idx) => (
          <View key={idx} style={styles.exerciseItem}>
            <Text style={styles.exerciseItemText}>{ex.exercise_name}</Text>
            <Text style={styles.exerciseItemSets}>{ex.target_sets} подх.</Text>
          </View>
        ))}
        {item.exercises.length > 3 && (
          <Text style={styles.moreText}>+{item.exercises.length - 3} ещё</Text>
        )}
      </View>
      <TouchableOpacity style={styles.startButton} onPress={() => handleStart(item)}>
        <Ionicons name="play" size={18} color="#FFFFFF" />
        <Text style={styles.startButtonText}>Начать тренировку</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Программы</Text>
          <Text style={styles.subtitle}>{programs.length} программ</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/create-program')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={renderProgram}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/create-program')}>
            <Ionicons name="add-circle" size={48} color="#4F46E5" />
            <Text style={styles.emptyTitle}>Нет программ</Text>
            <Text style={styles.emptyText}>Создайте свою первую программу тренировки</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#4F46E5',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  programCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  programName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  exercisesList: {
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  exerciseItemText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  exerciseItemSets: {
    color: '#64748B',
    fontSize: 14,
  },
  moreText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

