export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

export interface ProgramExercise {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  target_sets: number;
}

export interface WorkoutProgram {
  id: string;
  user_id: string;
  name: string;
  exercises: ProgramExercise[];
  created_at: string;
}

export interface SessionSet {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  start_time: string;
  end_time?: string;
  is_active: boolean;
}

export interface LastSet {
  weight: number;
  reps: number;
}

export interface Stats {
  total_sessions: number;
  total_sets: number;
  total_weight_lifted: number;
}

export interface UserSearchResponse {
  id: string;
  username: string;
  email: string;
  has_pending_request: boolean;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  status: "pending" | "accepted";
  created_at: string;
}
