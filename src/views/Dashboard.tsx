import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, BarChart3, Star, CheckCircle, 
  ArrowLeft, Calculator, Languages, 
  RefreshCw, Trophy, ShoppingBag, 
  Clock, School, Backpack, 
  ShieldCheck, Atom, Globe,
  Lock, Camera, Printer, Award,
  ChevronRight, FileText, CheckCircle2,
  Flame, PlayCircle
} from 'lucide-react';
import { Student, Assignment, ExamResult, SubjectConfig, Question } from '../types';
import { CREATIVE_REWARDS, GRADE_LABELS } from '../constants';
import { redeemReward, uploadAsset, manageStudent } from '../services/api';
import { supabase } from '../services/firebaseConfig';
import { PrintableOnetExamModal, ExamQuestionForPrint } from '../components/PrintableOnetExamModal';
import { DEFAULT_NATIONAL_EXAM_QUESTIONS } from '../data/nationalExamDefaults';

const safeParseDetails = (details: any): Record<string, any> => {
  if (!details) return {};
  let cur = details;
  for (let i = 0; i < 3; i++) {
    if (typeof cur === 'string') {
      try {
        const parsed = JSON.parse(cur);
        if (parsed === cur) break;
        cur = parsed;
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }
  return (cur && typeof cur === 'object' && !Array.isArray(cur)) ? cur : {};
};

interface DashboardProps {
  student: Student;
  assignments?: Assignment[]; 
  examResults?: ExamResult[]; 
  subjects?: SubjectConfig[]; 
  questions?: Question[];
  onNavigate: (page: string) => void;
  onStartAssignment?: (assignment: Assignment) => void;
  onSelectSubject?: (subject: SubjectConfig) => void;
  onRefreshSubjects?: () => void;
  onUpdateStudent?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  student, 
  assignments = [], 
  examResults = [], 
  subjects = [], 
  questions = [],
  onNavigate, 
  onStartAssignment,
  onSelectSubject,
  onRefreshSubjects,
  onUpdateStudent
}) => {
  const [view, setView] = useState<'main' | 'rewards'>('main');
  const [isUploading, setIsUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(student.avatar || '👨‍🎓');
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'pending' | 'exams' | 'completed' | 'all'>('pending');
  const [rewardCategory, setRewardCategory] = useState<string>('ALL');

  // Printable Exam Modal state
  const [printModalData, setPrintModalData] = useState<{
    title: string;
    subject: string;
    grade: string;
    questions: ExamQuestionForPrint[];
  } | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<Student[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Fetch classmates leaderboard
  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      if (!student.school) return;
      try {
        setIsLoadingLeaderboard(true);
        let query = supabase
          .from('students')
          .select('id, name, avatar, stars, level, grade, classroom')
          .eq('school', student.school)
          .order('stars', { ascending: false })
          .limit(10);
        
        if (student.grade) {
          query = query.eq('grade', student.grade);
        }
        
        const { data, error } = await query;
        if (isMounted && data && !error) {
          setLeaderboard(data as Student[]);
        }
      } catch (e) {
        console.error('Error fetching leaderboard', e);
      } finally {
        if (isMounted) setIsLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
    return () => { isMounted = false; };
  }, [student.school, student.grade, student.classroom, student.stars]);

  const handleRedeem = async (rewardId: string, cost: number) => {
    if (student.stars < cost) return alert("❌ ดาวสะสมไม่เพียงพอสำหรับการแลกรางวัลนี้ครับ");
    setIsRedeeming(rewardId);
    try {
      const res = await redeemReward(student.id, rewardId, cost);
      if (res && res.success) {
        alert("🎉 แลกของรางวัลสำเร็จแล้วจ้า! ตรวจสอบไอเทมได้ในกล่องสมบัติเลย");
        if (onUpdateStudent) onUpdateStudent();
      } else {
        alert("❌ เกิดข้อผิดพลาดในการแลกรางวัล กรุณาลองใหม่อีกครั้งครับ");
      }
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsRedeeming(null);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) return alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
    if (file.size > 2 * 1024 * 1024) return alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB");

    setIsUploading(true);
    try {
        const url = await uploadAsset(file, 'student_avatars');
        if (url) {
            const res = await manageStudent({ 
                action: 'edit', 
                id: student.id, 
                avatar: url, 
                name: student.name, 
                grade: student.grade, 
                classroom: student.classroom 
            });
            if (res.success) {
                setCurrentAvatar(url);
                if (onUpdateStudent) onUpdateStudent();
                alert("✅ เปลี่ยนรูปโปรไฟล์สำเร็จ");
            }
        }
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
        setIsUploading(false);
    }
  };

  const isAvatarUrl = currentAvatar.startsWith('http');

  const SUBJECT_THEMES: Record<string, { gradient: string, slogan: string, icon: React.ReactNode, color: string }> = {
      'คณิตศาสตร์': { gradient: 'from-rose-500 via-red-600 to-orange-600', slogan: 'พิชิตตัวเลข สนุกกับการคำนวณ', icon: <Calculator size={18}/>, color: '#ef4444' },
      'วิทยาศาสตร์': { gradient: 'from-emerald-400 via-teal-600 to-cyan-700', slogan: 'ไขความลับธรรมชาติและการทดลอง', icon: <Atom size={18}/>, color: '#10b981' },
      'ภาษาไทย': { gradient: 'from-amber-400 via-orange-500 to-yellow-600', slogan: 'รักษ์ภาษาไทย ใช้ให้ถูกต้อง', icon: <BookOpen size={18}/>, color: '#f59e0b' },
      'ภาษาอังกฤษ': { gradient: 'from-blue-500 via-indigo-600 to-violet-700', slogan: 'เก่งภาษาอังกฤษ สื่อสารได้ทั่วโลก', icon: <Languages size={18}/>, color: '#3b82f6' },
      'สังคมศึกษา': { gradient: 'from-purple-500 via-violet-600 to-fuchsia-700', slogan: 'เข้าใจโลกและสังคมที่เราอยู่', icon: <Globe size={18}/>, color: '#8b5cf6' },
  };

  const EXAM_LIST: Record<string, Array<{ name: string; color: string; icon: React.ReactNode; desc: string }>> = {
      // ระดับชั้นประถมศึกษาปีที่ 3: เฉพาะข้อสอบ RT (Reading Test) และ NT
      'P3': [
          { name: 'RT การอ่านรู้เรื่อง', color: 'bg-teal-600', icon: <BookOpen size={20}/>, desc: 'การประเมินความสามารถในการอ่านรู้เรื่อง (Reading Test)' },
          { name: 'RT การอ่านออกเสียง', color: 'bg-emerald-600', icon: <Languages size={20}/>, desc: 'การประเมินทักษะการอ่านออกเสียงคำและข้อความ' },
          { name: 'NT ภาษาไทย', color: 'bg-amber-500', icon: <BookOpen size={20}/>, desc: 'การประเมินคุณภาพผู้เรียนด้านภาษาไทย' },
          { name: 'NT คณิตศาสตร์', color: 'bg-indigo-600', icon: <Calculator size={20}/>, desc: 'การประเมินคุณภาพผู้เรียนด้านการคิดคำนวณ' }
      ],
      // ระดับชั้นประถมศึกษาปีที่ 6: เฉพาะข้อสอบ O-NET ป.6
      'P6': [
          { name: 'O-NET ภาษาไทย', color: 'bg-amber-500', icon: <BookOpen size={20}/>, desc: 'การอ่าน คิดวิเคราะห์ และหลักภาษาไทย' },
          { name: 'O-NET คณิตศาสตร์', color: 'bg-rose-600', icon: <Calculator size={20}/>, desc: 'การแก้โจทย์ปัญหาและคำนวณ' },
          { name: 'O-NET วิทยาศาสตร์', color: 'bg-emerald-600', icon: <Atom size={20}/>, desc: 'กระบวนการทางวิทยาศาสตร์และการทดลอง' },
          { name: 'O-NET ภาษาอังกฤษ', color: 'bg-sky-500', icon: <Languages size={20}/>, desc: 'คำศัพท์ ไวยากรณ์ และการสื่อสาร' }
      ],
      // ระดับชั้นมัธยมศึกษาปีที่ 3: เฉพาะข้อสอบ O-NET ม.3
      'M3': [
          { name: 'O-NET ภาษาไทย', color: 'bg-amber-500', icon: <BookOpen size={20}/>, desc: 'วรรณคดีและหลักภาษาไทย ม.3' },
          { name: 'O-NET คณิตศาสตร์', color: 'bg-rose-600', icon: <Calculator size={20}/>, desc: 'เรขาคณิต พีชคณิต สถิติและความน่าจะเป็น' },
          { name: 'O-NET วิทยาศาสตร์', color: 'bg-emerald-600', icon: <Atom size={20}/>, desc: 'ฟิสิกส์ เคมี ชีววิทยา และดาราศาสตร์' },
          { name: 'O-NET ภาษาอังกฤษ', color: 'bg-sky-500', icon: <Languages size={20}/>, desc: 'Reading Comprehension & Grammar' }
      ]
  };

  const studentResults = useMemo(() => {
    const currentStudentId = String(student.id).trim();
    return examResults.filter(r => String(r.studentId || (r as any).student_id).trim() === currentStudentId);
  }, [examResults, student.id]);

  const doneAssignmentIds = useMemo(() => {
    return new Set(
      studentResults
        .filter(r => r.assignmentId && r.assignmentId !== '-' && r.assignmentId !== '')
        .map(r => String(r.assignmentId).trim())
    );
  }, [studentResults]);

  const retakeAssignments = useMemo(() => {
    const currentStudentId = String(student.id).trim();
    const currentStudentSchool = String(student.school || '').toLowerCase().trim();
    const currentStudentGrade = String(student.grade || '').trim();
    const currentStudentRoom = String(student.classroom || '').trim();

    const retakeMap = new Map<string, { assignment: Assignment; initialScore: number; initialTotal: number; initialPct: number; retakeScore?: number; retakeTotal?: number; retakePct?: number; isRetakePassed?: boolean }>();

    studentResults.forEach(res => {
      const asgId = String(res.assignmentId || (res as any).assignment_id || '').trim();
      if (!asgId) return;
      const ass = assignments.find(a => String(a.id).trim() === asgId);
      if (!ass) return;

      if (ass.school && currentStudentSchool && String(ass.school).toLowerCase().trim() !== currentStudentSchool) return;
      if (ass.grade && ass.grade !== 'ALL' && String(ass.grade).trim() !== currentStudentGrade) return;

      const targetedRooms = ass.targetClassrooms || [];
      if (targetedRooms.length > 0 && currentStudentRoom && !targetedRooms.includes(currentStudentRoom)) return;

      const cat = ass.category || res.category;
      const isMidtermOrFinal = cat === 'MIDTERM' || cat === 'FINAL' || (ass.title && (ass.title.includes('กลางภาค') || ass.title.includes('ปลายภาค')));
      if (!isMidtermOrFinal) return;

      const isRetakeAllowed = examResults.some(er => 
        String(er.studentId || (er as any).student_id).trim() === currentStudentId &&
        String(er.assignmentId || (er as any).assignment_id).trim() === asgId &&
        !!safeParseDetails(er.details)?.retakeAllowed
      );

      if (!isRetakeAllowed) return;

      const totalQ = res.totalQuestions || 1;
      const initialPct = Math.round((res.score / totalQ) * 100);

      const detailsObj = safeParseDetails(res.details);
      const retakeScoreVal = detailsObj?.retakeScore;
      const retakeTotalVal = detailsObj?.retakeTotal || totalQ;
      const retakePct = retakeScoreVal !== undefined ? Math.round((retakeScoreVal / retakeTotalVal) * 100) : undefined;
      const isRetakePassed = retakePct !== undefined ? retakePct >= 50 : false;

      if (!retakeMap.has(asgId)) {
        retakeMap.set(asgId, {
          assignment: ass,
          initialScore: res.score,
          initialTotal: totalQ,
          initialPct,
          retakeScore: retakeScoreVal,
          retakeTotal: retakeTotalVal,
          retakePct,
          isRetakePassed
        });
      } else {
        const existing = retakeMap.get(asgId)!;
        if (res.score > existing.initialScore || (retakeScoreVal !== undefined && existing.retakeScore === undefined)) {
          retakeMap.set(asgId, {
            assignment: ass,
            initialScore: Math.max(res.score, existing.initialScore),
            initialTotal: totalQ,
            initialPct: Math.max(initialPct, existing.initialPct),
            retakeScore: retakeScoreVal ?? existing.retakeScore,
            retakeTotal: retakeTotalVal ?? existing.retakeTotal,
            retakePct: retakePct ?? existing.retakePct,
            isRetakePassed: isRetakePassed || existing.isRetakePassed
          });
        }
      }
    });

    return Array.from(retakeMap.values());
  }, [studentResults, assignments, student.id, student.school, student.grade, student.classroom, examResults]);

  // All assignments targeted to this student
  const myAllAssignments = useMemo(() => {
    const currentStudentSchool = String(student.school || '').toLowerCase().trim();
    const currentStudentGrade = String(student.grade || '').trim();
    const currentStudentRoom = String(student.classroom || '').trim();

    return assignments.filter(a => {
        const isMySchool = !a.school || String(a.school).toLowerCase().trim() === currentStudentSchool;
        const isMyGrade = !a.grade || a.grade === 'ALL' || a.grade === currentStudentGrade;
        const targetedRooms = a.targetClassrooms || [];
        const isMyRoom = targetedRooms.length === 0 || (currentStudentRoom && targetedRooms.includes(currentStudentRoom));

        return isMySchool && isMyGrade && isMyRoom;
    });
  }, [assignments, student]);

  // Unfinished (pending) assignments
  const unfinishedAssignments = useMemo(() => {
    return myAllAssignments.filter(a => !doneAssignmentIds.has(String(a.id).trim()));
  }, [myAllAssignments, doneAssignmentIds]);

  // Completed assignments
  const completedAssignments = useMemo(() => {
    return myAllAssignments.filter(a => doneAssignmentIds.has(String(a.id).trim()));
  }, [myAllAssignments, doneAssignmentIds]);

  // Exams only
  const examAssignments = useMemo(() => {
    return myAllAssignments.filter(a => 
      a.category === 'EXAM' || 
      a.category === 'MIDTERM' || 
      a.category === 'FINAL' || 
      a.category === 'ONET' || 
      a.category === 'NT' ||
      a.category === 'RT' ||
      (a.title && (a.title.includes('สอบ') || a.title.includes('O-NET') || a.title.includes('NT') || a.title.includes('RT')))
    );
  }, [myAllAssignments]);

  const displayedAssignments = useMemo(() => {
    if (assignmentFilter === 'pending') return unfinishedAssignments;
    if (assignmentFilter === 'completed') return completedAssignments;
    if (assignmentFilter === 'exams') return examAssignments;
    return myAllAssignments;
  }, [assignmentFilter, unfinishedAssignments, completedAssignments, examAssignments, myAllAssignments]);

  const getSubjectAverage = (subjectName: string) => {
      const currentStudentId = String(student.id).trim();
      const relevant = examResults.filter(r => (r.subject === subjectName || r.subject.includes(subjectName)) && String(r.studentId).trim() === currentStudentId);
      if (relevant.length === 0) return 0;
      return Math.round(relevant.reduce((sum, r) => sum + ((r.score / (r.totalQuestions || 1)) * 100), 0) / relevant.length);
  };

  const mySubjects = useMemo(() => {
      const filteredSubjects = subjects.filter(s => {
          const schoolMatch = !s.school || String(s.school).toLowerCase().trim() === String(student.school || '').toLowerCase().trim();
          const gradeMatch = !s.grade || s.grade === 'ALL' || s.grade === student.grade;
          return schoolMatch && gradeMatch;
      });

      const existingNames = new Set(filteredSubjects.map(s => String(s.name || '').trim().toLowerCase()));
      const discoveredSubjects: SubjectConfig[] = [];
      const cleanSchool = String(student.school || '').toLowerCase().trim();
      const cleanGrade = String(student.grade || '').toLowerCase().trim();

      const uniqueSubjectNames = new Set<string>();
      questions.forEach(q => {
          if (q.subject && !q.subject.startsWith('NT') && !q.subject.startsWith('O-NET') && !q.subject.startsWith('RT')) {
              const qSchool = String(q.school || '').toLowerCase().trim();
              const qGrade = String(q.grade || '').toLowerCase().trim();
              if ((!qSchool || qSchool === cleanSchool) && (qGrade === cleanGrade || qGrade === 'all' || !qGrade)) {
                  uniqueSubjectNames.add(q.subject.trim());
              }
          }
      });

      let discoveredIdCounter = 1000;
      uniqueSubjectNames.forEach(subName => {
          const subNameLower = subName.toLowerCase();
          if (!existingNames.has(subNameLower)) {
              discoveredSubjects.push({
                  id: `discovered_${discoveredIdCounter++}`,
                  name: subName,
                  school: student.school || '',
                  teacherId: 'SYSTEM_DISCOVERED',
                  grade: student.grade || '',
                  icon: 'Book',
                  color: 'bg-indigo-50 border-indigo-200 text-indigo-600'
              });
              existingNames.add(subNameLower);
          }
      });

      return [...filteredSubjects, ...discoveredSubjects];
  }, [subjects, questions, student]);

  const hasFreeQuestions = (subjectName: string) => {
    if (DEFAULT_NATIONAL_EXAM_QUESTIONS[subjectName] || Object.keys(DEFAULT_NATIONAL_EXAM_QUESTIONS).some(k => k.includes(subjectName) || subjectName.includes(k))) {
      return true;
    }
    return questions.some(q => {
      const subNameClean = String(subjectName || '').trim().toLowerCase();
      const cleanSubName = subNameClean.replace('rt ', '').replace('nt ', '').replace('o-net ', '').replace('onet ', '').trim();
      const qSubjectClean = String(q.subject || '').trim().toLowerCase();
      
      const nameMatch = qSubjectClean === subNameClean || 
                       qSubjectClean === cleanSubName || 
                       subNameClean.includes(qSubjectClean) || 
                       (cleanSubName.length > 2 && qSubjectClean.includes(cleanSubName));
                       
      const qGradeClean = String(q.grade || '').trim().toUpperCase();
      const stuGradeClean = String(student.grade || '').trim().toUpperCase();
      const gradeMatch = qGradeClean === stuGradeClean || qGradeClean === 'ALL' || !qGradeClean;
      
      return nameMatch && gradeMatch;
    });
  };

  const getUnlockedSetsCount = (subjectName: string) => {
      return assignments.filter(a => 
        (a.category === 'ONET' || a.category === 'NT' || a.category === 'RT' || (a.title && (a.title.includes('O-NET') || a.title.includes('NT') || a.title.includes('RT')))) && 
        (a.subject === subjectName || (a.title && a.title.includes(subjectName))) && 
        doneAssignmentIds.has(String(a.id).trim())
      ).length;
  };

  // Function to open Printable Modal for an exam
  const handleOpenPrintModal = (examName: string) => {
    const cleanName = examName.toLowerCase().replace(/\(.*?\)/g, '').trim();
    const baseName = cleanName.replace('o-net', '').replace('nt', '').replace('rt', '').replace('onet', '').trim();
    
    // Find matching questions
    let matched = questions.filter(q => {
      const qSub = (q.subject || '').toLowerCase().trim();
      const qGrade = (q.grade || '').toUpperCase().trim();
      const stuGrade = (student.grade || '').toUpperCase().trim();
      const gradeOk = qGrade === stuGrade || qGrade === 'ALL' || !q.grade;
      const nameOk = qSub.includes(cleanName) || cleanName.includes(qSub) || (baseName.length > 2 && (qSub.includes(baseName) || baseName.includes(qSub)));
      return gradeOk && nameOk;
    });

    // Fallback to default authentic standard questions
    if (matched.length === 0) {
      const defaults = DEFAULT_NATIONAL_EXAM_QUESTIONS[examName] || 
                       Object.entries(DEFAULT_NATIONAL_EXAM_QUESTIONS).find(([k]) => k.includes(examName) || examName.includes(k))?.[1];
      if (defaults && defaults.length > 0) {
        matched = defaults;
      }
    }

    if (matched.length === 0) {
      alert(`ยังไม่มีชุดข้อสอบสำหรับ ${examName} ในระบบครับ คุณครูกำลังจัดเตรียมข้อสอบให้นะครับ`);
      return;
    }

    const printQuestions: ExamQuestionForPrint[] = matched.map((q, idx) => {
      const choices = q.choices || [];
      return {
        id: q.id || idx + 1,
        text: q.text,
        c1: choices[0]?.text || '',
        c2: choices[1]?.text || '',
        c3: choices[2]?.text || '',
        c4: choices[3]?.text || '',
        choices: choices.map((c, i) => ({ id: c.id || String(i + 1), text: c.text })),
        correctChoiceId: q.correctChoiceId,
        correct: q.correctChoiceId,
        explanation: q.explanation,
        image: q.image,
        unit: q.unit
      };
    });

    setPrintModalData({
      title: `แบบทดสอบเตรียมความพร้อม ${examName}`,
      subject: examName,
      grade: student.grade ? (GRADE_LABELS[student.grade] || student.grade) : 'ประถมศึกษา',
      questions: printQuestions
    });
  };

  // Overall Mastery %
  const overallMastery = useMemo(() => {
    if (studentResults.length === 0) return 0;
    const totalScore = studentResults.reduce((sum, r) => sum + r.score, 0);
    const totalQuestions = studentResults.reduce((sum, r) => sum + (r.totalQuestions || 1), 0);
    return Math.round((totalScore / totalQuestions) * 100);
  }, [studentResults]);

  // Recent 4 submissions
  const recentSubmissions = useMemo(() => {
    return [...studentResults].sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
  }, [studentResults]);

  // Calculate Level and XP
  const level = student.level || Math.floor((student.stars || 0) / 20) + 1;
  const currentXP = (student.stars || 0) % 20;
  const xpPercentage = Math.min(100, Math.round((currentXP / 20) * 100));

  // Current student rank in classroom
  const myRank = useMemo(() => {
    const index = leaderboard.findIndex(s => String(s.id).trim() === String(student.id).trim());
    return index >= 0 ? index + 1 : null;
  }, [leaderboard, student.id]);

  // แสดงเฉพาะระดับชั้นที่กำหนด: RT & NT ป.3, O-NET ป.6 และ O-NET ม.3 (ระดับชั้นอื่นจะไม่แสดงส่วนนี้)
  const exams = (student.grade && EXAM_LIST[student.grade]) ? EXAM_LIST[student.grade] : [];

  // Rewards View
  if (view === 'rewards') {
      const filteredRewards = rewardCategory === 'ALL' 
        ? CREATIVE_REWARDS 
        : CREATIVE_REWARDS.filter(r => r.category === rewardCategory);

      return (
          <div className="space-y-4 pb-20 animate-fade-in font-prompt">
              <button 
                onClick={() => setView('main')} 
                className="text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 mb-2 font-black transition-colors px-2 py-1 rounded-xl hover:bg-slate-100 w-fit"
              >
                  <ArrowLeft size={18} /> กลับหน้าหลักแดชบอร์ด
              </button>
              
              <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 p-6 sm:p-8 rounded-[35px] text-white shadow-xl relative overflow-hidden text-center border-b-8 border-black/10">
                  <div className="absolute top-0 right-0 opacity-10 transform translate-x-5 -translate-y-5">
                    <ShoppingBag size={140} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black mb-1">คลังสมบัติคนเก่ง PST 🎁</h2>
                  <p className="text-amber-100 text-xs sm:text-sm font-bold max-w-md mx-auto">
                    สะสมดาวจากการทำแบบฝึกหัดและการสอบให้ได้คะแนนดี แล้วนำมาแลกไอเทมสุดพิเศษกันเลย!
                  </p>
                  
                  <div className="flex items-center gap-2 bg-white text-orange-600 px-5 py-2 rounded-full font-black shadow-lg mt-4 w-fit mx-auto transform hover:scale-105 transition border-2 border-orange-200">
                      <Star className="fill-orange-500 text-orange-500" size={20}/>
                      <span className="text-xl">{student.stars}</span>
                      <span className="text-xs text-orange-400 uppercase tracking-widest font-black">ดาวสะสม</span>
                  </div>
              </div>

              {/* Reward Category Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 px-1 no-scrollbar">
                {[
                  { id: 'ALL', label: 'ทั้งหมด' },
                  { id: 'Stationery', label: '✏️ เครื่องเขียน' },
                  { id: 'Lifestyle', label: '🧸 ของสะสม' },
                  { id: 'Gadget', label: '📱 อุปกรณ์ล้ำสมัย' },
                  { id: 'Vehicle', label: '🚀 ยานพาหนะ' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRewardCategory(tab.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
                      rewardCategory === tab.id
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {filteredRewards.map(reward => {
                      const isOwned = student.inventory?.includes(reward.id);
                      return (
                          <div 
                            key={reward.id} 
                            className={`bg-white p-4 sm:p-5 rounded-[28px] border-2 transition-all group flex flex-col justify-between ${
                              isOwned 
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
                                : 'border-slate-100 hover:border-orange-400 hover:shadow-lg'
                            }`}
                          >
                              <div className="flex flex-col items-center text-center">
                                  <div className="text-5xl sm:text-6xl mb-3 group-hover:scale-110 transition-transform drop-shadow-sm">
                                    {reward.icon}
                                  </div>
                                  <h4 className="font-black text-slate-800 text-xs sm:text-sm mb-1 truncate w-full">
                                    {reward.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-bold mb-3 line-clamp-2 leading-tight">
                                    {reward.description}
                                  </p>
                              </div>
                              <button 
                                disabled={isOwned || student.stars < reward.cost || isRedeeming !== null} 
                                onClick={() => !isOwned && handleRedeem(reward.id, reward.cost)} 
                                className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                                  isOwned 
                                    ? 'bg-emerald-500 text-white cursor-default' 
                                    : student.stars >= reward.cost 
                                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-105 active:scale-95' 
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                  {isOwned ? (
                                    <>
                                      <CheckCircle size={14}/> ปลดล็อกแล้ว
                                    </>
                                  ) : isRedeeming === reward.id ? (
                                    <RefreshCw size={14} className="animate-spin"/>
                                  ) : (
                                    <>
                                      <Star size={13} className={student.stars >= reward.cost ? "fill-white" : ""}/> {reward.cost} ดาว
                                    </>
                                  )}
                              </button>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20 font-prompt animate-fade-in">
      
      {/* 1. Header Profile & Identity Banner */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 rounded-[36px] sm:rounded-[42px] p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border-b-8 border-black/15">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-8 -translate-y-8 pointer-events-none">
          <Star size={160} fill="currentColor"/>
        </div>
        <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative group flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-md rounded-[28px] sm:rounded-[32px] flex items-center justify-center border-2 sm:border-4 border-white/40 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105">
                            {isAvatarUrl ? (
                                <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl sm:text-5xl drop-shadow-lg">{currentAvatar}</span>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-indigo-900/70 backdrop-blur-sm flex items-center justify-center">
                                    <RefreshCw size={24} className="text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <label 
                          title="เปลี่ยนรูปโปรไฟล์"
                          className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 sm:p-2 rounded-xl shadow-lg cursor-pointer hover:bg-indigo-500 transition-all border-2 border-white/60 hover:scale-110 z-20"
                        >
                            <Camera size={14} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={isUploading} />
                        </label>
                        <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-amber-950 text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-white shadow-md z-10 flex items-center gap-0.5">
                          <Flame size={10} className="fill-amber-600 text-amber-600" />
                          Lv.{level}
                        </div>
                    </div>
                    
                    <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-black truncate drop-shadow-sm">
                          สวัสดีจ้า, {student.name}! 👋
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-sky-100 text-[11px] flex items-center gap-1.5 font-black bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                <School size={13}/> {student.school || 'โรงเรียนประถมศึกษา'}
                            </span>
                            <span className="text-amber-300 text-[11px] font-black bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                ชั้น {GRADE_LABELS[student.grade || ''] || student.grade || 'ทั่วไป'}{student.classroom ? ` ห้อง ${student.classroom}` : ''}
                            </span>
                        </div>

                        {/* XP Progress Bar */}
                        <div className="mt-2.5 max-w-xs">
                          <div className="flex justify-between items-center text-[10px] font-black text-sky-100/90 mb-1">
                            <span>ความก้าวหน้า Level {level}</span>
                            <span>{currentXP} / 20 ดาว</span>
                          </div>
                          <div className="w-full h-2 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full transition-all duration-700" 
                              style={{ width: `${xpPercentage}%` }}
                            />
                          </div>
                        </div>
                    </div>
                </div>

                {/* Star Reward Quick Action */}
                <div className="flex sm:flex-col gap-2 justify-end">
                    <button 
                      onClick={() => setView('rewards')} 
                      className="flex-1 sm:flex-initial bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black py-2.5 px-4 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs border-b-4 border-orange-700 active:translate-y-0.5 transition-all group hover:brightness-105"
                    >
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={18} className="group-hover:rotate-12 transition-transform"/>
                          <span>กล่องสมบัติ</span>
                        </div>
                        <div className="bg-white/20 px-2.5 py-1 rounded-xl flex items-center gap-1 font-black">
                          <Star size={13} fill="currentColor" /> {student.stars}
                        </div>
                    </button>
                    {myRank && (
                      <div className="bg-white/15 backdrop-blur-md rounded-2xl px-3.5 py-1.5 border border-white/20 flex items-center justify-center gap-1.5 text-xs font-black">
                        <Award size={15} className="text-amber-300" />
                        <span>อันดับที่ #{myRank} ในชั้นเรียน</span>
                      </div>
                    )}
                </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-white/15">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-400/30 flex items-center justify-center text-orange-200">
                        <Clock size={18} />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-sky-100/80 uppercase">ภารกิจรอทำ</div>
                        <div className="text-base font-black text-white">{unfinishedAssignments.length} รายการ</div>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-400/30 flex items-center justify-center text-emerald-200">
                        <Trophy size={18} />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-sky-100/80 uppercase">สอบสำเร็จแล้ว</div>
                        <div className="text-base font-black text-white">{studentResults.length} ครั้ง</div>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/30 flex items-center justify-center text-amber-200">
                        <Star size={18} fill="currentColor"/>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-sky-100/80 uppercase">ดาวสะสม</div>
                        <div className="text-base font-black text-white">{student.stars} ดวง</div>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-400/30 flex items-center justify-center text-cyan-200">
                        <BarChart3 size={18} />
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-sky-100/80 uppercase">คะแนนเฉลี่ยรวม</div>
                        <div className="text-base font-black text-white">{overallMastery}%</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. 🔄 รายการสอบแก้ตัว (เฉพาะสอบกลางภาคและปลายภาคที่คุณครูอนุญาตให้แก้ตัว) */}
      {retakeAssignments.length > 0 && (
        <div className="space-y-3 bg-gradient-to-r from-rose-500/10 via-rose-50 to-orange-50 p-4 sm:p-5 rounded-[32px] border-2 border-rose-300 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-rose-700 flex items-center gap-2">
              <RefreshCw className="animate-spin text-rose-600" size={20}/> 🎯 รายการสอบแก้ตัว (คุณครูเปิดระบบให้ทำใหม่)
            </h3>
            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full">
              {retakeAssignments.length} รายการ
            </span>
          </div>
          <div className="space-y-2.5">
            {retakeAssignments.map(item => (
              <div key={item.assignment.id} className="p-4 rounded-[26px] border-2 border-rose-200 border-b-[8px] bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner flex-shrink-0 font-black text-lg">
                    🔄
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[9px] rounded-md uppercase">
                        สอบแก้ตัว
                      </span>
                      <h4 className="font-black text-slate-800 truncate leading-tight">
                        {item.assignment.title || item.assignment.subject}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold mt-1">
                      คะแนนเดิม: <span className="text-rose-600 font-black">{item.initialScore}/{item.initialTotal} ({item.initialPct}%)</span>
                      {item.retakeScore !== undefined && (
                        <span className="ml-2 text-amber-600 font-black">
                          | สอบแก้ตัวล่าสุด: {item.retakeScore}/{item.retakeTotal} ({item.retakePct}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => onStartAssignment?.({ ...item.assignment, isRetake: true })}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition active:scale-95 text-white bg-rose-600 hover:bg-rose-500 border-b-4 border-rose-900 flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  🎯 เริ่มสอบแก้ตัวทันที
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ศูนย์ภารกิจและการบ้านที่ครูมอบหมาย (Missions & Assignments Hub) */}
      <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <Backpack className="text-orange-500" size={22}/> ภารกิจและการบ้านของฉัน
              </h3>
              
              {/* Filter Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 self-start sm:self-auto overflow-x-auto max-w-full">
                  <button 
                    onClick={() => setAssignmentFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      assignmentFilter === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Clock size={13}/> รอทำ ({unfinishedAssignments.length})
                  </button>
                  <button 
                    onClick={() => setAssignmentFilter('exams')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      assignmentFilter === 'exams' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShieldCheck size={13}/> สอบ/วัดผล ({examAssignments.length})
                  </button>
                  <button 
                    onClick={() => setAssignmentFilter('completed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      assignmentFilter === 'completed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckCircle2 size={13}/> ส่งแล้ว ({completedAssignments.length})
                  </button>
                  <button 
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      assignmentFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ทั้งหมด ({myAllAssignments.length})
                  </button>
              </div>
          </div>

          {displayedAssignments.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200 shadow-sm">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500 shadow-inner">
                    <CheckCircle size={28} />
                  </div>
                  <h4 className="font-black text-slate-700 text-sm">
                    {assignmentFilter === 'pending' ? 'เยี่ยมยอดมาก! เคลียร์ภารกิจครบถ้วนแล้ว 🏆' : 'ไม่มีรายการภารกิจในหมวดนี้'}
                  </h4>
                  <p className="text-slate-400 text-xs font-bold mt-1">
                    สามารถไปฝึกฝนข้อสอบ O-NET หรือวิชาพื้นฐานด้านล่างเพื่อเพิ่มคะแนนได้เลยจ้า
                  </p>
              </div>
          ) : (
              <div className="space-y-3">
                  {displayedAssignments.map(hw => {
                      const isDone = doneAssignmentIds.has(String(hw.id).trim());
                      const isRT = hw.category === 'RT' || (hw.subject && hw.subject.includes('RT')) || (hw.title && hw.title.includes('RT'));
                      const isNT = hw.category === 'NT' || (hw.subject && hw.subject.includes('NT')) || (hw.title && hw.title.includes('NT'));
                      const isONET = hw.category === 'ONET' || (hw.subject && hw.subject.includes('O-NET')) || (hw.title && hw.title.includes('O-NET'));
                      const isMidterm = hw.category === 'MIDTERM' || (hw.title && hw.title.includes('กลางภาค'));
                      const isFinal = hw.category === 'FINAL' || (hw.title && hw.title.includes('ปลายภาค'));
                      const isLocked = hw.status === 'LOCKED';

                      // Find score if completed
                      const result = isDone ? studentResults.find(r => String(r.assignmentId).trim() === String(hw.id).trim()) : null;
                      const scorePct = result ? Math.round((result.score / (result.totalQuestions || hw.questionCount || 1)) * 100) : null;

                      let catBadge = { label: 'แบบฝึกหัด', bg: 'bg-orange-100 text-orange-700' };
                      if (isRT) catBadge = { label: 'สอบ RT', bg: 'bg-teal-100 text-teal-700' };
                      else if (isNT) catBadge = { label: 'สอบ NT', bg: 'bg-amber-100 text-amber-700' };
                      else if (isONET) catBadge = { label: 'สอบ O-NET', bg: 'bg-indigo-100 text-indigo-700' };
                      else if (isMidterm) catBadge = { label: 'สอบกลางภาค', bg: 'bg-amber-100 text-amber-800' };
                      else if (isFinal) catBadge = { label: 'สอบปลายภาค', bg: 'bg-violet-100 text-violet-700' };

                      return (
                        <div 
                          key={hw.id} 
                          className={`p-4 sm:p-5 rounded-[28px] border-2 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-[8px] bg-white shadow-sm gap-4 transition-all ${
                            isDone 
                              ? 'border-emerald-200 bg-emerald-50/20' 
                              : isLocked 
                                ? 'border-slate-200 bg-slate-50 opacity-90' 
                                : 'border-slate-100 hover:border-indigo-200 hover:-translate-y-0.5'
                          }`}
                        >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0 ${
                                  isDone ? 'bg-emerald-100 text-emerald-600' :
                                  isLocked ? 'bg-slate-200 text-slate-400' :
                                  isRT ? 'bg-teal-100 text-teal-600' :
                                  isNT ? 'bg-amber-100 text-amber-600' :
                                  isONET ? 'bg-indigo-100 text-indigo-600' :
                                  isMidterm ? 'bg-amber-100 text-amber-600' :
                                  isFinal ? 'bg-violet-100 text-violet-600' :
                                  'bg-orange-100 text-orange-600'
                                }`}>
                                    {isDone ? <CheckCircle size={24}/> :
                                     isLocked ? <Lock size={22}/> :
                                     isRT || isNT || isONET ? <ShieldCheck size={24}/> :
                                     <FileText size={22}/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2 py-0.5 font-black text-[9px] rounded-md ${catBadge.bg}`}>
                                            {catBadge.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold">
                                            {hw.subject}
                                        </span>
                                        {isDone && (
                                          <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[9px] rounded-md">
                                            ส่งเรียบร้อย
                                          </span>
                                        )}
                                    </div>
                                    <h4 className="font-black text-slate-800 text-sm sm:text-base truncate leading-tight mt-1">
                                        {hw.title || hw.subject}
                                    </h4>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold mt-1.5 flex-wrap">
                                        <span>📝 {hw.questionCount || '10'} ข้อ</span>
                                        {hw.timeLimit && <span>⏱️ จำกัดเวลา {hw.timeLimit} นาที</span>}
                                        {isLocked ? (
                                            <span className="text-rose-500 font-black">🔒 รอคุณครูเปิดระบบสอบ</span>
                                        ) : hw.deadline ? (
                                            <span>📅 กำหนดส่ง {new Date(hw.deadline).toLocaleDateString('th-TH')}</span>
                                        ) : null}
                                        {result && scorePct !== null && (
                                            <span className="text-emerald-600 font-black">
                                              🎯 ได้ {result.score}/{result.totalQuestions || hw.questionCount} ({scorePct}%)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Action Button */}
                            <div className="w-full sm:w-auto flex items-center gap-2">
                                {isLocked ? (
                                    <button 
                                        disabled
                                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs bg-slate-200 border-b-4 border-slate-400 text-slate-400 cursor-not-allowed shadow-inner flex items-center justify-center gap-1"
                                    >
                                        <Lock size={14}/> ล็อกอยู่
                                    </button>
                                ) : isDone ? (
                                    <button 
                                        onClick={() => onStartAssignment?.(hw)}
                                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded-xl transition flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw size={14}/> ฝึกซ้ำอีกครั้ง
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => onStartAssignment?.(hw)} 
                                        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition active:scale-95 text-white border-b-4 flex items-center justify-center gap-1.5 ${
                                            isRT ? 'bg-teal-600 hover:bg-teal-700 border-teal-900' : 
                                            isNT ? 'bg-amber-500 hover:bg-amber-600 border-amber-800' : 
                                            isONET ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-900' : 
                                            isMidterm ? 'bg-amber-600 hover:bg-amber-700 border-amber-900' : 
                                            isFinal ? 'bg-violet-600 hover:bg-violet-700 border-violet-900' : 
                                            'bg-orange-500 hover:bg-orange-600 border-orange-800'
                                        }`}
                                    >
                                        <PlayCircle size={15}/> เริ่มทำข้อสอบ!
                                    </button>
                                )}
                            </div>
                        </div>
                      );
                  })}
              </div>
          )}
      </div>

      {/* 4. ศูนย์เตรียมสอบระดับชาติ (O-NET / NT Training Center) */}
      {exams.length > 0 && (
          <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                      <Trophy className="text-indigo-600" size={22}/> 
                      {student.grade === 'P3' 
                        ? 'ศูนย์เตรียมสอบระดับชาติ (RT / NT ป.3)' 
                        : student.grade === 'M3' 
                          ? 'ศูนย์เตรียมสอบระดับชาติ (O-NET ม.3)' 
                          : 'ศูนย์เตรียมสอบระดับชาติ (O-NET ป.6)'}
                    </h3>
                    <p className="text-slate-500 text-xs font-bold">
                      {student.grade === 'P3'
                        ? 'ฝึกทำข้อสอบประเมินความสามารถในการอ่าน (RT) และประเมินคุณภาพผู้เรียน (NT) พร้อมสั่งพิมพ์ A4 และกระดาษคำตอบ'
                        : 'ฝึกทำข้อสอบจำลองออนไลน์ หรือสั่งพิมพ์แบบ A4 และกระดาษคำตอบมาตรฐานเพื่อฝึกทำบนกระดาษ'}
                    </p>
                  </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {exams.map(exam => {
                      const unlockedCount = getUnlockedSetsCount(exam.name);
                      const avg = getSubjectAverage(exam.name);
                      const isUnlocked = unlockedCount > 0 || hasFreeQuestions(exam.name);

                      return (
                        <div 
                            key={exam.name}
                            className={`bg-white p-4 sm:p-5 rounded-[28px] border-2 border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group ${
                              isUnlocked ? 'border-b-[6px]' : 'opacity-70 bg-slate-50'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`${exam.color} text-white p-3 rounded-2xl shadow-md group-hover:scale-105 transition-transform`}>
                                            {exam.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-sm sm:text-base font-black text-slate-800 leading-tight">
                                              {exam.name}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                              {exam.desc}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-base font-black text-indigo-600">{avg}%</span>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">คะแนนเฉลี่ย</div>
                                    </div>
                                </div>

                                <div className="w-full h-2 bg-slate-100 rounded-full my-2.5 overflow-hidden shadow-inner">
                                    <div className={`h-full ${exam.color} rounded-full transition-all duration-700`} style={{ width: `${avg}%` }}></div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 mt-2">
                                <button 
                                    onClick={() => onSelectSubject?.({
                                        id: `practice_exam_${exam.name}`,
                                        name: exam.name,
                                        school: student.school || '',
                                        teacherId: 'SYSTEM',
                                        grade: student.grade || '',
                                        icon: 'Zap',
                                        color: exam.color
                                    })}
                                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <PlayCircle size={14}/> ทำข้อสอบออนไลน์
                                </button>
                                
                                <button 
                                    onClick={() => handleOpenPrintModal(exam.name)}
                                    className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-black text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <Printer size={14} className="text-indigo-600"/> พิมพ์ข้อสอบ A4
                                </button>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* 5. คลังวิชาพื้นฐาน & แบบฝึกทบทวน (Basic Subject Library) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <BookOpen className="text-emerald-600" size={22} /> คลังวิชาพื้นฐาน & ทบทวนบทเรียน
              </h3>
              <p className="text-slate-500 text-xs font-bold">
                ฝึกฝนตนเองได้ทุกวันตามมาตรฐานตัวชี้วัดหลักสูตรแกนกลาง สพฐ.
              </p>
            </div>
            {onRefreshSubjects && (
              <button 
                onClick={onRefreshSubjects} 
                title="รีเฟรชรายวิชา"
                className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-500 transition active:rotate-180 duration-500 shadow-sm"
              >
                <RefreshCw size={14}/>
              </button>
            )}
        </div>

        {mySubjects.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-xs font-black italic">ยังไม่มีรายวิชาเรียนนะจ๊ะ 😊</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mySubjects.map(sub => {
                    const avg = getSubjectAverage(sub.name);
                    const theme = SUBJECT_THEMES[sub.name] || { gradient: 'from-slate-600 to-slate-800', slogan: 'เรียนรู้วันนี้ เพื่ออนาคตที่ดีจ้า', icon: <BookOpen size={18}/> };
                    const gradeLabel = sub.grade ? (GRADE_LABELS[sub.grade] || sub.grade) : 'ทุกชั้น';
                    
                    return (
                        <button 
                          key={sub.id} 
                          onClick={() => onSelectSubject?.(sub)} 
                          className={`group p-4 rounded-[26px] shadow-sm hover:shadow-lg transition-all duration-300 text-left flex flex-col justify-between h-[155px] relative overflow-hidden border-b-[6px] bg-gradient-to-br ${theme.gradient} border-black/20 active:translate-y-0.5 active:border-b-2`}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-2 relative z-10 w-full">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md bg-white/20 backdrop-blur-md border border-white/30 group-hover:rotate-6 transition-transform">
                                  {theme.icon}
                                </div>
                                <div className="text-right">
                                    <div className="text-base font-black text-white leading-none drop-shadow-md">{avg}%</div>
                                    <div className="text-[7px] font-black text-white/80 uppercase tracking-widest mt-0.5">Mastery</div>
                                </div>
                            </div>
                            <div className="mt-auto relative z-10 w-full">
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded text-white font-black">{gradeLabel}</span>
                                </div>
                                <h4 className="font-black text-xs sm:text-sm text-white tracking-tight truncate drop-shadow-md mb-0.5">{sub.name}</h4>
                                <p className="text-[9px] text-white/80 font-bold mb-2 italic truncate">"{theme.slogan}"</p>
                                <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden shadow-inner border border-white/10 p-0.5">
                                    <div className="h-full rounded-full transition-all duration-1000 bg-white" style={{ width: `${avg}%` }}></div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}
      </div>

      {/* 6. ทำเนียบดาวคนเก่งในห้องเรียน & ประวัติคะแนนล่าสุด (Leaderboard & Recent Submissions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* ทำเนียบดาวคนเก่ง (Classroom Leaderboard) */}
          <div className="bg-white p-5 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                        <Trophy className="text-amber-500" size={20}/> ทำเนียบดาวคนเก่ง ({GRADE_LABELS[student.grade || '']}{student.classroom ? ` ห้อง ${student.classroom}` : ''})
                      </h4>
                      <span className="text-[10px] text-slate-400 font-black uppercase">Top Stars ⭐</span>
                  </div>

                  {isLoadingLeaderboard ? (
                      <div className="py-8 text-center text-slate-400 font-bold text-xs animate-pulse">
                        กำลังโหลดอันดับเพื่อนๆ...
                      </div>
                  ) : leaderboard.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-bold text-xs">
                        ยังไม่มีข้อมูลการจัดอันดับ
                      </div>
                  ) : (
                      <div className="space-y-2">
                          {leaderboard.slice(0, 5).map((item, idx) => {
                              const isMe = String(item.id).trim() === String(student.id).trim();
                              const medals = ['🥇', '🥈', '🥉'];
                              return (
                                <div 
                                  key={item.id}
                                  className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                                    isMe 
                                      ? 'bg-amber-50 border-2 border-amber-300 font-black' 
                                      : 'bg-slate-50 border border-slate-100'
                                  }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-6 text-center font-black text-sm">
                                          {idx < 3 ? medals[idx] : `#${idx + 1}`}
                                        </span>
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-base shadow-sm overflow-hidden flex-shrink-0">
                                            {item.avatar?.startsWith('http') ? (
                                              <img src={item.avatar} alt="avatar" className="w-full h-full object-cover" />
                                            ) : (
                                              <span>{item.avatar || '👨‍🎓'}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
                                              <span>{item.name}</span>
                                              {isMe && <span className="bg-amber-500 text-white text-[8px] px-1.5 py-0.2 rounded-full">ฉันเอง</span>}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-bold">
                                              Level {item.level || 1}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-amber-600 font-black text-xs">
                                        <Star size={13} className="fill-amber-500 text-amber-500" />
                                        <span>{item.stars}</span>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  )}
              </div>

              {myRank && myRank > 5 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-600 bg-amber-50/50 p-2.5 rounded-xl">
                  <span>อันดับปัจจุบันของคุณ: #{myRank}</span>
                  <span className="text-amber-600 font-black">{student.stars} ดาว</span>
                </div>
              )}
          </div>

          {/* ประวัติการสอบล่าสุด (Recent Submissions) */}
          <div className="bg-white p-5 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                        <BarChart3 className="text-indigo-600" size={20}/> ประวัติคะแนนการสอบล่าสุด
                      </h4>
                      <button 
                        onClick={() => onNavigate('stats')}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                      >
                        ดูทั้งหมด <ChevronRight size={14}/>
                      </button>
                  </div>

                  {recentSubmissions.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-bold text-xs">
                        ยังไม่มีประวัติการทำแบบทดสอบ เริ่มทำภารกิจแรกกันเลย!
                      </div>
                  ) : (
                      <div className="space-y-2">
                          {recentSubmissions.map((res, idx) => {
                              const pct = Math.round((res.score / (res.totalQuestions || 1)) * 100);
                              return (
                                <div key={res.id || idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-black text-slate-800 truncate">
                                              {res.subject}
                                            </span>
                                            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-black">
                                              {res.category || 'EXAM'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                                          {new Date(res.timestamp).toLocaleDateString('th-TH')}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className={`text-xs font-black ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                          {res.score}/{res.totalQuestions} ({pct}%)
                                        </div>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  )}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100">
                  <button 
                    onClick={() => onNavigate('stats')}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <BarChart3 size={15} className="text-indigo-600"/> ดูรายงานสถิติและวิเคราะห์จุดแข็ง-จุดอ่อน
                  </button>
              </div>
          </div>
      </div>

      {/* Printable Exam Modal */}
      {printModalData && (
        <PrintableOnetExamModal 
          isOpen={true}
          onClose={() => setPrintModalData(null)}
          title={printModalData.title}
          subject={printModalData.subject}
          grade={printModalData.grade}
          schoolName={student.school || 'โรงเรียนประถมศึกษา'}
          questions={printModalData.questions}
        />
      )}

    </div>
  );
};

export default Dashboard;
