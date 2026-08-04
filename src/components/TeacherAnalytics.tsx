import React, { useState, useMemo } from 'react';
import { ExamResult, Question, Student, SubjectConfig, Teacher, Assignment } from '../types';
import { 
  Target, BarChart3, AlertCircle, CheckCircle2, BookOpen,
  Printer, Search, Award, Users, GraduationCap,
  Sparkles, FileText, Layers
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface TeacherAnalyticsProps {
  stats: ExamResult[];
  questions: Question[];
  students?: Student[];
  availableSubjects?: SubjectConfig[];
  teacher?: Teacher;
  canManageAll?: boolean;
  assignments?: Assignment[];
}

export const GRADE_LABELS: Record<string, string> = { 
  'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
  'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
};

// Helper to determine item difficulty classification (Index of Difficulty p)
export const getDifficultyInfo = (p: number) => {
  if (p >= 0.80) {
    return {
      level: 'ง่ายมาก',
      code: 'VERY_EASY',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeBg: 'bg-emerald-500',
      icon: '🟢',
      recommendation: 'นักเรียนส่วนใหญ่เข้าใจเป็นอย่างดี สามารถต่อยอดโจทย์ที่ท้าทายยิ่งขึ้นได้'
    };
  } else if (p >= 0.60) {
    return {
      level: 'ง่าย',
      code: 'EASY',
      color: 'bg-teal-100 text-teal-800 border-teal-300',
      badgeBg: 'bg-teal-500',
      icon: '🟢',
      recommendation: 'เนื้อหานี้เหมาะสม นักเรียนส่วนใหญ่ทำได้ดี'
    };
  } else if (p >= 0.40) {
    return {
      level: 'ปานกลาง',
      code: 'MODERATE',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      badgeBg: 'bg-blue-500',
      icon: '🔵',
      recommendation: 'ข้อสอบมีความยากเหมาะสม สามารถแยกกลุ่มนักเรียนได้ดี'
    };
  } else if (p >= 0.20) {
    return {
      level: 'ยาก',
      code: 'HARD',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      badgeBg: 'bg-amber-500',
      icon: '🟠',
      recommendation: 'ค่อนข้างยาก ควรทบทวนมโนทัศน์สำคัญในบทเรียนนี้ซ้ำอีกครั้ง'
    };
  } else {
    return {
      level: 'ยากมาก',
      code: 'VERY_HARD',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      badgeBg: 'bg-rose-500',
      icon: '🔴',
      recommendation: 'ยากมาก นักเรียนส่วนใหญ่ทำผิด ควรจัดกิจกรรมสอนซ่อมเสริมและปรับสื่อการเรียนการสอน'
    };
  }
};

const TeacherAnalytics: React.FC<TeacherAnalyticsProps> = ({ 
  stats, 
  questions, 
  students = [], 
  availableSubjects = [], 
  teacher, 
  canManageAll = false,
  assignments = []
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'UNIT_TEST' | 'MIDTERM' | 'FINAL'>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'SCORES'>('ANALYTICS');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // 1. Determine teacher's assigned grades & classrooms
  const teacherClassrooms = useMemo(() => {
    if (!teacher || canManageAll) return [];
    const rooms = new Set<string>();
    if (teacher.advisorClass) rooms.add(teacher.advisorClass.trim());
    if (teacher.teachingClasses && Array.isArray(teacher.teachingClasses)) {
      teacher.teachingClasses.forEach(c => {
        if (c) rooms.add(c.trim());
      });
    }
    return Array.from(rooms);
  }, [teacher, canManageAll]);

  const teacherGrades = useMemo(() => {
    if (!teacher || canManageAll) return [];
    const grades = new Set<string>();
    if (teacher.gradeLevel && teacher.gradeLevel !== 'ALL') {
      teacher.gradeLevel.split(',').forEach(g => grades.add(g.trim()));
    }
    if (teacher.advisorClass) {
      const g = teacher.advisorClass.split('/')[0];
      if (g) grades.add(g.trim());
    }
    if (teacher.teachingClasses && Array.isArray(teacher.teachingClasses)) {
      teacher.teachingClasses.forEach(c => {
        if (c) {
          const g = c.split('/')[0];
          if (g) grades.add(g.trim());
        }
      });
    }
    return Array.from(grades);
  }, [teacher, canManageAll]);

  // 2. Determine available subjects for teacher
  const teacherSubjects = useMemo(() => {
    if (canManageAll || !teacher) {
      const allSubNames = new Set<string>();
      availableSubjects.forEach(s => allSubNames.add(s.name));
      stats.forEach(s => { if (s.subject) allSubNames.add(s.subject); });
      return Array.from(allSubNames);
    }

    const teacherIdStr = String(teacher.id || '').trim();
    const setOfSubs = new Set<string>();
    
    availableSubjects.forEach(s => {
      if (String(s.teacherId).trim() === teacherIdStr || s.teacherId === teacher.username) {
        setOfSubs.add(s.name);
      }
    });

    // If no subject specifically assigned by ID, fall back to all available subjects in teacher's school
    if (setOfSubs.size === 0 && availableSubjects.length > 0) {
      availableSubjects.forEach(s => setOfSubs.add(s.name));
    }

    // Also collect subjects present in results for this teacher's students
    stats.forEach(s => { if (s.subject) setOfSubs.add(s.subject); });

    return Array.from(setOfSubs);
  }, [teacher, availableSubjects, canManageAll, stats]);

  // Available classrooms list for dropdown filter
  const classroomOptions = useMemo(() => {
    const setOfRooms = new Set<string>();
    students.forEach(s => {
      if (s.grade && s.classroom) {
        const fullRoom = `${GRADE_LABELS[s.grade] || s.grade}/${s.classroom}`;
        setOfRooms.add(fullRoom);
      }
    });
    return Array.from(setOfRooms).sort();
  }, [students]);

  // Student scope filter helper
  const isStudentInTeacherScope = (studentId: string) => {
    if (canManageAll || !teacher) return true;
    const st = students.find(s => String(s.id).trim() === String(studentId).trim());
    if (!st) return true; // Keep result if student record not found in scope

    if (teacherGrades.length > 0 && st.grade && !teacherGrades.includes(st.grade)) {
      return false;
    }

    if (teacherClassrooms.length > 0) {
      const stRoomFull = `${st.grade}/${st.classroom}`;
      const stRoomShort = st.classroom || '';
      const matches = teacherClassrooms.some(tc => tc === stRoomFull || tc === stRoomShort || tc.endsWith(`/${stRoomShort}`));
      if (!matches) return false;
    }

    return true;
  };

  // 3. Helper to determine result category
  const getResultCategory = (res: ExamResult): 'UNIT_TEST' | 'MIDTERM' | 'FINAL' | 'GENERAL' => {
    if (res.category === 'MIDTERM') return 'MIDTERM';
    if (res.category === 'FINAL') return 'FINAL';
    if (res.category === 'UNIT_TEST') return 'UNIT_TEST';

    if (res.assignmentId && assignments.length > 0) {
      const asg = assignments.find(a => String(a.id) === String(res.assignmentId));
      if (asg) {
        if (asg.category === 'MIDTERM') return 'MIDTERM';
        if (asg.category === 'FINAL') return 'FINAL';
        if (asg.category === 'UNIT_TEST') return 'UNIT_TEST';
        if (asg.title?.includes('กลางภาค')) return 'MIDTERM';
        if (asg.title?.includes('ปลายภาค')) return 'FINAL';
        if (asg.title?.includes('หน่วย') || asg.title?.includes('Unit')) return 'UNIT_TEST';
      }
    }

    const sub = res.subject || '';
    if (sub.includes('กลางภาค')) return 'MIDTERM';
    if (sub.includes('ปลายภาค')) return 'FINAL';
    if (sub.includes('หน่วย') || sub.includes('Unit')) return 'UNIT_TEST';

    return 'UNIT_TEST';
  };

  // 4. Filter stats according to active filters (Teacher Scope, Category, Subject, Classroom)
  const filteredStats = useMemo(() => {
    return stats.filter(res => {
      // Teacher scope filter
      if (!isStudentInTeacherScope(res.studentId)) return false;

      // Subject filter
      if (selectedSubject !== 'ALL' && res.subject !== selectedSubject) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        const cat = getResultCategory(res);
        if (selectedCategory === 'UNIT_TEST' && cat !== 'UNIT_TEST' && cat !== 'GENERAL') return false;
        if (selectedCategory === 'MIDTERM' && cat !== 'MIDTERM') return false;
        if (selectedCategory === 'FINAL' && cat !== 'FINAL') return false;
      }

      // Classroom filter
      if (selectedClassroom !== 'ALL') {
        const st = students.find(s => String(s.id).trim() === String(res.studentId).trim());
        if (st) {
          const stRoomFull = `${GRADE_LABELS[st.grade || ''] || st.grade}/${st.classroom}`;
          if (stRoomFull !== selectedClassroom) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const st = students.find(s => String(s.id).trim() === String(res.studentId).trim());
        const stName = st ? st.name.toLowerCase() : (res.studentName || '').toLowerCase();
        const subName = (res.subject || '').toLowerCase();
        if (!stName.includes(term) && !subName.includes(term) && !String(res.studentId).includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [stats, students, selectedSubject, selectedCategory, selectedClassroom, searchTerm, teacherGrades, teacherClassrooms, canManageAll, assignments]);

  // 5. Compute Overall Score Metrics
  const summaryMetrics = useMemo(() => {
    if (filteredStats.length === 0) {
      return {
        totalAttempts: 0,
        uniqueStudentsCount: 0,
        averagePercent: 0,
        maxPercent: 0,
        minPercent: 0,
        passRate: 0,
        passCount: 0
      };
    }

    let totalScoreSum = 0;
    let totalQuestionsSum = 0;
    let maxP = 0;
    let minP = 100;
    let passC = 0;
    const studentIds = new Set<string>();

    filteredStats.forEach(r => {
      studentIds.add(String(r.studentId).trim());
      const qCount = r.totalQuestions || 1;
      const pct = (r.score / qCount) * 100;
      totalScoreSum += r.score;
      totalQuestionsSum += qCount;
      if (pct > maxP) maxP = pct;
      if (pct < minP) minP = pct;
      if (pct >= 50) passC++;
    });

    const avgPct = totalQuestionsSum > 0 ? Math.round((totalScoreSum / totalQuestionsSum) * 100) : 0;

    return {
      totalAttempts: filteredStats.length,
      uniqueStudentsCount: studentIds.size,
      averagePercent: avgPct,
      maxPercent: Math.round(maxP),
      minPercent: Math.round(minP === 100 && filteredStats.length === 0 ? 0 : minP),
      passRate: Math.round((passC / filteredStats.length) * 100),
      passCount: passC
    };
  }, [filteredStats]);

  // 6. Topic / Unit Analysis
  const topicStats = useMemo(() => {
    const topics: Record<string, { name: string; correct: number; total: number }> = {};
    
    filteredStats.forEach(res => {
      if (res.details && Array.isArray(res.details)) {
        res.details.forEach(det => {
          const topicName = det.topic || 'ทั่วไป';
          if (!topics[topicName]) {
            topics[topicName] = { name: topicName, correct: 0, total: 0 };
          }
          topics[topicName].total += 1;
          if (det.isCorrect) topics[topicName].correct += 1;
        });
      }
    });

    return Object.values(topics).map(t => ({
      ...t,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
    })).sort((a, b) => b.accuracy - a.accuracy);
  }, [filteredStats]);

  // 7. Complete Item Analysis (วิเคราะห์ข้อสอบรายข้อ)
  const itemAnalysisData = useMemo(() => {
    const qMap: Record<string, { 
      id: string; 
      text: string; 
      unit: string;
      choices: any[];
      correctChoiceId: string;
      correctCount: number; 
      missedCount: number; 
      totalCount: number; 
    }> = {};

    filteredStats.forEach(res => {
      const detailsArray = typeof res.details === 'string' ? JSON.parse(res.details) : res.details;
      if (detailsArray && Array.isArray(detailsArray)) {
        detailsArray.forEach(det => {
          if (!det || !det.questionId) return;
          const qIdStr = String(det.questionId).trim();

          if (!qMap[qIdStr]) {
            const q = questions.find(q => String(q.id).trim() === qIdStr);
            const foundText = q?.text || det.questionText || det.text || det.question || 'ไม่พบข้อมูลโจทย์ข้อสอบ';
            qMap[qIdStr] = {
              id: qIdStr,
              text: foundText,
              unit: q?.unit || det.topic || 'หน่วยทั่วไป',
              choices: q?.choices || [],
              correctChoiceId: q?.correctChoiceId || '',
              correctCount: 0,
              missedCount: 0,
              totalCount: 0
            };
          } else if (qMap[qIdStr].text === 'ไม่พบข้อมูลโจทย์ข้อสอบ') {
            const q = questions.find(q => String(q.id).trim() === qIdStr);
            const foundText = q?.text || det.questionText || det.text || det.question;
            if (foundText) {
              qMap[qIdStr].text = foundText;
            }
          }

          qMap[qIdStr].totalCount += 1;
          if (det.isCorrect) {
            qMap[qIdStr].correctCount += 1;
          } else {
            qMap[qIdStr].missedCount += 1;
          }
        });
      }
    });

    const items = Object.values(qMap)
      .filter(q => q.totalCount > 0)
      .map(q => {
        const p = q.totalCount > 0 ? q.correctCount / q.totalCount : 0;
        const correctRatePct = Math.round(p * 100);
        const missRatePct = Math.round((q.missedCount / q.totalCount) * 100);
        const difficulty = getDifficultyInfo(p);

        return {
          ...q,
          p,
          correctRatePct,
          missRatePct,
          difficulty
        };
      });

    // 1. ข้อสอบที่นักเรียนทำผิดเยอะที่สุด (เรียงจาก % ทำผิด มากไปน้อย)
    const missedSorted = [...items].sort((a, b) => b.missRatePct - a.missRatePct);

    // 2. ข้อสอบที่นักเรียนทำถูกเยอะที่สุด (เรียงจาก % ทำถูก มากไปน้อย)
    const correctSorted = [...items].sort((a, b) => b.correctRatePct - a.correctRatePct);

    return {
      all: items,
      missedSorted,
      correctSorted
    };
  }, [filteredStats, questions]);

  // Helper function to format Thai date
  const formatThaiDate = (timestamp?: number) => {
    const d = timestamp ? new Date(timestamp) : new Date();
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleTriggerPrint = () => {
    setShowPrintModal(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="space-y-8 animate-fade-in font-prompt pb-20">
      {/* 🛠️ Top Bar: Category Filters & Scope Information */}
      <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl">
                <BarChart3 size={24}/>
              </div>
              ระบบวิเคราะห์ผลคะแนนและคุณภาพข้อสอบ
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-1 ml-1 flex items-center gap-2">
              <Users size={14} className="text-indigo-500"/>
              {canManageAll ? 'แสดงข้อมูลทุกห้องเรียนและทุกรายวิชา' : `แสดงเฉพาะห้องเรียนที่คุณครูสอน (${teacherGrades.map(g => GRADE_LABELS[g] || g).join(', ') || 'ประจำชั้น'})`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleTriggerPrint}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl flex items-center gap-2 transition shadow-lg active:scale-95"
            >
              <Printer size={18}/> พิมพ์รายงานสรุปวิเคราะห์ข้อสอบ
            </button>
          </div>
        </div>

        {/* 🎯 Exam Category Filter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button 
            onClick={() => setSelectedCategory('ALL')}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'ALL' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Layers size={16}/> การสอบทั้งหมด
          </button>
          <button 
            onClick={() => setSelectedCategory('UNIT_TEST')}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'UNIT_TEST' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <BookOpen size={16}/> หน่วยการเรียนรู้
          </button>
          <button 
            onClick={() => setSelectedCategory('MIDTERM')}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'MIDTERM' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <FileText size={16}/> สอบกลางภาค
          </button>
          <button 
            onClick={() => setSelectedCategory('FINAL')}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'FINAL' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Award size={16}/> สอบปลายภาค
          </button>
        </div>

        {/* 🔍 Dropdown Filters: Subject, Classroom, Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              เลือกรายวิชาที่คุณครูสอน
            </label>
            <select 
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
            >
              <option value="ALL">📚 ทุกรายวิชาที่สอน</option>
              {teacherSubjects.map(sub => (
                <option key={sub} value={sub}>วิชา {sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              เลือกห้องเรียน
            </label>
            <select 
              value={selectedClassroom} 
              onChange={e => setSelectedClassroom(e.target.value)}
              className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
            >
              <option value="ALL">🏫 ทุกห้องเรียนที่คุณครูสอน</option>
              {classroomOptions.map(room => (
                <option key={room} value={room}>ห้อง {room}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              ค้นหาชื่อนักเรียน / วิชา
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ชื่อ หรือ รหัสนักเรียน..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[30px] border-b-8 border-indigo-500 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">คะแนนเฉลี่ยรวม</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Target size={20}/></div>
          </div>
          <div className="text-4xl font-black text-indigo-600">
            {summaryMetrics.averagePercent}%
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            คะแนนสูงสุด {summaryMetrics.maxPercent}% • ต่ำสุด {summaryMetrics.minPercent}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-[30px] border-b-8 border-emerald-500 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">อัตราการสอบผ่าน (≥50%)</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20}/></div>
          </div>
          <div className="text-4xl font-black text-emerald-600">
            {summaryMetrics.passRate}%
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            ผ่านเกณฑ์ {summaryMetrics.passCount} จาก {summaryMetrics.totalAttempts} ครั้ง
          </p>
        </div>

        <div className="bg-white p-6 rounded-[30px] border-b-8 border-amber-500 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนนักเรียนที่เข้าสอบ</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Users size={20}/></div>
          </div>
          <div className="text-4xl font-black text-amber-600">
            {summaryMetrics.uniqueStudentsCount} <span className="text-xs font-bold text-slate-400">คน</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            จำนวนครั้งการทำสอบรวม {summaryMetrics.totalAttempts} ครั้ง
          </p>
        </div>

        <div className="bg-white p-6 rounded-[30px] border-b-8 border-purple-500 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประเภทการสอบที่เลือก</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><Sparkles size={20}/></div>
          </div>
          <div className="text-2xl font-black text-purple-600 truncate mt-1">
            {selectedCategory === 'ALL' ? 'ทุกประเภท' : selectedCategory === 'UNIT_TEST' ? 'หน่วยการเรียนรู้' : selectedCategory === 'MIDTERM' ? 'สอบกลางภาค' : 'สอบปลายภาค'}
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">
            ข้อสอบในระบบวิเคราะห์ {itemAnalysisData.all.length} ข้อ
          </p>
        </div>
      </div>

      {/* 🧭 Sub Navigation Tabs inside Analytics */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-8 py-4 font-black text-sm transition-all border-b-4 ${activeTab === 'ANALYTICS' ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          📊 รายงานวิเคราะห์คุณภาพข้อสอบรายข้อ (Item Analysis)
        </button>
        <button 
          onClick={() => setActiveTab('SCORES')}
          className={`px-8 py-4 font-black text-sm transition-all border-b-4 ${activeTab === 'SCORES' ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          📋 ตารางผลคะแนนนักเรียนรายบุคคล
        </button>
      </div>

      {activeTab === 'ANALYTICS' ? (
        <div className="space-y-8">
          {/* 1️⃣ ข้อสอบที่นักเรียนทำผิดเยอะที่สุด & ข้อสอบที่ทำถูกเยอะที่สุด */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ❌ 1. ข้อสอบที่นักเรียนทำผิดเยอะที่สุด */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <AlertCircle className="text-rose-500" size={24}/> 1. ข้อสอบที่นักเรียนทำผิดเยอะที่สุด
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 ml-9">แสดงจำนวนกี่คนและคิดเป็นกี่เปอร์เซ็นต์</p>
                </div>
                <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-black border border-rose-100">
                  {itemAnalysisData.missedSorted.length} ข้อ
                </span>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {itemAnalysisData.missedSorted.length > 0 ? (
                  itemAnalysisData.missedSorted.map((q, idx) => (
                    <div key={q.id || idx} className="p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 group hover:border-rose-200 transition-all">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg">
                          ลำดับที่ {idx + 1}
                        </span>
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black border ${q.difficulty.color}`}>
                          {q.difficulty.icon} ความยาก: {q.difficulty.level}
                        </span>
                      </div>

                      <p className="font-bold text-slate-800 text-sm leading-snug mb-3">{q.text}</p>

                      <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-2xl border border-slate-100 mb-3 text-xs font-bold">
                        <div className="text-rose-600">
                          <span>ทำผิด: </span>
                          <span className="font-black text-sm">{q.missedCount} คน</span>
                          <span className="text-[10px] text-slate-400 ml-1">({q.missRatePct}%)</span>
                        </div>
                        <div className="text-emerald-600">
                          <span>ทำถูก: </span>
                          <span className="font-black text-sm">{q.correctCount} คน</span>
                          <span className="text-[10px] text-slate-400 ml-1">({q.correctRatePct}%)</span>
                        </div>
                      </div>

                      <p className="text-[11px] font-bold text-slate-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                        💡 ข้อเสนอแนะ: {q.difficulty.recommendation}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-300 italic font-black">ไม่พบข้อมูลข้อสอบในเงื่อนไขนี้</div>
                )}
              </div>
            </div>

            {/* ✅ 2. ข้อสอบที่นักเรียนทำถูกเยอะที่สุด (เรียงจากมากไปหาน้อย) */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" size={24}/> 2. ข้อสอบที่นักเรียนทำถูกเยอะที่สุด
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 ml-9">เรียงลำดับจากมากไปหาน้อย พร้อมจำแนกความยากง่าย</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black border border-emerald-100">
                  {itemAnalysisData.correctSorted.length} ข้อ
                </span>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {itemAnalysisData.correctSorted.length > 0 ? (
                  itemAnalysisData.correctSorted.map((q, idx) => (
                    <div key={q.id || idx} className="p-5 bg-slate-50 rounded-3xl border-2 border-slate-100 group hover:border-emerald-200 transition-all">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg">
                          อันดับที่ {idx + 1} (ตอบถูกมากที่สุด)
                        </span>
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black border ${q.difficulty.color}`}>
                          {q.difficulty.icon} ความยาก: {q.difficulty.level}
                        </span>
                      </div>

                      <p className="font-bold text-slate-800 text-sm leading-snug mb-3">{q.text}</p>

                      <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-2xl border border-slate-100 mb-3 text-xs font-bold">
                        <div className="text-emerald-600">
                          <span>ตอบถูก: </span>
                          <span className="font-black text-sm">{q.correctCount} คน</span>
                          <span className="text-[10px] text-slate-400 ml-1">({q.correctRatePct}%)</span>
                        </div>
                        <div className="text-rose-600">
                          <span>ตอบผิด: </span>
                          <span className="font-black text-sm">{q.missedCount} คน</span>
                          <span className="text-[10px] text-slate-400 ml-1">({q.missRatePct}%)</span>
                        </div>
                      </div>

                      <p className="text-[11px] font-bold text-slate-500 italic bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                        ✨ ประเมินคุณภาพ: {q.difficulty.recommendation}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-300 italic font-black">ไม่พบข้อมูลข้อสอบในเงื่อนไขนี้</div>
                )}
              </div>
            </div>
          </div>

          {/* 📊 ความแม่นยำรายหัวข้อ Chart */}
          {topicStats.length > 0 && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-3 mb-6">
                <BarChart3 className="text-indigo-500"/> สรุปสถิติความแม่นยำรายหน่วยการเรียนรู้/หัวข้อ (%)
              </h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="accuracy" radius={[0, 10, 10, 0]} barSize={26}>
                      {topicStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.accuracy >= 70 ? '#10b981' : entry.accuracy >= 50 ? '#f59e0b' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 📚 Detailed Item Analysis Table */}
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
              <div>
                <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                  <BookOpen className="text-indigo-500"/> ตารางสรุปการจำแนกระดับความยากง่ายของข้อสอบทั้งหมด
                </h4>
                <p className="text-xs font-bold text-slate-400 mt-1">ใช้ค่าดัชนีความยากง่าย (Facility Index p) ในการจัดระดับความยากง่ายของข้อสอบ</p>
              </div>
              <button onClick={handleTriggerPrint} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition">
                <Printer size={14}/> พิมพ์ตารางวิเคราะห์
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-slate-400 font-black border-b uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="p-4 text-center">ข้อที่</th>
                    <th className="p-4">โจทย์ข้อสอบ / หน่วย</th>
                    <th className="p-4 text-center">คนตอบถูก</th>
                    <th className="p-4 text-center">คนตอบผิด</th>
                    <th className="p-4 text-center">% ความถูกต้อง (p)</th>
                    <th className="p-4 text-center">ระดับความยากง่าย</th>
                    <th className="p-4">ข้อเสนอแนะในการจัดการเรียนการสอน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700 text-xs">
                  {itemAnalysisData.all.map((q, i) => (
                    <tr key={q.id || i} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-center font-black text-slate-400">{i + 1}</td>
                      <td className="p-4 max-w-xs">
                        <div className="font-black text-slate-800 text-sm line-clamp-2">{q.text}</div>
                        <div className="text-[10px] text-indigo-500 font-bold mt-0.5">{q.unit}</div>
                      </td>
                      <td className="p-4 text-center font-black text-emerald-600">{q.correctCount} คน</td>
                      <td className="p-4 text-center font-black text-rose-600">{q.missedCount} คน</td>
                      <td className="p-4 text-center font-black text-slate-800">
                        {q.correctRatePct}% <span className="text-[10px] text-slate-400 font-bold">(p={q.p.toFixed(2)})</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border shadow-sm ${q.difficulty.color}`}>
                          {q.difficulty.icon} {q.difficulty.level}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-[11px] max-w-xs leading-relaxed">
                        {q.difficulty.recommendation}
                      </td>
                    </tr>
                  ))}
                  {itemAnalysisData.all.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-16 text-center text-slate-300 italic font-black">
                        ยังไม่มีข้อมูลข้อสอบเพื่อวิเคราะห์คุณภาพ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 📋 Tab: Student Score Details Table */
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                <GraduationCap className="text-indigo-600"/> ตารางแสดงผลคะแนนของนักเรียนรายบุคคล
              </h4>
              <p className="text-xs font-bold text-slate-400 mt-1">
                พิจารณาเฉพาะนักเรียนในห้องเรียนที่สอน ({filteredStats.length} รายการผลสอบ)
              </p>
            </div>
            <button onClick={handleTriggerPrint} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl flex items-center gap-2 transition shadow-md">
              <Printer size={16}/> พิมพ์ใบคะแนน
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white text-slate-400 font-black border-b uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="p-4">นักเรียน</th>
                  <th className="p-4 text-center">ชั้น / ห้อง</th>
                  <th className="p-4">รายวิชา / แบบทดสอบ</th>
                  <th className="p-4 text-center">ประเภทการสอบ</th>
                  <th className="p-4 text-center">คะแนนที่ได้</th>
                  <th className="p-4 text-center">คิดเป็น %</th>
                  <th className="p-4 text-center">ผลการประเมิน</th>
                  <th className="p-4 text-right">วันที่ทำสอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700 text-xs">
                {filteredStats.map((r, i) => {
                  const st = students.find(s => String(s.id).trim() === String(r.studentId).trim());
                  const stName = st ? st.name : (r.studentName || `นักเรียน ID: ${r.studentId}`);
                  const stRoom = st ? `${GRADE_LABELS[st.grade || ''] || st.grade}/${st.classroom}` : '-';
                  const cat = getResultCategory(r);
                  const pct = Math.round((r.score / (r.totalQuestions || 1)) * 100);
                  const isPass = pct >= 50;

                  return (
                    <tr key={r.id || i} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-black text-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-sm font-black">
                          {st?.avatar || '👤'}
                        </div>
                        <div>
                          <div>{stName}</div>
                          <div className="text-[10px] text-slate-400 font-bold">ID: {r.studentId}</div>
                        </div>
                      </td>
                      <td className="p-4 text-center font-black text-slate-600">{stRoom}</td>
                      <td className="p-4">
                        <div className="font-black text-slate-800">{r.subject}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${cat === 'UNIT_TEST' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : cat === 'MIDTERM' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {cat === 'UNIT_TEST' ? 'หน่วยการเรียนรู้' : cat === 'MIDTERM' ? 'สอบกลางภาค' : 'สอบปลายภาค'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-900 text-sm">
                        {r.score} / {r.totalQuestions}
                      </td>
                      <td className="p-4 text-center font-black text-indigo-600 text-sm">
                        {pct}%
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isPass ? 'ผ่านเกณฑ์' : 'ควรพัฒนา'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400 text-[11px]">
                        {formatThaiDate(r.timestamp)}
                      </td>
                    </tr>
                  );
                })}
                {filteredStats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-slate-300 italic font-black">
                      ยังไม่มีผลคะแนนในเงื่อนไขการค้นหานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🖨️ Printable Document Modal (Rendered cleanly for printing) */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 font-prompt overflow-y-auto">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-modal-container, .print-modal-container * {
                visibility: visible !important;
              }
              .print-modal-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
              }
              .printable-report {
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                color: black !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
            }
          `}</style>
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 space-y-6 shadow-2xl relative border-t-8 border-indigo-600 print-modal-container my-8">
            <button 
              onClick={() => setShowPrintModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition print:hidden"
            >
              ✕
            </button>

            {/* Print action controls inside modal */}
            <div className="flex items-center justify-between pb-4 border-b print:hidden">
              <div>
                <h3 className="font-black text-lg text-slate-800">ตัวอย่างรายงานสรุปผลการวิเคราะห์ข้อสอบ</h3>
                <p className="text-xs text-slate-400 font-bold">กดปุ่ม "พิมพ์เอกสาร" เพื่อส่งพิมพ์ออกทางเครื่องพิมพ์หรือเซฟเป็น PDF</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md"
                >
                  <Printer size={16}/> พิมพ์เอกสาร / บันทึก PDF
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="printable-report space-y-6 text-slate-900 text-xs font-sarabun p-4 bg-white">
              {/* Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                <h2 className="text-xl font-bold tracking-tight">แบบรายงานสรุปผลการวิเคราะห์คุณภาพข้อสอบและผลสัมฤทธิ์ทางการเรียน</h2>
                <h3 className="text-sm font-semibold">
                  โรงเรียน{teacher?.school || 'ประถมศึกษา'} • ภาคเรียนการศึกษาปัจจุบัน
                </h3>
                <div className="flex justify-center gap-6 text-xs text-slate-700 pt-2 font-medium">
                  <span><strong>ครูผู้สอน:</strong> {teacher?.name || 'ครูผู้สอนประจำวิชา'}</span>
                  <span><strong>รายวิชา:</strong> {selectedSubject === 'ALL' ? 'ทุกรายวิชา' : selectedSubject}</span>
                  <span><strong>ระดับชั้น/ห้อง:</strong> {selectedClassroom === 'ALL' ? 'ห้องเรียนที่สอน' : selectedClassroom}</span>
                  <span><strong>ประเภทการสอบ:</strong> {selectedCategory === 'ALL' ? 'รวมทุกประเภท' : selectedCategory === 'UNIT_TEST' ? 'หน่วยการเรียนรู้' : selectedCategory === 'MIDTERM' ? 'สอบกลางภาค' : 'สอบปลายภาค'}</span>
                </div>
              </div>

              {/* 📊 Part 1: Summary KPI Table */}
              <div>
                <h4 className="font-bold text-sm mb-2 text-slate-800">ส่วนที่ 1: ตารางสรุปภาพรวมผลการสอบ</h4>
                <table className="w-full border-collapse border border-slate-400 text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-400 p-2">จำนวนนักเรียนเข้าสอบ</th>
                      <th className="border border-slate-400 p-2">คะแนนเฉลี่ย (%)</th>
                      <th className="border border-slate-400 p-2">คะแนนสูงสุด (%)</th>
                      <th className="border border-slate-400 p-2">คะแนนต่ำสุด (%)</th>
                      <th className="border border-slate-400 p-2">จำนวนที่สอบผ่าน (≥50%)</th>
                      <th className="border border-slate-400 p-2">คิดเป็นอัตราผ่าน (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2">{summaryMetrics.uniqueStudentsCount} คน ({summaryMetrics.totalAttempts} ครั้ง)</td>
                      <td className="border border-slate-400 p-2 font-bold">{summaryMetrics.averagePercent}%</td>
                      <td className="border border-slate-400 p-2">{summaryMetrics.maxPercent}%</td>
                      <td className="border border-slate-400 p-2">{summaryMetrics.minPercent}%</td>
                      <td className="border border-slate-400 p-2">{summaryMetrics.passCount} คน</td>
                      <td className="border border-slate-400 p-2 font-bold">{summaryMetrics.passRate}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 🎯 Part 2: Item Analysis Table */}
              <div>
                <h4 className="font-bold text-sm mb-2 text-slate-800">ส่วนที่ 2: รายงานผลการจำแนกระดับความยากง่ายของข้อสอบ (Item Analysis)</h4>
                <table className="w-full border-collapse border border-slate-400 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-center">
                      <th className="border border-slate-400 p-1.5 w-10">ข้อที่</th>
                      <th className="border border-slate-400 p-1.5">ข้อความโจทย์ข้อสอบ / หน่วย</th>
                      <th className="border border-slate-400 p-1.5 w-16">คนตอบถูก</th>
                      <th className="border border-slate-400 p-1.5 w-16">คนตอบผิด</th>
                      <th className="border border-slate-400 p-1.5 w-20">% ความถูกต้อง (p)</th>
                      <th className="border border-slate-400 p-1.5 w-24">ระดับความยากง่าย</th>
                      <th className="border border-slate-400 p-1.5">ข้อเสนอแนะในการจัดการเรียนการสอน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemAnalysisData.all.map((q, idx) => (
                      <tr key={q.id || idx}>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-400 p-1.5">
                          <div className="font-medium">{q.text}</div>
                          <div className="text-[10px] text-slate-500">[{q.unit}]</div>
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center">{q.correctCount}</td>
                        <td className="border border-slate-400 p-1.5 text-center">{q.missedCount}</td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{q.correctRatePct}% (p={q.p.toFixed(2)})</td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">{q.difficulty.level}</td>
                        <td className="border border-slate-400 p-1.5 text-[11px]">{q.difficulty.recommendation}</td>
                      </tr>
                    ))}
                    {itemAnalysisData.all.length === 0 && (
                      <tr>
                        <td colSpan={7} className="border border-slate-400 p-4 text-center italic text-slate-500">
                          ไม่มีข้อมูลวิเคราะห์รายข้อ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ✍️ Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs font-medium">
                <div className="space-y-8">
                  <p>ลงชื่อ..........................................................</p>
                  <p>({teacher?.name || '..........................................................'})<br/>ครูผู้สอน/ผู้สรุปรายงาน</p>
                </div>
                <div className="space-y-8">
                  <p>ลงชื่อ..........................................................</p>
                  <p>(..........................................................)<br/>หัวหน้าฝ่ายวิชาการ</p>
                </div>
                <div className="space-y-8">
                  <p>ลงชื่อ..........................................................</p>
                  <p>(..........................................................)<br/>ผู้อำนวยการโรงเรียน</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAnalytics;
