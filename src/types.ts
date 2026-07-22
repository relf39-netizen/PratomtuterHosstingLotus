
export interface Student {
  id: string;
  username?: string;
  password?: string;
  name: string;
  school?: string; 
  avatar: string; 
  stars: number;
  grade?: string; 
  classroom?: string; 
  classroomId?: string; 
  teacherId?: string;
  login_count?: number;
  last_login?: number;
  quizCount?: number;
  tokens?: number;
  level?: number;
  inventory?: string[]; 
}

export interface Teacher {
  id?: string | number; 
  username?: string;
  password?: string;
  name: string;
  school: string;
  role?: string; 
  status?: 'pending' | 'active' | 'rejected' | 'suspended';
  position?: string; 
  advisorClass?: string; 
  advisorClassroomId?: string; 
  teachingClasses?: string[]; 
  teachingClassroomIds?: string[]; 
  gradeLevel?: string; 
  citizenId?: string;
  login_count?: number;
  last_login?: number;
  avatar?: string;
}

export interface School {
  id: string;
  name: string;
  schoolCode: string; 
  status?: 'active' | 'inactive';
  allowAllManageStudents?: boolean; 
}

export interface Classroom {
  id: string;
  school: string;
  gradeLevel: string; 
  roomNumber: string; 
  name: string; 
}

export enum Subject {
  MATH = 'คณิตศาสตร์',
  SCIENCE = 'วิทยาศาสตร์',
  THAI = 'ภาษาไทย',
  ENGLISH = 'ภาษาอังกฤษ',
  SOCIAL = 'สังคมศึกษา',
}

export interface SubjectConfig {
  id: string;
  name: string;
  school: string;
  teacherId: string;
  grade: string; 
  targetClassrooms?: string[]; 
  targetClassroomIds?: string[]; 
  icon: string;
  color: string;
}

export interface Question {
  id: string;
  subject: string;
  text: string;
  image?: string;
  choices: {
    id: string;
    text: string;
    image?: string;
  }[];
  correctChoiceId: string;
  explanation: string;
  grade?: string; 
  school?: string; 
  teacherId?: string; 
  assignment_id?: string;
  unit?: string;
}

export type AssignmentCategory = 'GENERAL' | 'ONET' | 'NT' | 'EXAM' | 'TGAT' | 'TPAT' | 'MIDTERM' | 'FINAL' | 'UNIT_TEST';

export interface ExamResultDetail {
  questionId: string;
  selectedChoiceId: string;
  isCorrect: boolean;
  topic?: string; // unit or subject area
}

export interface ExamResult {
  id: string;
  studentId: string;
  studentName?: string;
  school?: string;
  subject: string;
  score: number;
  totalQuestions: number;
  timestamp: number;
  assignmentId?: string;
  category?: AssignmentCategory; 
  timeSpent?: number; // in seconds
  details?: ExamResultDetail[];
}

export interface Assignment {
  id: string;
  school: string;
  subject: string;
  grade?: string;
  targetClassrooms?: string[]; 
  targetClassroomIds?: string[];
  questionCount: number;
  deadline: string; 
  createdBy: string;
  title?: string;
  category?: AssignmentCategory; 
  status?: 'LOCKED' | 'OPEN'; 
  timeLimit?: number; // in minutes
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  icon: string;
  description: string;
  category: 'Gadget' | 'Stationery' | 'Lifestyle' | 'Vehicle'; 
}

export interface RegistrationRequest {
  id: string;
  citizenId: string;
  name: string;
  surname: string;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  position?: string;
  type: 'SCHOOL' | 'TEACHER';
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export type GameState = 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'LEADERBOARD' | 'FINISHED';
