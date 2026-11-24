import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { api } from '@/src/api/client';

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { programs, fetchPrograms, activeSession, fetchActiveSession, startSession } = useWorkoutStore();
  const [stats, setStats] = useState({ total_sessions: 0, total_sets: 0, total_weight_lifted: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    await fetchPrograms();
    await fetchActiveSession();
    try {
      const response = await api.get('/stats');
      setStats(response.data);
    } catch (e) {
      console.log('Stats error:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartWorkout = async (programId: string, programName: string) => {
    try {
      await startSession(programId, programName);
      router.push('/workout');
    } catch (error: any) {
      if (error.response?.data?.detail?.includes('active')) {
        router.push('/workout');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Привет, {user?.username || 'Атлет'}!</Text>
          <Text style={styles.subGreeting}>Готов к тренировке?</Text>
        </View>

        {/* Active Session Banner */}
        {activeSession && (
          <TouchableOpacity 
            style={styles.activeSessionBanner}
            onPress={() => router.push('/workout')}
          >
            <View style={styles.activeSessionContent}>
              <View style={styles.activeSessionDot} />
              <Text style={styles.activeSessionText}>Активная тренировка</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#4F46E5" />
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={24} color="#4F46E5" />
            <Text style={styles.statValue}>{stats.total_sessions}</Text>
            <Text style={styles.statLabel}>Тренировок</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="repeat" size={24} color="#10B981" />
            <Text style={styles.statValue}>{stats.total_sets}</Text>
            <Text style={styles.statLabel}>Подходов</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{Math.round(stats.total_weight_lifted / 1000)}k</Text>
            <Text style={styles.statLabel}>кг поднято</Text>
          </View>
        </View>

        {/* Quick Start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрый старт</Text>
          {programs.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyCard}
              onPress={() => router.push('/create-program')}
            >
              <Ionicons name="add-circle" size={48} color="#4F46E5" />
              <Text style={styles.emptyText}>Создайте свою первую программу</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.programsList}>
              {programs.slice(0, 3).map((program) => (
                <TouchableOpacity 
                  key={program.id}
                  style={styles.programCard}
                  onPress={() => handleStartWorkout(program.id, program.name)}
                >
                  <View style={styles.programInfo}>
                    <Text style={styles.programName}>{program.name}</Text>
                    <Text style={styles.programExercises}>
                      {program.exercises.length} упражнений
                    </Text>
                  </View>
                  <View style={styles.startButton}>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
  activeSessionBanner: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  activeSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    marginRight: 8,
  },
  activeSessionText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  programsList: {
    gap: 12,
  },
  programCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  programExercises: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#4F46E5',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


