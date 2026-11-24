import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { Exercise } from '@/src/types';

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  'Грудь': '#EF4444',
  'Спина': '#3B82F6',
  'Ноги': '#10B981',
  'Плечи': '#F59E0B',
  'Руки': '#8B5CF6',
  'Пресс': '#EC4899',
};

export default function Exercises() {
  const { exercises, fetchExercises } = useWorkoutStore();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchExercises();
    setRefreshing(false);
  };

  const muscleGroups = [...new Set(exercises.map(e => e.muscle_group))];
  
  const filteredExercises = selectedGroup 
    ? exercises.filter(e => e.muscle_group === selectedGroup)
    : exercises;

  const renderExercise = ({ item }: { item: Exercise }) => (
    <View style={styles.exerciseCard}>
      <View style={[styles.muscleIndicator, { backgroundColor: MUSCLE_GROUP_COLORS[item.muscle_group] || '#4F46E5' }]} />
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.muscleGroup}>{item.muscle_group}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Упражнения</Text>
        <Text style={styles.subtitle}>{exercises.length} упражнений в базе</Text>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['Все', ...muscleGroups]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                (item === 'Все' && !selectedGroup) || item === selectedGroup
                  ? styles.filterPillActive
                  : null,
              ]}
              onPress={() => setSelectedGroup(item === 'Все' ? null : item)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  (item === 'Все' && !selectedGroup) || item === selectedGroup
                    ? styles.filterPillTextActive
                    : null,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExercise}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={48} color="#64748B" />
            <Text style={styles.emptyText}>Нет упражнений</Text>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
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
  filterContainer: {
    marginBottom: 16,
  },
  filterList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#4F46E5',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exerciseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  muscleIndicator: {
    width: 4,
    height: '100%',
    minHeight: 60,
  },
  exerciseInfo: {
    flex: 1,
    padding: 16,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  muscleGroup: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 12,
  },
});


