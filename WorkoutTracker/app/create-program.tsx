import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { Exercise, ProgramExercise } from '@/src/types';

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  'Грудь': '#EF4444',
  'Спина': '#3B82F6',
  'Ноги': '#10B981',
  'Плечи': '#F59E0B',
  'Руки': '#8B5CF6',
  'Пресс': '#EC4899',
};

export default function CreateProgram() {
  const router = useRouter();
  const { exercises, fetchExercises, createProgram } = useWorkoutStore();
  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<ProgramExercise[]>([]);
  const [step, setStep] = useState<'name' | 'exercises'>('name');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const toggleExercise = (exercise: Exercise) => {
    const exists = selectedExercises.find(e => e.exercise_id === exercise.id);
    if (exists) {
      setSelectedExercises(selectedExercises.filter(e => e.exercise_id !== exercise.id));
    } else {
      setSelectedExercises([
        ...selectedExercises,
        {
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          muscle_group: exercise.muscle_group,
          target_sets: 3,
        },
      ]);
    }
  };

  const updateSets = (exerciseId: string, sets: number) => {
    setSelectedExercises(
      selectedExercises.map(e =>
        e.exercise_id === exerciseId ? { ...e, target_sets: sets } : e
      )
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите название программы');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одно упражнение');
      return;
    }
    setLoading(true);
    try {
      await createProgram(name.trim(), selectedExercises);
      router.back();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать программу');
    } finally {
      setLoading(false);
    }
  };

  const renderExercise = ({ item }: { item: Exercise }) => {
    const selected = selectedExercises.find(e => e.exercise_id === item.id);
    return (
      <TouchableOpacity
        style={[styles.exerciseCard, selected && styles.exerciseCardSelected]}
        onPress={() => toggleExercise(item)}
      >
        <View style={[styles.muscleIndicator, { backgroundColor: MUSCLE_GROUP_COLORS[item.muscle_group] || '#4F46E5' }]} />
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.muscleGroup}>{item.muscle_group}</Text>
        </View>
        {selected && (
          <View style={styles.setsContainer}>
            <TouchableOpacity
              style={styles.setButton}
              onPress={(e) => {
                e.stopPropagation();
                if (selected.target_sets > 1) updateSets(item.id, selected.target_sets - 1);
              }}
            >
              <Ionicons name="remove" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.setsText}>{selected.target_sets}</Text>
            <TouchableOpacity
              style={styles.setButton}
              onPress={(e) => {
                e.stopPropagation();
                updateSets(item.id, selected.target_sets + 1);
              }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        {!selected && (
          <View style={styles.addIcon}>
            <Ionicons name="add-circle-outline" size={24} color="#64748B" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (step === 'name') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Название программы</Text>
            <Text style={styles.stepSubtitle}>Например: "День груди" или "PPL - Push"</Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="Введите название"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.nextButton, !name.trim() && styles.nextButtonDisabled]}
              onPress={() => name.trim() && setStep('exercises')}
              disabled={!name.trim()}
            >
              <Text style={styles.nextButtonText}>Далее</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('name')}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>Выбрано: {selectedExercises.length}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExercise}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, (loading || selectedExercises.length === 0) && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading || selectedExercises.length === 0}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Создание...' : 'Создать программу'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  nameInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 24,
  },
  nextButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  list: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  exerciseCardSelected: {
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  muscleIndicator: {
    width: 4,
    height: '100%',
    minHeight: 60,
  },
  exerciseInfo: {
    flex: 1,
    padding: 12,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  muscleGroup: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  addIcon: {
    padding: 12,
  },
  setsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 8,
  },
  setButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  createButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


