import { Student, Question, Teacher, ExamResult, Assignment, SubjectConfig, School, RegistrationRequest, Classroom, AssignmentCategory } from '../types'; 
import { API_URL } from './firebaseConfig';

const safeJsonParse = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
        try { 
            const parsed = JSON.parse(input);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }
    return [];
};

const getLocalAvatar = (id: string, dbAvatar: any): string => {
    if (dbAvatar) return dbAvatar;
    if (typeof window !== 'undefined') {
        return localStorage.getItem(`MST_TEACHER_AVATAR_${id}`) || '👨‍🏫';
    }
    return '👨‍🏫';
};

const mapStudentFromDB = (s: any): Student => ({
    ...s,
    id: String(s.id),
    stars: Number(s.stars || 0),
    inventory: safeJsonParse(s.inventory),
    login_count: Number(s.login_count || 0),
    last_login: Number(s.last_login || 0)
});

const mapTeacherFromDB = (t: any): Teacher => ({
    ...t,
    id: String(t.id),
    avatar: getLocalAvatar(t.id, t.avatar),
    advisorClass: t.advisor_class || t.advisorClass || '',
    gradeLevel: t.grade_level || t.gradeLevel || 'ALL',
    teachingClasses: safeJsonParse(t.teaching_classes || t.teachingClasses),
    teachingClassroomIds: safeJsonParse(t.teaching_classroom_ids || t.teachingClassroomIds),
    login_count: Number(t.login_count || t.loginCount || 0),
    last_login: Number(t.last_login || t.lastLogin || 0)
});

const mapResultFromDB = (res: any): ExamResult => ({
  ...res,
  id: String(res.id),
  studentId: String(res.student_id || res.studentId || ''),
  assignmentId: res.assignment_id || res.assignmentId || null,
  totalQuestions: Number(res.total_questions || res.totalQuestions || 0),
  score: Number(res.score || 0),
  subject: res.subject || 'ทั่วไป',
  category: res.category || 'GENERAL',
  timestamp: Number(res.timestamp || Date.now()),
  details: typeof res.details === 'string' ? JSON.parse(res.details) : res.details
});

const mapAssignmentFromDB = (asg: any): Assignment => {
  let category = (asg.category || 'GENERAL') as AssignmentCategory;
  let status: 'LOCKED' | 'OPEN' = 'OPEN';
  let title = asg.title || '';

  // Parse category from title suffix if stored in EXAM
  if (category === 'EXAM') {
    if (title.includes('::MIDTERM')) {
      category = 'MIDTERM';
    } else if (title.includes('::FINAL')) {
      category = 'FINAL';
    } else if (title.includes('กลางภาค')) {
      category = 'MIDTERM';
    } else if (title.includes('ปลายภาค')) {
      category = 'FINAL';
    }
  }

  // Parse status from title suffix
  if (title.includes('::LOCKED')) {
    status = 'LOCKED';
  } else if (asg.status === 'LOCKED') {
    status = 'LOCKED';
  }

  // Clean up suffix tags from title
  title = title
    .replace('::MIDTERM', '')
    .replace('::FINAL', '')
    .replace('::LOCKED', '')
    .replace('::OPEN', '')
    .trim();

  return {
    ...asg,
    id: String(asg.id),
    title,
    questionCount: Number(asg.question_count || asg.questionCount || 0),
    createdBy: String(asg.created_by || asg.createdBy || ''),
    category,
    status,
    targetClassrooms: safeJsonParse(asg.target_classrooms || asg.targetClassrooms).map((r: any) => String(r).trim()),
    deadline: String(asg.deadline || '').split('T')[0]
  };
};

const mapSubjectFromDB = (s: any): SubjectConfig => ({
    ...s,
    id: String(s.id),
    teacherId: String(s.teacher_id || s.teacherId || ''),
    targetClassrooms: safeJsonParse(s.target_classrooms || s.targetClassrooms),
    targetClassroomIds: safeJsonParse(s.target_classroom_ids || s.targetClassroomIds)
});

const mapQuestionFromDB = (qq: any): Question => {
    let choices = safeJsonParse(qq.choices);
    
    // Fallback to separate columns if choices array is empty
    if ((!choices || choices.length === 0) && qq.choice_1) {
        choices = [
            { id: "1", text: qq.choice_1 },
            { id: "2", text: qq.choice_2 },
            { id: "3", text: qq.choice_3 },
            { id: "4", text: qq.choice_4 }
        ];
    }

    return {
        ...qq,
        id: String(qq.id),
        teacherId: String(qq.teacher_id || qq.teacherId || ''),
        correctChoiceId: String(qq.correct_choice_id || qq.correct || '1'),
        choices: choices || [],
        assignment_id: qq.assignment_id ? String(qq.assignment_id) : undefined,
        unit: qq.unit || qq.topic,
        image: qq.image || qq.image_url || ""
    };
};

const mapRegistrationFromDB = (r: any): RegistrationRequest => ({
    ...r,
    citizenId: r.citizen_id,
    schoolId: r.school_id,
    schoolName: r.school_name,
    schoolCode: r.school_code,
    timestamp: Number(r.timestamp || Date.now())
});

// ---------------------------------------------------------------------------
// 🛡️ API Client Core POST Request Helper
// ---------------------------------------------------------------------------
const apiCall = async (action: string, body: any = {}): Promise<any> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, ...body })
        });
        if (!response.ok) {
            throw new Error(`HTTP Error Status: ${response.status}`);
        }
        return await response.json();
    } catch (e: any) {
        console.error(`API Call failed on action "${action}":`, e);
        throw e;
    }
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export interface AppSettings {
    logo_url: string;
    app_name?: string;
}

export const getAppSettings = async (): Promise<AppSettings> => {
    const defaultLogo = 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png';
    try {
        const data = await apiCall('getAppSettings');
        return {
            logo_url: data.logo_url || defaultLogo,
            app_name: data.app_name || 'Pratom Smart Tutor'
        };
    } catch (e) {
        return { logo_url: defaultLogo, app_name: 'Pratom Smart Tutor' };
    }
};

export const updateAppSettings = async (settings: Partial<AppSettings>) => {
    try {
        const res = await apiCall('updateAppSettings', settings);
        return { success: !!res.success, message: res.error };
    } catch (e: any) {
        return { success: false, message: e.message || String(e) };
    }
};

export const uploadLogo = async (file: File): Promise<string | null> => {
    try {
        const base64 = await fileToBase64(file);
        // Save via updateAppSettings logo_url to make it permanent
        await updateAppSettings({ logo_url: base64 });
        return base64;
    } catch (e) {
        console.error("Upload error:", e);
        return null;
    }
};

export interface AppData {
  students: Student[];
  questions: Question[];
  results: ExamResult[];
  assignments: Assignment[];
  subjects: SubjectConfig[];
}

export const fetchAppData = async (): Promise<AppData> => {
  try {
    const res = await apiCall('fetchAppData');
    return { 
        students: (res.students || []).map(mapStudentFromDB), 
        questions: (res.questions || []).map(mapQuestionFromDB), 
        results: (res.results || []).map(mapResultFromDB), 
        assignments: (res.assignments || []).map(mapAssignmentFromDB), 
        subjects: (res.subjects || []).map(mapSubjectFromDB) 
    };
  } catch(e) { 
    return { students: [], questions: [], results: [], assignments: [], subjects: [] }; 
  }
};

export const getDataForStudent = async (student: Student) => {
  try {
    const res = await apiCall('getDataForStudent', { student });
    return {
      results: (res.results || []).map(mapResultFromDB),
      assignments: (res.assignments || []).map(mapAssignmentFromDB),
      subjects: (res.subjects || []).map(mapSubjectFromDB),
      questions: (res.questions || []).map(mapQuestionFromDB)
    };
  } catch (e) {
    return { results: [], assignments: [], subjects: [], questions: [] };
  }
};

export const getTeacherDashboard = async (school: string) => {
  try {
    const res = await apiCall('getTeacherDashboard', { school });
    return { 
        students: (res.students || []).map(mapStudentFromDB), 
        results: (res.results || []).map(mapResultFromDB), 
        assignments: (res.assignments || []).map(mapAssignmentFromDB),
        subjects: (res.subjects || []).map(mapSubjectFromDB),
        school: res.school || null
    };
  } catch (e) { 
    return { students: [], results: [], assignments: [], subjects: [], school: null }; 
  }
};

export const saveScore = async (
    studentId: string, 
    studentName: string, 
    school: string, 
    score: number, 
    total: number, 
    subject: string, 
    assignmentId?: string, 
    category: AssignmentCategory = 'GENERAL', 
    earnedStars: number = 0, 
    details?: any[]
) => {
  let dbCategory = category;
  if (category === 'MIDTERM' || category === 'FINAL') {
    dbCategory = 'EXAM';
  }

  try {
      await apiCall('saveScore', {
          studentId, studentName, school, score, total, subject, assignmentId, category: dbCategory, earnedStars, details
      });
      return true;
  } catch (e) {
      console.error("❌ บันทึกคะแนนไม่สำเร็จ:", e);
      return false;
  }
};

export const verifyStudentLogin = async (username: string, password?: string): Promise<{ student?: Student, error?: string }> => {
  try {
    const res = await apiCall('verifyStudentLogin', { username, password });
    if (res.error) {
        return { error: res.error };
    }
    return { student: mapStudentFromDB(res.student) };
  } catch (e) { 
    return { error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' }; 
  }
};

export const addAssignment = async (
    school: string, 
    subject: string, 
    grade: string, 
    questionCount: number, 
    deadline: string, 
    createdBy: string, 
    title?: string, 
    targetClassrooms?: string[], 
    targetClassroomIds?: string[], 
    category: AssignmentCategory = 'GENERAL', 
    status: 'LOCKED' | 'OPEN' = 'OPEN'
): Promise<{ id: string | null, error: string | null }> => {
  let dbCategory = category;
  let dbTitle = title || '';
  if (category === 'MIDTERM') {
    dbCategory = 'EXAM';
    dbTitle = dbTitle + '::MIDTERM';
  } else if (category === 'FINAL') {
    dbCategory = 'EXAM';
    dbTitle = dbTitle + '::FINAL';
  }

  if (status === 'LOCKED') {
    dbTitle = dbTitle + '::LOCKED';
  }

  try {
      const res = await apiCall('addAssignment', {
          school, subject, grade, questionCount, deadline, createdBy, title: dbTitle, targetClassrooms, targetClassroomIds, category: dbCategory, status
      });
      return { id: res.id, error: res.error };
  } catch (e: any) {
      return { id: null, error: e.message || String(e) };
  }
};

export const toggleAssignmentStatus = async (id: string, currentStatus: 'LOCKED' | 'OPEN'): Promise<boolean> => {
  try {
      const res = await apiCall('toggleAssignmentStatus', { id, currentStatus });
      return !!res.success;
  } catch (e) {
      return false;
  }
};

export const deleteAssignment = async (id: string) => {
    try {
        const res = await apiCall('deleteAssignment', { id });
        return !!res.success;
    } catch (e) {
        return false;
    }
};

export const getQuestionsByAssignment = async (assignmentId: string): Promise<Question[]> => {
    try {
        const res = await apiCall('getQuestionsByAssignment', { assignmentId });
        return (res.data || []).map(mapQuestionFromDB);
    } catch (e) {
        return [];
    }
};

export const addQuestion = async (q: any) => {
    try {
        const res = await apiCall('addQuestion', { q });
        return { success: !!res.success, id: res.id };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const editQuestion = async (q: any) => {
    try {
        const res = await apiCall('editQuestion', { q });
        return { success: !!res.success };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  try {
      const res = await apiCall('getTeacherById', { id });
      return res.teacher ? mapTeacherFromDB(res.teacher) : null;
  } catch (e) {
      return null;
  }
};

export const teacherLogin = async (username: string, password: string) => {
  try {
      const res = await apiCall('teacherLogin', { username, password });
      if (!res.success) {
          return { success: false, message: res.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
      }
      return { success: true, teacher: mapTeacherFromDB(res.teacher) };
  } catch (e: any) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
  }
};

export const getSubjects = async (school: string) => {
    try {
        const res = await apiCall('getSubjects', { school });
        return (res.data || []).map(mapSubjectFromDB);
    } catch (e) {
        return [];
    }
};

export const addSubject = async (school: string, sub: SubjectConfig) => {
    try {
        const res = await apiCall('addSubject', { school, sub });
        return { success: !!res.success, message: res.error, id: res.id };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const deleteSubject = async (school: string, id: string) => {
    try {
        const res = await apiCall('deleteSubject', { school, id });
        return !!res.success;
    } catch (e) {
        return false;
    }
};

export const updateSchoolSettings = async (schoolName: string, settings: any) => {
    try {
        const res = await apiCall('updateSchoolSettings', { schoolName, settings });
        return { success: !!res.success, message: res.error };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const uploadAsset = async (file: File, _folder: string = 'assets'): Promise<string | null> => {
    try {
        const base64 = await fileToBase64(file);
        return base64;
    } catch (e) {
        console.error("Upload error:", e);
        return null;
    }
};

export const manageTeacher = async (action: string, payload: any) => {
    try {
        if (action === 'edit' && payload.avatar && typeof window !== 'undefined') {
            try {
                localStorage.setItem(`MST_TEACHER_AVATAR_${payload.id}`, payload.avatar);
            } catch (e) {
                console.error("Failed to write to localStorage:", e);
            }
        }
        const res = await apiCall('manageTeacher', { type: action, payload });
        return { success: !!res.success, message: res.error };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const manageSchool = async (action: 'add' | 'delete' | 'update_status', payload: any) => {
    try {
        const res = await apiCall('manageSchool', { type: action, payload });
        return { success: !!res.success, message: res.error };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const findSchoolByCode = async (code: string) => {
    try {
        const res = await apiCall('findSchoolByCode', { code });
        return res.school || null;
    } catch (e) {
        return null;
    }
};

export const requestRegistration = async (payload: { citizenId: string, name: string, surname: string, schoolId: string, schoolName?: string, schoolCode?: string, position: string, type: 'SCHOOL' | 'TEACHER' }) => {
    try {
        const res = await apiCall('requestRegistration', { payload });
        if (res.error) {
            return { success: false, message: 'เกิดข้อผิดพลาดในการส่งข้อมูล: ' + res.error };
        }
        return { success: true, message: 'ส่งคำขอสมัครสมาชิกเรียบร้อยแล้ว กรุณารอการตรวจสอบและอนุมัติจากผู้ดูแลระบบ' };
    } catch (e: any) {
        return { success: false, message: 'เกิดข้อผิดพลาดในการส่งข้อมูล: ' + (e.message || String(e)) };
    }
};

export const approveRegistration = async (req: RegistrationRequest, role: string, grade: string, schoolName: string) => {
    try {
        const res = await apiCall('approveRegistration', { req, role, grade, schoolName });
        return !!res.success;
    } catch (e) {
        return false;
    }
};

export const rejectRegistration = async (id: string) => {
    try {
        const res = await apiCall('rejectRegistration', { id });
        return !!res.success;
    } catch (e) {
        return false;
    }
};

export const getAllPendingRegistrations = async (): Promise<RegistrationRequest[]> => {
    try {
        const res = await apiCall('getAllPendingRegistrations');
        return (res.data || []).map(mapRegistrationFromDB);
    } catch (e) {
        return [];
    }
};

export const manageStudent = async (params: any) => {
    try {
        const { action, ...payload } = params;
        const res = await apiCall('manageStudent', { type: action, payload });
        if (action === 'add') {
            return { success: !!res.success, student: res.student ? mapStudentFromDB(res.student) : undefined, message: res.error };
        }
        return { success: !!res.success, message: res.error };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const getClassrooms = async (school: string): Promise<Classroom[]> => {
    try {
        const res = await apiCall('getClassrooms', { school });
        return (res.data || []).map((c: any) => ({ id: c.id, school: c.school, gradeLevel: c.grade_level, roomNumber: c.room_number, name: c.name }));
    } catch (e) {
        return [];
    }
};

export const manageClassroom = async (action: 'add' | 'delete', payload: any) => {
    try {
        const res = await apiCall('manageClassroom', { type: action, payload });
        return { success: !!res.success };
    } catch (e) {
        return { success: false };
    }
};

export const deleteQuestion = async (id: string) => {
    try {
        const res = await apiCall('deleteQuestion', { id });
        return !!res.success;
    } catch (e) {
        return false;
    }
};

export const getQuestionsBySubject = async (subject: string): Promise<Question[]> => {
    try {
        const res = await apiCall('getQuestionsBySubject', { subject });
        return (res.data || []).map(mapQuestionFromDB);
    } catch (e) {
        return [];
    }
};

export const getQuestionsBySubjectAndGrade = async (subject: string, grade: string, school: string): Promise<Question[]> => {
    try {
        const res = await apiCall('getQuestionsBySubjectAndGrade', { subject, grade, school });
        return (res.data || [])
            .map(mapQuestionFromDB)
            .filter((q: any) => !q.subject.includes('O-NET') && !q.subject.includes('NT'));
    } catch (e) {
        return [];
    }
};

export const redeemReward = async (studentId: string, rewardId: string, cost: number) => {
    try {
        const res = await apiCall('redeemReward', { studentId, rewardId, cost });
        return { success: !!res.success };
    } catch (e) {
        return { success: false };
    }
};

export const getSchools = async (): Promise<School[]> => {
    try {
        const res = await apiCall('getSchools');
        return (res.data || []).map((s: any) => ({ ...s, schoolCode: s.school_code, allowAllManageStudents: !!s.allow_all_manage_students }));
    } catch (e) {
        return [];
    }
};

export const getAllTeachers = async (): Promise<Teacher[]> => {
    try {
        const res = await apiCall('getAllTeachers');
        return (res.data || []).map(mapTeacherFromDB);
    } catch (e) {
        return [];
    }
};

export const getSuperAdminStats = async () => {
    try {
        const res = await apiCall('getSuperAdminStats');
        return { 
          students: (res.students || []).map(mapStudentFromDB), 
          results: (res.results || []).map(mapResultFromDB),
          teachers: (res.teachers || []).map(mapTeacherFromDB)
        };
    } catch (e) {
        return { students: [], results: [], teachers: [] };
    }
};
