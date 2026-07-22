
import React, { useState, useMemo } from 'react';
import { 
  BookOpen, BarChart3, Star, CheckCircle, 
  ArrowLeft, Calculator, Languages, 
  RefreshCw, Trophy, ShoppingBag, 
  Clock, School, Backpack, 
  ShieldCheck, Atom, Globe,
  Lock, Camera
} from 'lucide-react';
import { Student, Assignment, ExamResult, SubjectConfig, Question } from '../types';
import { CREATIVE_REWARDS } from '../constants';
import { redeemReward, uploadAsset, manageStudent } from '../services/api';

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
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

  const EXAM_LIST = {
      'P3': [
          { name: 'NT ภาษาไทย', color: 'bg-amber-400', icon: <BookOpen size={20}/> },
          { name: 'NT คณิตศาสตร์', color: 'bg-indigo-600', icon: <Calculator size={20}/> }
      ],
      'P6': [
          { name: 'O-NET ภาษาไทย', color: 'bg-orange-500', icon: <BookOpen size={20}/> },
          { name: 'O-NET คณิตศาสตร์', color: 'bg-rose-600', icon: <Calculator size={20}/> },
          { name: 'O-NET วิทยาศาสตร์', color: 'bg-emerald-600', icon: <Atom size={20}/> },
          { name: 'O-NET ภาษาอังกฤษ', color: 'bg-sky-500', icon: <Languages size={20}/> }
      ],
      'M3': [
          { name: 'O-NET ภาษาไทย', color: 'bg-orange-500', icon: <BookOpen size={20}/> },
          { name: 'O-NET คณิตศาสตร์', color: 'bg-rose-600', icon: <Calculator size={20}/> },
          { name: 'O-NET วิทยาศาสตร์', color: 'bg-emerald-600', icon: <Atom size={20}/> },
          { name: 'O-NET ภาษาอังกฤษ', color: 'bg-sky-500', icon: <Languages size={20}/> }
      ]
  };

  const doneAssignmentIds = useMemo(() => {
    const currentStudentId = String(student.id).trim();
    return new Set(
      examResults
        .filter(r => String(r.studentId).trim() === currentStudentId && r.assignmentId)
        .map(r => String(r.assignmentId).trim())
    );
  }, [examResults, student.id]);

  const unfinishedAssignments = useMemo(() => {
    const currentStudentSchool = String(student.school || '').toLowerCase().trim();
    const currentStudentGrade = String(student.grade || '').trim();
    const currentStudentRoom = String(student.classroom || '').trim();

    return assignments.filter(a => {
        // 1. School check (Robust comparison)
        const isMySchool = String(a.school || '').toLowerCase().trim() === currentStudentSchool;
        
        // 2. Grade check
        const isMyGrade = a.grade === currentStudentGrade || a.grade === 'ALL';

        // 3. Classroom level targeting
        // If targetClassrooms is empty or null, it means it's assigned to all students in that grade.
        // Otherwise, we must check if student's room is in the targeted list.
        const targetedRooms = a.targetClassrooms || [];
        const isMyRoom = targetedRooms.length === 0 || targetedRooms.includes(currentStudentRoom);

        // 4. Submission status
        const isNotDone = !doneAssignmentIds.has(String(a.id).trim());

        return isMySchool && isMyGrade && isMyRoom && isNotDone;
    });
  }, [assignments, student, doneAssignmentIds]);

  const getSubjectAverage = (subjectName: string) => {
      const currentStudentId = String(student.id).trim();
      const relevant = examResults.filter(r => (r.subject === subjectName || r.subject.includes(subjectName)) && String(r.studentId).trim() === currentStudentId);
      if (relevant.length === 0) return 0;
      return Math.round(relevant.reduce((sum, r) => sum + ((r.score / (r.totalQuestions || 1)) * 100), 0) / relevant.length);
  };

  const mySubjects = useMemo(() => {
      // 1. Get subjects from the official subjects table
      const filteredSubjects = subjects.filter(s => {
          const schoolMatch = String(s.school || '').toLowerCase().trim() === String(student.school || '').toLowerCase().trim();
          const gradeMatch = s.grade === student.grade || s.grade === 'ALL';
          
          return schoolMatch && gradeMatch;
      });

      // 2. Discover subjects dynamically from questions list to prevent empty display
      const existingNames = new Set(filteredSubjects.map(s => String(s.name || '').trim().toLowerCase()));
      const discoveredSubjects: SubjectConfig[] = [];
      const cleanSchool = String(student.school || '').toLowerCase().trim();
      const cleanGrade = String(student.grade || '').toLowerCase().trim();

      const uniqueSubjectNames = new Set<string>();
      questions.forEach(q => {
          if (q.subject && !q.subject.startsWith('NT') && !q.subject.startsWith('O-NET')) {
              const qSchool = String(q.school || '').toLowerCase().trim();
              const qGrade = String(q.grade || '').toLowerCase().trim();
              if (qSchool === cleanSchool && (qGrade === cleanGrade || qGrade === 'all')) {
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
      return questions.some(q => {
          const subNameClean = String(subjectName || '').trim().toLowerCase();
          const cleanSubName = subNameClean.replace('nt ', '').replace('o-net ', '').replace('onet ', '').trim();
          const qSubjectClean = String(q.subject || '').trim().toLowerCase();
          
          const nameMatch = qSubjectClean === subNameClean || 
                           qSubjectClean === cleanSubName || 
                           subNameClean.includes(qSubjectClean) || 
                           qSubjectClean.includes(cleanSubName);
                           
          const qGradeClean = String(q.grade || '').trim().toUpperCase();
          const stuGradeClean = String(student.grade || '').trim().toUpperCase();
          const gradeMatch = qGradeClean === stuGradeClean || qGradeClean === 'ALL';
          
          return nameMatch && gradeMatch;
      });
  };

  const getUnlockedSetsCount = (subjectName: string) => {
      return assignments.filter(a => 
        (a.category === 'ONET' || a.category === 'NT') && 
        a.subject === subjectName && 
        doneAssignmentIds.has(String(a.id).trim())
      ).length;
  };

  const renderExamPracticeBtn = (item: any) => {
      const unlockedCount = getUnlockedSetsCount(item.name);
      const isUnlocked = unlockedCount > 0 || hasFreeQuestions(item.name);
      const avg = getSubjectAverage(item.name);

      return (
        <button 
            key={item.name} 
            disabled={!isUnlocked}
            onClick={() => onSelectSubject?.({
                id: `practice_exam_${item.name}`,
                name: item.name,
                school: student.school || '',
                teacherId: 'SYSTEM',
                grade: student.grade || '',
                icon: 'Zap',
                color: item.color
            })}
            className={`bg-white p-4 rounded-[30px] border-4 transition-all text-left group relative active:scale-95 ${
              isUnlocked ? 'border-slate-50 shadow-md hover:shadow-xl hover:border-indigo-200' : 'opacity-60 grayscale border-slate-100 cursor-not-allowed'
            }`}
        >
            {!isUnlocked && (
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] rounded-[30px] z-10 flex items-center justify-center">
                 <div className="bg-slate-800/80 text-white p-2 rounded-xl shadow-lg"><Lock size={16}/></div>
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
                <div className={`${item.color} text-white p-2.5 rounded-2xl shadow-lg group-hover:rotate-6 transition-transform`}>{item.icon}</div>
                <div className="text-right flex-1">
                    <div className="text-[9px] font-black text-slate-400 uppercase">ปลดล็อกแล้ว</div>
                    <div className="text-xs font-black text-indigo-600">{unlockedCount} ชุด</div>
                </div>
            </div>
            <div className="text-[11px] font-black text-slate-800 truncate">{item.name}</div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden shadow-inner">
                <div className={`h-full ${item.color}`} style={{ width: `${avg}%` }}></div>
            </div>
            {!isUnlocked && <p className="text-[8px] font-bold text-rose-500 mt-1">* ทำภารกิจที่มอบหมายเพื่อปลดล็อก</p>}
        </button>
      );
  };

  if (view === 'rewards') {
      return (
          <div className="space-y-4 pb-20 animate-fade-in font-prompt">
              <button onClick={() => setView('main')} className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2 font-bold transition-colors">
                  <ArrowLeft size={16} /> กลับหน้าหลัก
              </button>
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 rounded-[35px] text-white shadow-xl relative overflow-hidden text-center border-b-8 border-black/10">
                  <h2 className="text-2xl font-black mb-1">คลังสมบัติ PST</h2>
                  <div className="flex items-center gap-2 bg-white text-orange-600 px-4 py-1.5 rounded-full font-black shadow-lg mt-2 w-fit mx-auto transform hover:scale-110 transition">
                      <Star className="fill-orange-500" size={18}/><span className="text-lg">{student.stars} ดาว</span>
                  </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CREATIVE_REWARDS.map(reward => {
                      const isOwned = student.inventory?.includes(reward.id);
                      return (
                          <div key={reward.id} className={`bg-white p-4 rounded-[30px] border-4 transition-all group border-b-[8px] ${isOwned ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 hover:border-orange-400'}`}>
                              <div className="flex flex-col items-center text-center">
                                  <div className="text-5xl mb-3 group-hover:scale-125 transition-transform">{reward.icon}</div>
                                  <h4 className="font-black text-slate-800 text-xs mb-2 truncate w-full">{reward.name}</h4>
                                  <button disabled={isOwned || student.stars < reward.cost || isRedeeming !== null} onClick={() => !isOwned && handleRedeem(reward.id, reward.cost)} className={`w-full py-2 rounded-xl font-black text-[10px] flex items-center justify-center gap-1 transition-all ${isOwned ? 'bg-emerald-500 text-white' : student.stars >= reward.cost ? 'bg-orange-500 text-white hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-300'}`}>
                                      {isOwned ? <CheckCircle size={14}/> : isRedeeming === reward.id ? <RefreshCw size={14} className="animate-spin"/> : `${reward.cost} ดาว`}
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  const exams = EXAM_LIST[student.grade as keyof typeof EXAM_LIST] || [];

  return (
    <div className="space-y-6 pb-20 font-prompt animate-fade-in">
      {/* Header Profile */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 rounded-[40px] p-6 text-white shadow-xl relative overflow-hidden border-b-8 border-black/10">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-5 -translate-y-5"><Star size={120} fill="currentColor"/></div>
        <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
                <div className="relative group">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-md rounded-[25px] sm:rounded-[35px] flex items-center justify-center border-2 sm:border-4 border-white/30 shadow-2xl overflow-hidden transition-all duration-500 group-hover:scale-105">
                        {isAvatarUrl ? (
                            <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl sm:text-5xl drop-shadow-lg">{currentAvatar}</span>
                        )}
                        {isUploading && (
                            <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-sm flex items-center justify-center">
                                <RefreshCw size={24} className="text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-indigo-600 text-white p-1.5 sm:p-2 rounded-xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-all border-2 border-white/50 hover:scale-110 z-20">
                        <Camera size={14} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={isUploading} />
                    </label>
                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-md z-10">Lv.{student.level || 1}</div>
                </div>
                <div>
                    <h2 className="text-xl font-black">สวัสดีจ้า, {student.name.split(' ')[0]}! 👋</h2>
                    <p className="text-sky-100 text-[10px] flex items-center gap-1 opacity-90 uppercase font-black tracking-widest bg-black/10 w-fit px-3 py-1 rounded-full mt-1"><School size={12}/> {student.school} ชั้น {GRADE_LABELS[student.grade || '']}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setView('rewards')} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black py-3 px-5 rounded-2xl shadow-lg flex items-center justify-between text-xs border-b-4 border-orange-700 active:translate-y-0.5 transition-transform group">
                    <div className="flex items-center gap-2"><ShoppingBag size={18} className="group-hover:rotate-12 transition-transform"/><span>กล่องสมบัติ</span></div>
                    <div className="bg-white/20 px-2 py-0.5 rounded-lg flex items-center gap-1"><Star size={12} fill="currentColor" /> {student.stars}</div>
                </button>
                <div className="flex items-center justify-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-4 border border-white/10">
                    <Trophy className="text-yellow-300" size={20} />
                    <span className="font-black text-sm">{examResults.filter(r => String(r.studentId).trim() === String(student.id).trim()).length} <span className="text-[10px] opacity-70 uppercase ml-1 tracking-tighter">Done</span></span>
                </div>
            </div>
        </div>
      </div>

      {/* ภารกิจวันนี้ (Assignments & Missions) */}
      <div className="space-y-3">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2 px-1"><Backpack className="text-orange-500" size={20}/> ภารกิจวันนี้</h3>
          {unfinishedAssignments.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-[35px] border-4 border-dashed border-emerald-50">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500 shadow-inner"><CheckCircle size={28} /></div>
                  <p className="font-black text-slate-600 text-sm">สุดยอด! เคลียร์ภารกิจครบแล้ว 🏆</p>
              </div>
          ) : (
              <div className="space-y-3">
                  {unfinishedAssignments.map(hw => {
                      const isNT = hw.category === 'NT' || (hw.subject && hw.subject.includes('NT'));
                      const isONET = hw.category === 'ONET' || (hw.subject && hw.subject.includes('O-NET'));
                      const isMidterm = hw.category === 'MIDTERM' || (hw.title && hw.title.includes('กลางภาค'));
                      const isFinal = hw.category === 'FINAL' || (hw.title && hw.title.includes('ปลายภาค'));
                      const isLocked = hw.status === 'LOCKED';

                      let prefix = '';
                      if (isNT) prefix = 'NT: ';
                      else if (isONET) prefix = 'O-NET: ';
                      else if (isMidterm) prefix = 'สอบกลางภาค: ';
                      else if (isFinal) prefix = 'สอบปลายภาค: ';

                      let colorClass = 'border-orange-100';
                      let iconColor = 'text-orange-500 bg-orange-50';
                      if (isNT) {
                          colorClass = 'border-amber-100';
                          iconColor = 'text-amber-500 bg-amber-50';
                      } else if (isONET) {
                          colorClass = 'border-indigo-100';
                          iconColor = 'text-indigo-500 bg-indigo-50';
                      } else if (isMidterm) {
                          colorClass = 'border-amber-200 bg-gradient-to-r from-amber-50/50 to-white';
                          iconColor = 'text-amber-600 bg-amber-100';
                      } else if (isFinal) {
                          colorClass = 'border-violet-200 bg-gradient-to-r from-violet-50/50 to-white';
                          iconColor = 'text-violet-600 bg-violet-100';
                      }

                      if (isLocked) {
                          colorClass = 'border-slate-200 bg-slate-50/70 opacity-85';
                          iconColor = 'text-slate-400 bg-slate-200';
                      }

                      return (
                        <div key={hw.id} className={`p-4 rounded-[30px] border-2 flex justify-between items-center border-b-[10px] bg-white shadow-lg gap-4 transition-all ${isLocked ? '' : 'hover:-translate-y-0.5'} ${colorClass}`}>
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0 ${iconColor}`}>
                                    {isLocked ? (
                                        <Lock size={22} />
                                    ) : isNT || isONET ? (
                                        <ShieldCheck size={24}/>
                                    ) : (
                                        <Clock size={24}/>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-slate-800 truncate leading-tight">
                                        {prefix}{hw.title || hw.subject}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                        {isLocked ? (
                                            <span className="text-rose-500 font-black">🔒 ระบบข้อสอบยังไม่เปิดใช้งาน (กรุณารอครูเปิด)</span>
                                        ) : (
                                            `ส่งภายใน ${new Date(hw.deadline).toLocaleDateString('th-TH')}`
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            {isLocked ? (
                                <button 
                                    disabled
                                    className="px-6 py-2 rounded-xl font-black text-xs bg-slate-200 border-b-4 border-slate-400 text-slate-400 cursor-not-allowed shadow-inner"
                                >
                                    ล็อกอยู่
                                </button>
                            ) : (
                                <button 
                                    onClick={() => onStartAssignment?.(hw)} 
                                    className={`px-6 py-2 rounded-xl font-black text-xs shadow-md transition active:scale-95 text-white border-b-4 ${
                                        isNT ? 'bg-amber-500 border-amber-800' : 
                                        isONET ? 'bg-indigo-600 border-indigo-900' : 
                                        isMidterm ? 'bg-amber-600 border-amber-900' : 
                                        isFinal ? 'bg-violet-600 border-violet-900' : 
                                        'bg-orange-500 border-orange-800'
                                    }`}
                                >
                                    เริ่ม!
                                </button>
                            )}
                        </div>
                      );
                  })}
              </div>
          )}
      </div>

      {/* เตรียมสอบระดับชาติ (Self-Practice Mode) - ดึงจากชุดที่ทำเสร็จแล้ว */}
      {exams.length > 0 && (
          <div className="space-y-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2 px-1"><Trophy className="text-indigo-600" size={20}/> คลังข้อสอบระดับชาติ (ฝึกฝนทบทวน)</h3>
              <div className="grid grid-cols-2 gap-3">
                  {exams.map(exam => renderExamPracticeBtn(exam))}
              </div>
          </div>
      )}

      {/* คลังวิชาพื้นฐาน */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><BookOpen className="text-emerald-600" size={20} /> คลังวิชาพื้นฐาน</h3>
            {onRefreshSubjects && <button onClick={onRefreshSubjects} className="p-2 bg-white rounded-full border border-slate-100 hover:bg-slate-50 text-slate-500 transition active:rotate-180 duration-500"><RefreshCw size={14}/></button>}
        </div>
        {mySubjects.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-100"><p className="text-slate-400 text-xs font-black italic">ยังไม่มีรายวิชาเรียนนะจ๊ะ 😊</p></div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mySubjects.map(sub => {
                    const avg = getSubjectAverage(sub.name);
                    const theme = SUBJECT_THEMES[sub.name] || { gradient: 'from-slate-500 to-slate-700', slogan: 'เรียนรู้วันนี้ เพื่ออนาคตที่ดีจ้า', icon: <BookOpen size={18}/> };
                    const gradeLabel = sub.grade ? (GRADE_LABELS[sub.grade] || sub.grade) : 'ทุกชั้น';
                    return (
                        <button key={sub.id} onClick={() => onSelectSubject?.(sub)} className={`group p-3.5 sm:p-4 rounded-[24px] shadow-sm hover:shadow-lg transition-all duration-300 text-left flex flex-col h-[150px] relative overflow-hidden border-b-[5px] bg-gradient-to-br ${theme.gradient} border-black/20 active:translate-y-0.5 active:border-b-2`}>
                            <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md bg-white/20 backdrop-blur-md border border-white/30 group-hover:rotate-6 transition-transform">{theme.icon}</div>
                                <div className="text-right">
                                    <div className="text-lg font-black text-white leading-none drop-shadow-md">{avg}%</div>
                                    <div className="text-[7px] font-black text-white/70 uppercase tracking-widest mt-0.5">Mastery</div>
                                </div>
                            </div>
                            <div className="mt-auto relative z-10">
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded text-white font-black">{gradeLabel}</span>
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

      {/* Bottom Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
          <MenuActionBtn onClick={() => onNavigate('stats')} icon={<BarChart3 size={24}/>} label="สถิติ" gradient="from-emerald-400 to-teal-600" />
          <MenuActionBtn onClick={() => setView('rewards')} icon={<ShoppingBag size={24}/>} label="รางวัล" gradient="from-amber-400 to-orange-500" />
      </div>
    </div>
  );
};

const MenuActionBtn: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, gradient: string, isLive?: boolean }> = ({ onClick, icon, label, gradient, isLive }) => (
    <button onClick={onClick} className={`group rounded-[30px] p-4 shadow-lg transition-all border-b-[6px] border-black/20 hover:-translate-y-1 hover:shadow-xl flex flex-col items-center justify-center gap-2 text-center h-28 relative overflow-hidden bg-gradient-to-br ${gradient} active:translate-y-1 active:border-b-0`}>
        <div className="text-white transform group-hover:scale-125 transition-all duration-300 drop-shadow-xl">
            {icon}
            {isLive && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400 border border-white"></span></span>}
        </div>
        <span className="font-black text-white text-[10px] tracking-tight drop-shadow-md">{label}</span>
    </button>
);

export default Dashboard;
