import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExamResult, Question, Student, SubjectConfig, Teacher, Assignment } from '../types';
import { 
  Target, BarChart3, AlertCircle, CheckCircle2, BookOpen,
  Printer, Search, Award, Users, GraduationCap,
  Sparkles, FileText, Layers, Filter, RotateCcw, X, Lock, Unlock, RefreshCw
} from 'lucide-react';
import { toggleRetakePermission } from '../services/api';

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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL_STUDENT' | 'ANALYTICS' | 'SCORES'>('INDIVIDUAL_STUDENT');
  const [individualSubTab, setIndividualSubTab] = useState<'MIDTERM' | 'FINAL'>('MIDTERM');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const [localStats, setLocalStats] = useState<ExamResult[]>(stats);

  useEffect(() => {
    setLocalStats(stats);
  }, [stats]);

  const handleToggleRetake = async (r: ExamResult, allowRetake: boolean) => {
    if (!r) return;
    const success = await toggleRetakePermission({
      resultId: r.id,
      assignmentId: r.assignmentId || undefined,
      studentId: r.studentId,
      allowRetake,
      mode: 'single'
    });

    if (success) {
      setLocalStats(prev => prev.map(item => {
        if (String(item.id) === String(r.id)) {
          const detObj = typeof item.details === 'string' ? (() => { try { return JSON.parse(item.details); } catch(e) { return {}; } })() : (item.details || {});
          detObj.retakeAllowed = allowRetake;
          return { ...item, details: detObj };
        }
        return item;
      }));
    }
  };

  const handleBatchToggleRetake = async (allowRetake: boolean) => {
    if (selectedAssignmentId !== 'ALL') {
      const success = await toggleRetakePermission({
        assignmentId: selectedAssignmentId,
        allowRetake,
        mode: 'all'
      });

      if (success) {
        setLocalStats(prev => prev.map(item => {
          if (String(item.assignmentId) === String(selectedAssignmentId)) {
            const detObj = typeof item.details === 'string' ? (() => { try { return JSON.parse(item.details); } catch(e) { return {}; } })() : (item.details || {});
            detObj.retakeAllowed = allowRetake;
            return { ...item, details: detObj };
          }
          return item;
        }));
      }
    } else {
      // Toggle for all filtered stats
      for (const r of filteredStats) {
        await toggleRetakePermission({
          resultId: r.id,
          assignmentId: r.assignmentId || undefined,
          studentId: r.studentId,
          allowRetake,
          mode: 'single'
        });
      }
      setLocalStats(prev => prev.map(item => {
        if (filteredStats.some(f => String(f.id) === String(item.id))) {
          const detObj = typeof item.details === 'string' ? (() => { try { return JSON.parse(item.details); } catch(e) { return {}; } })() : (item.details || {});
          detObj.retakeAllowed = allowRetake;
          return { ...item, details: detObj };
        }
        return item;
      }));
    }
  };

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

    if (setOfSubs.size === 0 && availableSubjects.length > 0) {
      availableSubjects.forEach(s => setOfSubs.add(s.name));
    }

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

  // Available specific assignments list (ชุดข้อสอบ/การสอบ)
  const assignmentOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string; category?: string; subject?: string }>();
    
    assignments.forEach(a => {
      map.set(String(a.id), {
        id: String(a.id),
        title: a.title || 'แบบทดสอบ',
        category: a.category,
        subject: a.subject
      });
    });

    stats.forEach(r => {
      if (r.assignmentId && !map.has(String(r.assignmentId))) {
        const catLabel = r.category === 'MIDTERM' ? 'กลางภาค' : r.category === 'FINAL' ? 'ปลายภาค' : 'หน่วย';
        map.set(String(r.assignmentId), {
          id: String(r.assignmentId),
          title: r.subject ? `แบบทดสอบวิชา ${r.subject} (${catLabel})` : `แบบทดสอบ ID: ${r.assignmentId}`,
          category: r.category,
          subject: r.subject
        });
      }
    });

    let list = Array.from(map.values());
    if (selectedSubject !== 'ALL') {
      list = list.filter(a => !a.subject || a.subject === selectedSubject);
    }
    if (selectedCategory !== 'ALL') {
      list = list.filter(a => {
        if (!a.category) return true;
        if (selectedCategory === 'UNIT_TEST') return a.category === 'UNIT_TEST' || a.category === 'GENERAL';
        return a.category === selectedCategory;
      });
    }

    return list;
  }, [assignments, stats, selectedSubject, selectedCategory]);

  // Available specific units/topics list (หน่วยการเรียนรู้ / เรื่อง)
  const topicOptions = useMemo(() => {
    const topicSet = new Set<string>();

    questions.forEach(q => {
      if (q.unit && q.unit.trim()) {
        if (selectedSubject === 'ALL' || q.subject === selectedSubject) {
          topicSet.add(q.unit.trim());
        }
      }
    });

    stats.forEach(r => {
      if (selectedSubject !== 'ALL' && r.subject && r.subject !== selectedSubject) return;
      const detailsArray = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
      if (Array.isArray(detailsArray)) {
        detailsArray.forEach((d: any) => {
          if (d?.topic && d.topic.trim()) {
            topicSet.add(d.topic.trim());
          }
        });
      }
    });

    return Array.from(topicSet).sort();
  }, [questions, stats, selectedSubject]);

  // Student scope filter helper
  const isStudentInTeacherScope = (studentId: string) => {
    if (canManageAll || !teacher) return true;
    const st = students.find(s => String(s.id).trim() === String(studentId).trim());
    if (!st) return true;

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

  // Helper to determine result category
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

  // Filter stats according to active filters
  const filteredStats = useMemo(() => {
    return localStats.filter(res => {
      if (!isStudentInTeacherScope(res.studentId)) return false;

      if (selectedSubject !== 'ALL' && res.subject !== selectedSubject) {
        return false;
      }

      if (selectedCategory !== 'ALL') {
        const cat = getResultCategory(res);
        if (selectedCategory === 'UNIT_TEST' && cat !== 'UNIT_TEST' && cat !== 'GENERAL') return false;
        if (selectedCategory === 'MIDTERM' && cat !== 'MIDTERM') return false;
        if (selectedCategory === 'FINAL' && cat !== 'FINAL') return false;
      }

      if (selectedClassroom !== 'ALL') {
        const st = students.find(s => String(s.id).trim() === String(res.studentId).trim());
        if (st) {
          const stRoomFull = `${GRADE_LABELS[st.grade || ''] || st.grade}/${st.classroom}`;
          if (stRoomFull !== selectedClassroom) return false;
        }
      }

      if (selectedAssignmentId !== 'ALL') {
        if (String(res.assignmentId) !== String(selectedAssignmentId)) {
          return false;
        }
      }

      if (selectedTopic !== 'ALL') {
        const detailsArray = typeof res.details === 'string' ? JSON.parse(res.details) : res.details;
        let matchTopic = false;
        if (Array.isArray(detailsArray)) {
          matchTopic = detailsArray.some((det: any) => {
            if (det?.topic && det.topic.trim() === selectedTopic.trim()) return true;
            const q = questions.find(q => String(q.id).trim() === String(det.questionId).trim());
            if (q?.unit && q.unit.trim() === selectedTopic.trim()) return true;
            return false;
          });
        }
        if (!matchTopic) return false;
      }

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
  }, [stats, students, selectedSubject, selectedCategory, selectedClassroom, selectedAssignmentId, selectedTopic, searchTerm, teacherGrades, teacherClassrooms, canManageAll, assignments, questions]);

  // 🎯 Filtered stats deduplicated per student per assignment/subject (latest attempt)
  const latestStatsPerStudent = useMemo(() => {
    const map = new Map<string, ExamResult>();
    filteredStats.forEach(res => {
      const key = `${String(res.studentId).trim()}_${res.assignmentId ? String(res.assignmentId).trim() : res.subject}`;
      const existing = map.get(key);
      if (!existing || Number(res.timestamp || 0) > Number(existing.timestamp || 0)) {
        map.set(key, res);
      }
    });
    return Array.from(map.values());
  }, [filteredStats]);

  // Compute Overall Score Metrics
  const summaryMetrics = useMemo(() => {
    if (latestStatsPerStudent.length === 0) {
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

    latestStatsPerStudent.forEach(r => {
      studentIds.add(String(r.studentId).trim());
      
      let qCount = r.totalQuestions || 1;
      let scoreVal = r.score;

      if (selectedTopic !== 'ALL') {
        const detailsArray = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
        if (Array.isArray(detailsArray)) {
          let topicScore = 0;
          let topicTotal = 0;
          detailsArray.forEach((det: any) => {
            const q = questions.find(q => String(q.id).trim() === String(det.questionId).trim());
            const unitName = q?.unit || det.topic;
            if (unitName?.trim() === selectedTopic.trim() || det.topic?.trim() === selectedTopic.trim()) {
              topicTotal += 1;
              if (det.isCorrect) topicScore += 1;
            }
          });
          if (topicTotal > 0) {
            qCount = topicTotal;
            scoreVal = topicScore;
          }
        }
      }

      const pct = (scoreVal / qCount) * 100;
      totalScoreSum += scoreVal;
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
      minPercent: Math.round(minP === 100 && latestStatsPerStudent.length === 0 ? 0 : minP),
      passRate: Math.round((passC / latestStatsPerStudent.length) * 100),
      passCount: passC
    };
  }, [latestStatsPerStudent, filteredStats.length, selectedTopic, questions]);

  // Topic / Unit Analysis
  const topicStats = useMemo(() => {
    const topics: Record<string, { name: string; correct: number; total: number }> = {};
    
    latestStatsPerStudent.forEach(res => {
      const detailsArray = typeof res.details === 'string' ? JSON.parse(res.details) : res.details;
      if (detailsArray && Array.isArray(detailsArray)) {
        detailsArray.forEach((det: any) => {
          const q = questions.find(q => String(q.id).trim() === String(det.questionId).trim());
          const topicName = q?.unit || det.topic || 'หน่วยทั่วไป';
          
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
  }, [latestStatsPerStudent, questions]);

  // Complete Item Analysis (วิเคราะห์ข้อสอบรายข้อ)
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

    latestStatsPerStudent.forEach(res => {
      const detailsArray = typeof res.details === 'string' ? JSON.parse(res.details) : res.details;
      if (detailsArray && Array.isArray(detailsArray)) {
        detailsArray.forEach((det: any) => {
          if (!det || !det.questionId) return;
          const qIdStr = String(det.questionId).trim();
          const q = questions.find(q => String(q.id).trim() === qIdStr);
          const unitName = q?.unit || det.topic || 'หน่วยทั่วไป';

          if (selectedTopic !== 'ALL') {
            const isMatch = (unitName && unitName.trim() === selectedTopic.trim()) ||
                            (det.topic && det.topic.trim() === selectedTopic.trim());
            if (!isMatch) return;
          }

          if (!qMap[qIdStr]) {
            const foundText = q?.text || det.questionText || det.text || det.question || 'ไม่พบข้อมูลโจทย์ข้อสอบ';
            qMap[qIdStr] = {
              id: qIdStr,
              text: foundText,
              unit: unitName,
              choices: q?.choices || [],
              correctChoiceId: q?.correctChoiceId || '',
              correctCount: 0,
              missedCount: 0,
              totalCount: 0
            };
          } else if (qMap[qIdStr].text === 'ไม่พบข้อมูลโจทย์ข้อสอบ') {
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

    const missedSorted = [...items].sort((a, b) => b.missRatePct - a.missRatePct);
    const correctSorted = [...items].sort((a, b) => b.correctRatePct - a.correctRatePct);

    return {
      all: items,
      missedSorted,
      correctSorted
    };
  }, [filteredStats, questions, selectedTopic]);

  // 🎓 Compute Individual Student Analysis for Midterm and Final
  const individualStudentAnalysis = useMemo(() => {
    interface SubjectScoreItem {
      score: number;
      total: number;
      pct: number;
      isPass: boolean;
      details?: any;
      retakeScore?: number;
      retakeTotal?: number;
      retakePct?: number;
      isRetakePassed?: boolean;
      retakeAllowed?: boolean;
      resultObj?: ExamResult;
    }

    interface StudentRecord {
      student: Student | undefined;
      studentId: string;
      studentName: string;
      classroom: string;
      subjectScores: Record<string, SubjectScoreItem>;
      totalScore: number;
      totalPossible: number;
      avgPct: number;
      passCount: number;
      totalSubjects: number;
      evaluationGrade: { label: string; color: string; badgeBg: string; desc: string; icon: string };
      needsIntervention: boolean;
      weakSubjects: string[];
    }

    const targetStudentsMap = new Map<string, StudentRecord>();

    // Filter stats matching current individual sub tab (MIDTERM or FINAL)
    const categoryStats = localStats.filter(res => {
      const cat = getResultCategory(res);
      if (cat !== individualSubTab) return false;

      // Filter by selected classroom if specified
      const st = students.find(s => String(s.id).trim() === String(res.studentId).trim());
      if (selectedClassroom !== 'ALL' && st) {
        if (`${st.grade}/${st.classroom}` !== selectedClassroom && String(st.classroom) !== selectedClassroom) return false;
      }
      return true;
    });

    // Group by Student ID
    categoryStats.forEach(res => {
      const sId = String(res.studentId).trim();
      const st = students.find(s => String(s.id).trim() === sId);
      const stName = st ? st.name : (res.studentName || `นักเรียน ID: ${sId}`);
      const stRoom = st ? `${GRADE_LABELS[st.grade || ''] || st.grade}/${st.classroom}` : 'ทั่วไป';

      if (!targetStudentsMap.has(sId)) {
        targetStudentsMap.set(sId, {
          student: st,
          studentId: sId,
          studentName: stName,
          classroom: stRoom,
          subjectScores: {},
          totalScore: 0,
          totalPossible: 0,
          avgPct: 0,
          passCount: 0,
          totalSubjects: 0,
          evaluationGrade: { label: 'ควรได้รับการพัฒนา', color: 'text-rose-600', badgeBg: 'bg-rose-100 text-rose-800', desc: '', icon: '🔴' },
          needsIntervention: false,
          weakSubjects: []
        });
      }

      const stData = targetStudentsMap.get(sId)!;
      const subName = res.subject || 'วิชาทั่วไป';
      const totalQ = res.totalQuestions || 1;
      const pct = Math.round((res.score / totalQ) * 100);

      const detailsObj = typeof res.details === 'string' ? (() => { try { return JSON.parse(res.details); } catch(e) { return res.details; } })() : res.details;
      const retakeScoreVal = detailsObj?.retakeScore;
      const retakeTotalVal = detailsObj?.retakeTotal || totalQ;
      const retakePct = retakeScoreVal !== undefined ? Math.round((retakeScoreVal / retakeTotalVal) * 100) : undefined;
      const isRetakePassed = retakePct !== undefined ? retakePct >= 50 : false;
      const finalPass = pct >= 50 || isRetakePassed;

      stData.subjectScores[subName] = {
        score: res.score,
        total: totalQ,
        pct: pct,
        isPass: finalPass,
        details: res.details,
        retakeScore: retakeScoreVal,
        retakeTotal: retakeTotalVal,
        retakePct: retakePct,
        isRetakePassed: isRetakePassed,
        retakeAllowed: !!detailsObj?.retakeAllowed,
        resultObj: res
      };
    });

    const resultList: StudentRecord[] = [];

    targetStudentsMap.forEach(stData => {
      const subjects = Object.keys(stData.subjectScores);
      stData.totalSubjects = subjects.length;

      let sumScore = 0;
      let sumPossible = 0;
      let passC = 0;
      const weakSubs: string[] = [];

      subjects.forEach(sub => {
        const item = stData.subjectScores[sub];
        sumScore += item.score;
        sumPossible += item.total;
        if (item.isPass) {
          passC += 1;
        } else {
          weakSubs.push(sub);
        }
      });

      stData.totalScore = sumScore;
      stData.totalPossible = sumPossible;
      stData.avgPct = sumPossible > 0 ? Math.round((sumScore / sumPossible) * 100) : 0;
      stData.passCount = passC;
      stData.weakSubjects = weakSubs;

      // Evaluation Grading Criteria
      if (stData.avgPct >= 80) {
        stData.evaluationGrade = {
          label: 'ดีมาก (Excellent)',
          color: 'text-emerald-600',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          desc: 'เข้าใจเนื้อหาบทเรียนเป็นอย่างดีเยี่ยม มีผลการเรียนโดดเด่น',
          icon: '🌟'
        };
      } else if (stData.avgPct >= 70) {
        stData.evaluationGrade = {
          label: 'ดี (Good)',
          color: 'text-teal-600',
          badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
          desc: 'ผลการเรียนอยู่ในเกณฑ์ดี มีความเข้าใจบทเรียนค่อนข้างสมบูรณ์',
          icon: '🟢'
        };
      } else if (stData.avgPct >= 60) {
        stData.evaluationGrade = {
          label: 'ปานกลาง / ผ่านเกณฑ์ (Satisfactory)',
          color: 'text-blue-600',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          desc: 'ผ่านเกณฑ์มาตรฐาน ควรได้รับการส่งเสริมต่อเนื่องในจุดที่ยังผิดพลาด',
          icon: '🔵'
        };
      } else if (stData.avgPct >= 50) {
        stData.evaluationGrade = {
          label: 'ผ่านเกณฑ์ขั้นต่ำ (Basic Pass)',
          color: 'text-amber-600',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          desc: 'ผ่านเกณฑ์ขั้นต่ำ ควรได้รับการแนะนำและทบทวนบทเรียนเพิ่มเติม',
          icon: '🟡'
        };
      } else {
        stData.evaluationGrade = {
          label: 'ควรได้รับการพัฒนาและซ่อมเสริม (Intervention Needed)',
          color: 'text-rose-600',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200 font-black',
          desc: 'คะแนนต่ำกว่าเกณฑ์มาตรฐานในหลายวิชา ต้องการการติวและดูแลเป็นพิเศษ',
          icon: '🔴'
        };
        stData.needsIntervention = true;
      }

      // Trigger intervention if failed in more than half of taken subjects
      if (weakSubs.length > 0 && weakSubs.length >= Math.ceil(subjects.length / 2)) {
        stData.needsIntervention = true;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (stData.studentName.toLowerCase().includes(term) || stData.classroom.toLowerCase().includes(term)) {
          resultList.push(stData);
        }
      } else {
        resultList.push(stData);
      }
    });

    // Sort: students needing intervention first, then by avgPct ascending
    resultList.sort((a, b) => {
      if (a.needsIntervention && !b.needsIntervention) return -1;
      if (!a.needsIntervention && b.needsIntervention) return 1;
      return a.avgPct - b.avgPct;
    });

    const interventionList = resultList.filter(s => s.needsIntervention);

    return {
      allStudents: resultList,
      interventionList,
      totalAnalyzed: resultList.length
    };
  }, [stats, students, individualSubTab, selectedClassroom, searchTerm]);

  const getSpecificSelectionTitle = () => {
    if (selectedTopic !== 'ALL') {
      return `หน่วยการเรียนรู้/เรื่อง: "${selectedTopic}"`;
    }
    if (selectedAssignmentId !== 'ALL') {
      const asg = assignmentOptions.find(a => a.id === selectedAssignmentId);
      return `ชุดข้อสอบ: "${asg?.title || selectedAssignmentId}"`;
    }
    if (selectedCategory !== 'ALL') {
      return selectedCategory === 'UNIT_TEST' ? 'การสอบประจำหน่วยการเรียนรู้' : selectedCategory === 'MIDTERM' ? 'การสอบกลางภาค' : 'การสอบปลายภาค';
    }
    return 'ภาพรวมการสอบทั้งหมด';
  };

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

  const handlePrintSpecificTopic = (topicName: string) => {
    setSelectedTopic(topicName);
    setShowPrintModal(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="space-y-8 animate-fade-in font-prompt pb-20">
      {/* 🛠️ Top Bar & Filter Area */}
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
              <Printer size={18}/> พิมพ์รายงานวิเคราะห์คุณภาพข้อสอบ
            </button>
          </div>
        </div>

        {/* 🎯 Exam Category Filter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button 
            onClick={() => { setSelectedCategory('ALL'); setSelectedAssignmentId('ALL'); }}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'ALL' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Layers size={16}/> การสอบทั้งหมด
          </button>
          <button 
            onClick={() => { setSelectedCategory('UNIT_TEST'); setSelectedAssignmentId('ALL'); }}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'UNIT_TEST' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <BookOpen size={16}/> หน่วยการเรียนรู้
          </button>
          <button 
            onClick={() => { setSelectedCategory('MIDTERM'); setSelectedAssignmentId('ALL'); }}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'MIDTERM' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <FileText size={16}/> สอบกลางภาค
          </button>
          <button 
            onClick={() => { setSelectedCategory('FINAL'); setSelectedAssignmentId('ALL'); }}
            className={`p-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${selectedCategory === 'FINAL' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Award size={16}/> สอบปลายภาค
          </button>
        </div>

        {/* 🔍 Dropdown Filters: Subject, Classroom, Specific Assignment, Specific Topic, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              รายวิชา
            </label>
            <select 
              value={selectedSubject} 
              onChange={e => { setSelectedSubject(e.target.value); setSelectedTopic('ALL'); setSelectedAssignmentId('ALL'); }}
              className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
            >
              <option value="ALL">📚 ทุกรายวิชาที่สอน</option>
              {teacherSubjects.map(sub => (
                <option key={sub} value={sub}>วิชา {sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              ห้องเรียน
            </label>
            <select 
              value={selectedClassroom} 
              onChange={e => setSelectedClassroom(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
            >
              <option value="ALL">🏫 ทุกห้องเรียนที่คุณครูสอน</option>
              {classroomOptions.map(room => (
                <option key={room} value={room}>ห้อง {room}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5 ml-1 font-black">
              🎯 เจาะจงชุดข้อสอบ/การสอบ
            </label>
            <select 
              value={selectedAssignmentId} 
              onChange={e => setSelectedAssignmentId(e.target.value)}
              className="w-full p-2.5 bg-indigo-50/60 border-2 border-indigo-100 rounded-xl font-bold text-xs text-indigo-900 outline-none focus:border-indigo-500 transition"
            >
              <option value="ALL">📋 รวมทุกชุดข้อสอบ</option>
              {assignmentOptions.map(asg => (
                <option key={asg.id} value={asg.id}>{asg.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 ml-1 font-black">
              🎯 เจาะจงหน่วย/เรื่อง
            </label>
            <select 
              value={selectedTopic} 
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full p-2.5 bg-emerald-50/60 border-2 border-emerald-100 rounded-xl font-bold text-xs text-emerald-900 outline-none focus:border-emerald-500 transition"
            >
              <option value="ALL">📖 รวมทุกหน่วยการเรียนรู้</option>
              {topicOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              ค้นหานักเรียน / วิชา
            </label>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ชื่อ..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-400 transition"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            </div>
          </div>
        </div>

        {/* 🎯 Prominent Banner when Specific Topic or Assignment is Filtered */}
        {(selectedTopic !== 'ALL' || selectedAssignmentId !== 'ALL' || selectedCategory !== 'ALL') && (
          <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 rounded-2xl border-2 border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                <Filter size={18}/>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">กำลังเปิดโหมดวิเคราะห์เฉพาะเจาะจง</span>
                <h4 className="font-black text-sm text-slate-800">
                  {getSpecificSelectionTitle()}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={handleTriggerPrint}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm active:scale-95"
              >
                <Printer size={15}/> พิมพ์รายงานเฉพาะเรื่อง/ชุดนี้
              </button>
              <button 
                onClick={() => { setSelectedTopic('ALL'); setSelectedAssignmentId('ALL'); setSelectedCategory('ALL'); }}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1 transition"
                title="ล้างการเจาะจง"
              >
                <RotateCcw size={14}/> ล้าง
              </button>
            </div>
          </div>
        )}
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
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อสอบที่วิเคราะห์</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><Sparkles size={20}/></div>
          </div>
          <div className="text-3xl font-black text-purple-600 truncate mt-1">
            {itemAnalysisData.all.length} <span className="text-xs font-bold text-slate-400">ข้อ</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2 truncate">
            {selectedTopic !== 'ALL' ? `เฉพาะเรื่อง ${selectedTopic}` : selectedAssignmentId !== 'ALL' ? 'เฉพาะชุดข้อสอบที่เลือก' : 'ทุกข้อสอบ'}
          </p>
        </div>
      </div>

      {/* 🧭 Sub Navigation Tabs inside Analytics */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button 
          onClick={() => setActiveTab('INDIVIDUAL_STUDENT')}
          className={`px-6 py-4 font-black text-sm transition-all border-b-4 whitespace-nowrap flex items-center gap-2 ${activeTab === 'INDIVIDUAL_STUDENT' ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <GraduationCap size={18}/> 🎓 วิเคราะห์นักเรียนรายบุคคล (กลางภาค / ปลายภาค)
        </button>
        <button 
          onClick={() => setActiveTab('ANALYTICS')}
          className={`px-6 py-4 font-black text-sm transition-all border-b-4 whitespace-nowrap flex items-center gap-2 ${activeTab === 'ANALYTICS' ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <BarChart3 size={18}/> 📊 วิเคราะห์คุณภาพข้อสอบรายข้อ (Item Analysis)
        </button>
        <button 
          onClick={() => setActiveTab('SCORES')}
          className={`px-6 py-4 font-black text-sm transition-all border-b-4 whitespace-nowrap flex items-center gap-2 ${activeTab === 'SCORES' ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-2xl shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <FileText size={18}/> 📋 ตารางรวมคะแนนสอบทั้งหมด
        </button>
      </div>

      {activeTab === 'INDIVIDUAL_STUDENT' ? (
        <div className="space-y-8 animate-fade-in">
          {/* 🎯 Sub-Tab Switcher: MIDTERM vs FINAL */}
          <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                  <Award className="text-amber-500"/>
                  รายงานสรุปผลการสอบกลางภาคและปลายภาครายบุคคล
                </h4>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  เลือกสลับประเภทการสอบเพื่อดูคะแนนรายวิชา ระดับเกณฑ์ประเมิน และรายชื่อนักเรียนที่ต้องได้รับการพัฒนา
                </p>
              </div>

              {/* Toggle Buttons: Midterm vs Final */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-stretch sm:self-auto">
                <button
                  onClick={() => setIndividualSubTab('MIDTERM')}
                  className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${individualSubTab === 'MIDTERM' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  📝 คะแนนสอบกลางภาค (Midterm)
                </button>
                <button
                  onClick={() => setIndividualSubTab('FINAL')}
                  className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${individualSubTab === 'FINAL' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🏆 คะแนนสอบปลายภาค (Final)
                </button>
              </div>
            </div>
          </div>

          {/* 🚨 ALERT & INTERVENTION CARD: รายชื่อนักเรียนที่ควรได้รับการพัฒนาและติวซ่อมเสริม */}
          <div className="bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-8 rounded-[40px] border-2 border-rose-200 shadow-sm space-y-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-rose-200/60 pb-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200 animate-pulse">
                  <AlertCircle size={28}/>
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
                    <Sparkles size={12}/> ระบบช่วยคัดกรองการซ่อมเสริม (Intervention Alert)
                  </div>
                  <h4 className="font-black text-2xl text-slate-900">
                    รายชื่อนักเรียนที่ควรได้รับการพัฒนาและส่งเสริมในการจัดการเรียนการสอน
                  </h4>
                  <p className="text-xs font-bold text-slate-600 mt-1">
                    ({individualSubTab === 'MIDTERM' ? 'การสอบกลางภาค' : 'การสอบปลายภาค'}) — สำหรับคุณครูนำไปวางแผนปรับปรุงการเรียนการสอนและจัดกิจกรรมติวซ่อมเสริมรายบุคคล
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-5 py-2.5 bg-white/90 backdrop-blur rounded-2xl border border-rose-200 text-center shadow-sm">
                  <div className="text-2xl font-black text-rose-600">
                    {individualStudentAnalysis.interventionList.length} <span className="text-xs font-bold text-slate-500">คน</span>
                  </div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">ต้องติวซ่อมเสริม</div>
                </div>
                <button
                  onClick={handleTriggerPrint}
                  className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-200 transition active:scale-95"
                >
                  <Printer size={16}/> พิมพ์รายงานซ่อมเสริม
                </button>
              </div>
            </div>

            {/* List of Intervention Students */}
            {individualStudentAnalysis.interventionList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {individualStudentAnalysis.interventionList.map((st, idx) => (
                  <div key={st.studentId || idx} className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm space-y-3 relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center font-black text-base shrink-0">
                          {st.student?.avatar || '👤'}
                        </div>
                        <div>
                          <h5 className="font-black text-slate-900 text-sm leading-snug">{st.studentName}</h5>
                          <p className="text-[10px] font-bold text-slate-400">ชั้น/ห้อง: {st.classroom} • ID: {st.studentId}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-black text-[10px] rounded-full shrink-0 border border-rose-200">
                        {st.avgPct}%
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <div className="text-[11px] font-black text-slate-700 flex items-center justify-between">
                        <span>วิชาที่ควรติวซ่อมเสริม:</span>
                        <span className="text-rose-600 font-black">{st.weakSubjects.length} วิชา</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {st.weakSubjects.map((sub, i) => {
                          const subData = st.subjectScores[sub];
                          return (
                            <span key={i} className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-black rounded-lg border border-rose-200 flex items-center gap-1">
                              ❌ {sub}: {subData ? `${subData.score}/${subData.total} (${subData.pct}%)` : 'ต่ำกว่าเกณฑ์'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[10px] font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
                      💡 <strong>ข้อแนะนำคุณครู:</strong> จัดกิจกรรมสอนซ่อมเสริมมโนทัศน์เบื้องต้นในวิชาที่ได้คะแนนน้อย และติดตามทบทวนโจทย์เป็นรายบุคคลก่อนการสอบครั้งต่อไป
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-white/80 rounded-3xl text-center border border-emerald-200 space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500"/>
                <h5 className="font-black text-slate-800 text-base">ไม่มีนักเรียนที่ต้องติวซ่อมเสริมเร่งด่วน</h5>
                <p className="text-xs font-bold text-slate-500">นักเรียนทุกคนที่เข้าสอบ ({individualSubTab === 'MIDTERM' ? 'กลางภาค' : 'ปลายภาค'}) ผ่านเกณฑ์ประเมินเบื้องต้นตามเป้าหมาย</p>
              </div>
            )}
          </div>

          {/* 📊 ALL INDIVIDUAL STUDENTS CARDS & MATRIX */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                  <Users className="text-indigo-600"/>
                  วิเคราะห์ผลคะแนนสอบรายบุคคล ({individualSubTab === 'MIDTERM' ? 'กลางภาค' : 'ปลายภาค'})
                </h4>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  แสดงคะแนนแยกตามรายวิชา สรุปภาพรวมคะแนนเฉลี่ย และผลการประเมินระดับเกณฑ์การสอบ
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">
                  จำนวนนักเรียนที่วิเคราะห์: {individualStudentAnalysis.totalAnalyzed} คน
                </span>
              </div>
            </div>

            {/* Individual Student Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {individualStudentAnalysis.allStudents.map((st, idx) => {
                const subNames = Object.keys(st.subjectScores);
                return (
                  <div key={st.studentId || idx} className="p-6 rounded-[30px] border-2 border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all shadow-sm space-y-5">
                    {/* Header: Student Info & Overall Grade */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-inner">
                          {st.student?.avatar || '🎓'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-slate-900 text-base">{st.studentName}</h5>
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-100">
                              ห้อง {st.classroom}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">รหัสนักเรียน: {st.studentId}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end">
                        <span className={`px-3.5 py-1.5 rounded-full text-xs font-black border shadow-sm ${st.evaluationGrade.badgeBg}`}>
                          {st.evaluationGrade.icon} {st.evaluationGrade.label}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          เฉลี่ยรวม {st.avgPct}% ({st.totalScore}/{st.totalPossible} คะแนน)
                        </p>
                      </div>
                    </div>

                    {/* Subject Scores Display (e.g. คณิตศาสตร์ 6, ภาษาไทย 7, ภาษาอังกฤษ 8) */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        📚 รายละเอียดคะแนนแต่ละรายวิชา
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {subNames.map((sub, i) => {
                          const item = st.subjectScores[sub];
                          return (
                            <div key={i} className={`p-3.5 rounded-2xl border transition-all space-y-2 ${item.isPass ? 'bg-white border-slate-200' : 'bg-rose-50/60 border-rose-200'}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-black text-xs text-slate-800">{sub}</div>
                                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    คะแนนเต็ม {item.total} ข้อ
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-black text-sm ${item.isPass ? 'text-indigo-600' : 'text-rose-600'}`}>
                                    {item.score} / {item.total}
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${item.pct >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {item.pct}% ({item.pct >= 50 ? 'ผ่าน' : 'เดิมไม่ผ่าน'})
                                  </span>
                                  {item.retakeScore !== undefined && (
                                    <div className="mt-1">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${item.isRetakePassed ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-amber-100 text-amber-800'}`}>
                                        แก้ตัว: {item.retakeScore}/{item.retakeTotal} ({item.retakePct}%) {item.isRetakePassed ? '✓ ผ่าน' : 'ไม่ผ่าน'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-slate-500">
                                  สอบแก้ตัว: {item.retakeAllowed ? <span className="text-emerald-600 font-black">🔓 เปิดสิทธิ์แล้ว</span> : <span className="text-slate-400 font-bold">🔒 ปิดอยู่</span>}
                                </span>
                                {item.resultObj && (
                                  <button
                                    onClick={() => handleToggleRetake(item.resultObj!, !item.retakeAllowed)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition active:scale-95 shadow flex items-center gap-1 ${item.retakeAllowed ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                  >
                                    {item.retakeAllowed ? '🔒 ปิดสอบแก้ตัว' : '🔓 เปิดให้สอบแก้ตัว'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {subNames.length === 0 && (
                          <div className="col-span-2 text-center p-4 text-xs font-bold text-slate-400 italic">
                            ยังไม่มีข้อมูลคะแนนสอบในหมวดหมู่นี้
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Evaluation Note */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-slate-700">
                        <span>หลอดประเมินศักยภาพรวม:</span>
                        <span className={st.evaluationGrade.color}>{st.avgPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${st.avgPct >= 80 ? 'bg-emerald-500' : st.avgPct >= 70 ? 'bg-teal-500' : st.avgPct >= 60 ? 'bg-blue-500' : st.avgPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${st.avgPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 pt-1">
                        📌 <strong>สรุปภาพรวม:</strong> {st.evaluationGrade.desc}
                      </p>
                    </div>
                  </div>
                );
              })}

              {individualStudentAnalysis.allStudents.length === 0 && (
                <div className="col-span-2 py-16 text-center text-slate-300 font-black italic">
                  ไม่พบข้อมูลผลสอบกลางภาค/ปลายภาครายบุคคลตามเงื่อนไขที่เลือก
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'ANALYTICS' ? (
        <div className="space-y-8">
          {/* 📊 ความแม่นยำรายหน่วยการเรียนรู้/หัวข้อ & Interactive Topic Selection */}
          {topicStats.length > 0 && (
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <BarChart3 className="text-indigo-500"/> สรุปสถิติผลสัมฤทธิ์แยกตามหน่วยการเรียนรู้ / เรื่อง (%)
                  </h4>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    คลิกปุ่ม "เจาะจงเรื่องนี้" เพื่อกรองดูผลการสอบและพิมพ์รายงานเฉพาะหน่วยการเรียนรู้นั้น
                  </p>
                </div>
              </div>

              {/* Topic Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topicStats.map((t, idx) => {
                  const isSelected = selectedTopic === t.name;
                  return (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-3xl border-2 transition-all space-y-3 ${isSelected ? 'bg-indigo-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-300' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-slate-800 line-clamp-2">{t.name}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${t.accuracy >= 70 ? 'bg-emerald-100 text-emerald-800' : t.accuracy >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                          {t.accuracy}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${t.accuracy >= 70 ? 'bg-emerald-500' : t.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${t.accuracy}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-1">
                        <span>ตอบถูก {t.correct} จาก {t.total} ข้อคำตอบ</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                        <button 
                          onClick={() => setSelectedTopic(t.name)}
                          className={`flex-1 py-1.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1 ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200'}`}
                        >
                          {isSelected ? '✓ กำลังดูเรื่องนี้' : '🎯 เจาะจงดูเรื่องนี้'}
                        </button>
                        <button 
                          onClick={() => handlePrintSpecificTopic(t.name)}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition"
                          title="พิมพ์รายงานเฉพาะเรื่องนี้"
                        >
                          <Printer size={15}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 1️⃣ ข้อสอบที่ทำผิดเยอะที่สุด & ทำถูกเยอะที่สุด */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ❌ 1. ข้อสอบที่นักเรียนทำผิดเยอะที่สุด */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <AlertCircle className="text-rose-500" size={24}/> 1. ข้อสอบที่นักเรียนทำผิดเยอะที่สุด
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 ml-9">เพื่อนำไปปรับปรุงการจัดการเรียนการสอน</p>
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
                          ลำดับที่ {idx + 1} (ตอบผิดมากสุด)
                        </span>
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black border ${q.difficulty.color}`}>
                          {q.difficulty.icon} ความยาก: {q.difficulty.level}
                        </span>
                      </div>

                      <p className="font-bold text-slate-800 text-sm leading-snug mb-2">{q.text}</p>
                      <p className="text-[10px] font-bold text-indigo-500 mb-3">📌 หน่วยการเรียนรู้: {q.unit}</p>

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

                      <p className="text-[11px] font-bold text-slate-600 italic bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 leading-relaxed">
                        💡 ข้อเสนอแนะเพื่อปรับการสอน: {q.difficulty.recommendation}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-300 italic font-black">ไม่พบข้อมูลข้อสอบในเงื่อนไขนี้</div>
                )}
              </div>
            </div>

            {/* ✅ 2. ข้อสอบที่นักเรียนทำถูกเยอะที่สุด */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" size={24}/> 2. ข้อสอบที่นักเรียนทำถูกเยอะที่สุด
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 ml-9">ข้อสอบที่นักเรียนเข้าใจบทเรียนได้เป็นอย่างดี</p>
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

                      <p className="font-bold text-slate-800 text-sm leading-snug mb-2">{q.text}</p>
                      <p className="text-[10px] font-bold text-indigo-500 mb-3">📌 หน่วยการเรียนรู้: {q.unit}</p>

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

                      <p className="text-[11px] font-bold text-slate-600 italic bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/60 leading-relaxed">
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

          {/* 📚 Detailed Item Analysis Table */}
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                  <BookOpen className="text-indigo-500"/> ตารางจำแนกระดับความยากง่ายของข้อสอบ (Facility Index p)
                </h4>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  {selectedTopic !== 'ALL' ? `แสดงเฉพาะข้อสอบในหน่วย: "${selectedTopic}"` : 'แสดงข้อสอบทั้งหมดในเงื่อนไขการค้นหา'}
                </p>
              </div>
              <button onClick={handleTriggerPrint} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 transition shadow-md">
                <Printer size={16}/> พิมพ์ตารางวิเคราะห์
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-slate-400 font-black border-b uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="p-4 text-center">ข้อที่</th>
                    <th className="p-4">โจทย์ข้อสอบ / หน่วยการเรียนรู้</th>
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
                        <div className="text-[10px] text-indigo-500 font-bold mt-0.5">[{q.unit}]</div>
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
                {selectedTopic !== 'ALL' ? `แสดงคะแนนเฉพาะหน่วยการเรียนรู้: "${selectedTopic}"` : `พิจารณาตามห้องเรียนที่คุณครูสอน (${filteredStats.length} รายการผลสอบ)`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBatchToggleRetake(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition active:scale-95 flex items-center gap-1.5"
              >
                🔓 เปิดสอบแก้ตัวทั้งหมด ({filteredStats.length})
              </button>
              <button
                onClick={() => handleBatchToggleRetake(false)}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow transition active:scale-95 flex items-center gap-1.5"
              >
                🔒 ปิดสอบแก้ตัวทั้งหมด
              </button>
              <button onClick={handleTriggerPrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow">
                <Printer size={16}/> พิมพ์ใบคะแนน
              </button>
            </div>
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
                  <th className="p-4 text-center">ผลการสอบแก้ตัว</th>
                  <th className="p-4 text-center">สิทธิ์สอบแก้ตัว (คุณครูเปิด/ปิด)</th>
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
                  
                  let scoreVal = r.score;
                  let totalVal = r.totalQuestions || 1;

                  if (selectedTopic !== 'ALL') {
                    const detailsArray = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
                    if (Array.isArray(detailsArray)) {
                      let topicScore = 0;
                      let topicTotal = 0;
                      detailsArray.forEach((det: any) => {
                        const q = questions.find(q => String(q.id).trim() === String(det.questionId).trim());
                        const unitName = q?.unit || det.topic;
                        if (unitName?.trim() === selectedTopic.trim() || det.topic?.trim() === selectedTopic.trim()) {
                          topicTotal += 1;
                          if (det.isCorrect) topicScore += 1;
                        }
                      });
                      if (topicTotal > 0) {
                        scoreVal = topicScore;
                        totalVal = topicTotal;
                      }
                    }
                  }

                  const pct = Math.round((scoreVal / totalVal) * 100);

                  const detailsObj = typeof r.details === 'string' ? (() => { try { return JSON.parse(r.details); } catch(e) { return r.details; } })() : r.details;
                  const isMidtermOrFinal = cat === 'MIDTERM' || cat === 'FINAL';
                  const retakeScoreVal = detailsObj?.retakeScore;
                  const retakeTotalVal = detailsObj?.retakeTotal || totalVal;
                  const retakePct = retakeScoreVal !== undefined ? Math.round((retakeScoreVal / retakeTotalVal) * 100) : undefined;
                  const retakePass = retakePct !== undefined ? retakePct >= 50 : false;
                  const finalPass = pct >= 50 || retakePass;
                  const isRetakeAllowed = !!detailsObj?.retakeAllowed;

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
                        {selectedTopic !== 'ALL' && <div className="text-[10px] text-emerald-600 font-bold">หน่วย: {selectedTopic}</div>}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${cat === 'UNIT_TEST' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : cat === 'MIDTERM' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {cat === 'UNIT_TEST' ? 'หน่วยการเรียนรู้' : cat === 'MIDTERM' ? 'สอบกลางภาค' : 'สอบปลายภาค'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-900 text-sm">
                        {scoreVal} / {totalVal}
                      </td>
                      <td className="p-4 text-center font-black text-indigo-600 text-sm">
                        {pct}%
                      </td>
                      <td className="p-4 text-center">
                        {isMidtermOrFinal ? (
                          retakeScoreVal !== undefined ? (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${retakePass ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                              แก้ตัว: {retakeScoreVal}/{retakeTotalVal} ({retakePct}%) {retakePass ? 'ผ่าน' : 'ไม่ผ่าน'}
                            </span>
                          ) : pct < 50 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              ยังไม่สอบแก้ตัว
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-xs">-</span>
                          )
                        ) : (
                          <span className="text-slate-300 font-medium text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleRetake(r, !isRetakeAllowed)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition active:scale-95 shadow-sm flex items-center gap-1 mx-auto ${isRetakeAllowed ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                          {isRetakeAllowed ? '🔒 ปิดสอบแก้ตัว' : '🔓 เปิดให้สอบแก้ตัว'}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${finalPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {finalPass ? (retakePass ? 'ผ่าน (สอบแก้ตัว)' : 'ผ่านเกณฑ์') : 'ควรพัฒนา'}
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

      {/* 🖨️ Printable Document Modal */}
      {showPrintModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-2 sm:p-4 font-prompt animate-fade-in">
          <style>{`
            @media print {
              #root {
                display: none !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
                height: auto !important;
                min-height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                position: static !important;
              }
              .fixed.inset-0 {
                position: static !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
              }
              .print-modal-container {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
              }
              .print-modal-container * {
                max-height: none !important;
              }
              .print-scroll-container {
                display: block !important;
                position: static !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                background: white !important;
                flex: none !important;
              }
              .printable-report {
                display: block !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
              }
              thead {
                display: table-header-group !important;
              }
              tbody {
                display: table-row-group !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              table {
                page-break-inside: auto !important;
                width: 100% !important;
                border-collapse: collapse !important;
              }
              .print-signature-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm 10mm 12mm 10mm;
              }
            }
          `}</style>
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-t-8 border-indigo-600 print-modal-container my-auto relative">
            
            {/* Top Action Header Bar */}
            <div className="shrink-0 bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-4 print:hidden">
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-800">รายงานสรุปผลการวิเคราะห์คุณภาพข้อสอบและคะแนนนักเรียน</h3>
                <p className="text-xs text-slate-500 font-bold">กดปุ่ม "พิมพ์เอกสาร / บันทึก PDF" เพื่อส่งพิมพ์ออกทางเครื่องพิมพ์หรือเซฟเป็นไฟล์ PDF</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md transition"
                >
                  <Printer size={18}/> พิมพ์เอกสาร / บันทึก PDF
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition"
                  title="ปิดหน้าต่าง"
                >
                  <X size={20}/>
                </button>
              </div>
            </div>

            {/* Scrollable Printable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 custom-scrollbar print-scroll-container">
              <div className="printable-report space-y-6 text-slate-900 text-xs font-sarabun p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-slate-200/60 max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                  <h2 className="text-xl font-bold tracking-tight">แบบรายงานสรุปผลการวิเคราะห์คุณภาพข้อสอบและผลสัมฤทธิ์ทางการเรียน</h2>
                  <h3 className="text-sm font-semibold text-indigo-900">
                    โรงเรียน{teacher?.school || 'ประถมศึกษา'} • ภาคเรียนการศึกษาปัจจุบัน
                  </h3>
                  <div className="bg-slate-100 p-2 rounded-lg my-2 font-bold text-xs text-slate-800">
                    📌 {getSpecificSelectionTitle()}
                  </div>
                  <div className="flex justify-center gap-6 text-xs text-slate-700 pt-1 font-medium">
                    <span><strong>ครูผู้สอน:</strong> {teacher?.name || 'ครูผู้สอนประจำวิชา'}</span>
                    <span><strong>รายวิชา:</strong> {selectedSubject === 'ALL' ? 'ทุกรายวิชา' : selectedSubject}</span>
                    <span><strong>ระดับชั้น/ห้อง:</strong> {selectedClassroom === 'ALL' ? 'ห้องเรียนที่สอน' : selectedClassroom}</span>
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
                      <th className="border border-slate-400 p-1.5">โจทย์ข้อสอบ / หน่วยการเรียนรู้</th>
                      <th className="border border-slate-400 p-1.5 w-16">คนตอบถูก</th>
                      <th className="border border-slate-400 p-1.5 w-16">คนตอบผิด</th>
                      <th className="border border-slate-400 p-1.5 w-20">% ความถูกต้อง (p)</th>
                      <th className="border border-slate-400 p-1.5 w-24">ระดับความยากง่าย</th>
                      <th className="border border-slate-400 p-1.5">แนวทางการปรับปรุงการจัดการเรียนการสอน</th>
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
                          ไม่มีข้อมูลวิเคราะห์รายข้อในหัวข้อที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 📋 Part 3: Student Score Records Table for Academic Record / Evidence */}
              <div>
                <h4 className="font-bold text-sm mb-2 text-slate-800">ส่วนที่ 3: ตารางบันทึกผลคะแนนสอบและผลสัมฤทธิ์ทางการเรียนรายบุคคล (สำหรับเก็บหลักฐานทางการศึกษา)</h4>
                <table className="w-full border-collapse border border-slate-400 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-center">
                      <th className="border border-slate-400 p-1.5 w-10">ลำดับ</th>
                      <th className="border border-slate-400 p-1.5">นักเรียน (ชื่อ-นามสกุล / รหัส)</th>
                      <th className="border border-slate-400 p-1.5 w-20">ชั้น/ห้อง</th>
                      <th className="border border-slate-400 p-1.5">วิชา / ชุดแบบทดสอบ</th>
                      <th className="border border-slate-400 p-1.5 w-20">ประเภท</th>
                      <th className="border border-slate-400 p-1.5 w-20">คะแนนที่ได้</th>
                      <th className="border border-slate-400 p-1.5 w-16">ร้อยละ (%)</th>
                      <th className="border border-slate-400 p-1.5 w-24">ผลการสอบแก้ตัว</th>
                      <th className="border border-slate-400 p-1.5 w-20">ผลการประเมิน</th>
                      <th className="border border-slate-400 p-1.5 w-24">วันที่ทำสอบ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.map((r, idx) => {
                      const st = students.find(s => String(s.id).trim() === String(r.studentId).trim());
                      const stName = st ? st.name : (r.studentName || `นักเรียน ID: ${r.studentId}`);
                      const stRoom = st ? `${GRADE_LABELS[st.grade || ''] || st.grade}/${st.classroom}` : '-';
                      const cat = getResultCategory(r);

                      let scoreVal = r.score;
                      let totalVal = r.totalQuestions || 1;

                      if (selectedTopic !== 'ALL') {
                        const detailsArray = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
                        if (Array.isArray(detailsArray)) {
                          let topicScore = 0;
                          let topicTotal = 0;
                          detailsArray.forEach((det: any) => {
                            const q = questions.find(q => String(q.id).trim() === String(det.questionId).trim());
                            const unitName = q?.unit || det.topic;
                            if (unitName?.trim() === selectedTopic.trim() || det.topic?.trim() === selectedTopic.trim()) {
                              topicTotal += 1;
                              if (det.isCorrect) topicScore += 1;
                            }
                          });
                          if (topicTotal > 0) {
                            scoreVal = topicScore;
                            totalVal = topicTotal;
                          }
                        }
                      }

                      const pct = Math.round((scoreVal / totalVal) * 100);

                      const detailsObj = typeof r.details === 'string' ? (() => { try { return JSON.parse(r.details); } catch(e) { return r.details; } })() : r.details;
                      const isMidtermOrFinal = cat === 'MIDTERM' || cat === 'FINAL';
                      const retakeScoreVal = detailsObj?.retakeScore;
                      const retakeTotalVal = detailsObj?.retakeTotal || totalVal;
                      const retakePct = retakeScoreVal !== undefined ? Math.round((retakeScoreVal / retakeTotalVal) * 100) : undefined;
                      const retakePass = retakePct !== undefined ? retakePct >= 50 : false;
                      const finalPass = pct >= 50 || retakePass;

                      return (
                        <tr key={r.id || idx}>
                          <td className="border border-slate-400 p-1.5 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-400 p-1.5">
                            <div className="font-bold text-slate-900">{stName}</div>
                            <div className="text-[10px] text-slate-500">รหัส: {r.studentId}</div>
                          </td>
                          <td className="border border-slate-400 p-1.5 text-center font-medium">{stRoom}</td>
                          <td className="border border-slate-400 p-1.5">
                            <div className="font-medium">{r.subject}</div>
                            {selectedTopic !== 'ALL' && <div className="text-[10px] text-slate-500">หน่วย: {selectedTopic}</div>}
                          </td>
                          <td className="border border-slate-400 p-1.5 text-center text-[10px] font-bold">
                            {cat === 'UNIT_TEST' ? 'หน่วยเรียนรู้' : cat === 'MIDTERM' ? 'กลางภาค' : 'ปลายภาค'}
                          </td>
                          <td className="border border-slate-400 p-1.5 text-center font-bold">{scoreVal} / {totalVal}</td>
                          <td className="border border-slate-400 p-1.5 text-center font-bold">{pct}%</td>
                          <td className="border border-slate-400 p-1.5 text-center font-bold text-[10px]">
                            {isMidtermOrFinal ? (
                              retakeScoreVal !== undefined ? (
                                `${retakeScoreVal}/${retakeTotalVal} (${retakePct}%) ${retakePass ? 'ผ่าน' : 'ไม่ผ่าน'}`
                              ) : pct < 50 ? (
                                'ยังไม่สอบแก้ตัว'
                              ) : (
                                '-'
                              )
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="border border-slate-400 p-1.5 text-center font-bold">
                            {finalPass ? (retakePass ? 'ผ่าน (แก้ตัว)' : 'ผ่านเกณฑ์') : 'ควรพัฒนา'}
                          </td>
                          <td className="border border-slate-400 p-1.5 text-center text-[10px] text-slate-600">
                            {formatThaiDate(r.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStats.length === 0 && (
                      <tr>
                        <td colSpan={10} className="border border-slate-400 p-4 text-center italic text-slate-500">
                          ไม่มีข้อมูลผลคะแนนรายบุคคลในเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ✍️ Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs font-medium print-signature-block">
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

          {/* Bottom Action Footer Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
            <p className="text-xs text-slate-500 font-bold hidden sm:block">💡 คำแนะนำ: เลือกปลายทางเป็น "Save as PDF" หรือเลือกชื่อเครื่องพิมพ์</p>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={() => window.print()}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition"
              >
                <Printer size={18}/> พิมพ์เอกสาร / บันทึก PDF
              </button>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </div>
  );
};

export default TeacherAnalytics;
