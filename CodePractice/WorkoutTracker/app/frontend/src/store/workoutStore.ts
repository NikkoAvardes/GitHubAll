import { create } from 'zustand';
import { api } from '../api/client';
import { Exercise, WorkoutProgram, WorkoutSession, SessionSet, LastSet } from '../types';

interface WorkoutState {
  exercises: Exercise[];
  programs: WorkoutProgram[];
  activeSession: WorkoutSession | null;
  sessionSets: SessionSet[];
  lastSets: Record<string, LastSet>;
  isLoading: boolean;
  
  fetchExercises: () => Promise<void>;
  fetchPrograms: () => Promise<void>;
  createProgram: (name: string, exercises: any[]) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  
  startSession: (programId: string, programName: string) => Promise<void>;
  finishSession: () => Promise<void>;
  fetchActiveSession: () => Promise<void>;
  
  addSet: (exerciseId: string, weight: number, reps: number) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  fetchSessionSets: (sessionId: string) => Promise<void>;
  
  fetchLastSets: () => Promise<void>;
  getLastSet: (exerciseId: string) => LastSet | null;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: [],
  programs: [],
  activeSession: null,
  sessionSets: [],
  lastSets: {},
  isLoading: false,

  fetchExercises: async () => {
    const response = await api.get('/exercises');
    set({ exercises: response.data });
  },

  fetchPrograms: async () => {
    const response = await api.get('/programs');
    set({ programs: response.data });
  },

  createProgram: async (name: string, exercises: any[]) => {
    await api.post('/programs', { name, exercises });
    await get().fetchPrograms();
  },

  deleteProgram: async (id: string) => {
    await api.delete(`/programs/${id}`);
    await get().fetchPrograms();
  },

  startSession: async (programId: string, programName: string) => {
    const response = await api.post('/sessions/start', { program_id: programId, program_name: programName });
    set({ activeSession: response.data, sessionSets: [] });
  },

  finishSession: async () => {
    const { activeSession } = get();
    if (activeSession) {
      await api.post(`/sessions/${activeSession.id}/finish`);
      set({ activeSession: null, sessionSets: [] });
    }
  },

  fetchActiveSession: async () => {
    try {
      const response = await api.get('/sessions/active');
      if (response.data) {
        set({ activeSession: response.data });
        await get().fetchSessionSets(response.data.id);
      } else {
        set({ activeSession: null });
      }
    } catch {
      set({ activeSession: null });
    }
  },

  addSet: async (exerciseId: string, weight: number, reps: number) => {
    const { activeSession } = get();
    if (!activeSession) return;
    
    const response = await api.post(`/sessions/${activeSession.id}/sets`, {
      exercise_id: exerciseId,
      weight,
      reps
    });
    set(state => ({ 
      sessionSets: [...state.sessionSets, response.data],
      lastSets: { ...state.lastSets, [exerciseId]: { weight, reps } }
    }));
  },

  deleteSet: async (setId: string) => {
    await api.delete(`/sets/${setId}`);
    set(state => ({ sessionSets: state.sessionSets.filter(s => s.id !== setId) }));
  },

  fetchSessionSets: async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}/sets`);
    set({ sessionSets: response.data });
  },

  fetchLastSets: async () => {
    try {
      const response = await api.get('/exercises/last-sets');
      set({ lastSets: response.data });
    } catch {
      // ignore
    }
  },

  getLastSet: (exerciseId: string) => {
    return get().lastSets[exerciseId] || null;
  },
}));

