
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Teacher, Student, Assignment, SubjectConfig, School, ExamResult, Question, Classroom } from '../../types';
import { 
  UserPlus, BarChart2, FileText, LogOut, Gamepad2, Calendar, UserCog, Users, ArrowLeft, Trophy, UploadCloud, RefreshCw, Trash2, X, GraduationCap, KeyRound, Sparkles, List, Copy, Eye, Loader2, Clock, LayoutGrid, TrendingUp, CheckCircle, User, Settings, Info, Download, LineChart,
  BookOpen, Medal, ChevronRight, ShieldCheck, ToggleLeft, ToggleRight
} from 'lucide-react';

import { getTeacherDashboard, deleteAssignment, getSubjects, addAssignment, addQuestion, getTeacherById, getQuestionsByAssignment, getClassrooms, updateSchoolSettings } from '../../services/api';
import { generateQuestionWithAI, GeneratedQuestion } from '../../services/aiService';

import StudentManager from './StudentManager';
import SubjectManager from './SubjectManager';
import QuestionBank from './QuestionBank';
import AssignmentManager from './AssignmentManager';
import StatsViewer from './StatsViewer';
import TeacherManager from './TeacherManager'; 
import ProfileManager from './ProfileManager';
import ClassroomManager from './ClassroomManager';
import ExecutiveDashboard from './ExecutiveDashboard';

// Declare XLSX from CDN
declare const XLSX: any;

interface TeacherDashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onStartGame: () => void; 
  onAdminLoginAsStudent: (student: Student) => void;
  onTeacherUpdate?: (teacher: Teacher) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher: initialTeacher, onLogout, onStartGame, onTeacherUpdate }) => {
  const [teacher, setTeacher] = useState<Teacher>(initialTeacher); 
  const [activeTab, setActiveTab] = useState<'menu' | 'students' | 'subjects' | 'stats' | 'questions' | 'assignments' | 'school-settings' | 'registrations' | 'profile' | 'onet' | 'executive'>('menu');
  const [settingsTab, setSettingsTab] = useState<'classrooms' | 'teachers' | 'students'>('classrooms'); 
  
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<ExamResult[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<School | null>(null);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectConfig[]>([]);
  
  // O-NET / NT Logic
  const [onetLevel, setOnetLevel] = useState<string | null>(null); 
  const [assignTitle, setAssignTitle] = useState('');
  const [assignSubject, setAssignSubject] = useState<string>(''); 
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignAiTopic, setAssignAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [newlyGeneratedQuestions, setNewlyGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal for O-NET Detail
  const [selectedOnetForModal, setSelectedOnetForModal] = useState<Assignment | null>(null);
  const [modalTab, setModalTab] = useState<'SCORES' | 'QUESTIONS'>('SCORES');
  const [activeRoomTab, setActiveRoomTab] = useState<string>('ALL'); 
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [hasApiKey, setHasApiKey] = useState(false);

  // 👔 ตรวจสอบสิทธิ์ผู้บริหาร (Director / Executive)
  const isExecutive = useMemo(() => {
    const pos = teacher.position || '';
    const roles = (teacher.role || '').split(',');
    // ตรวจสอบทั้งบทบาทในระบบ และชื่อตำแหน่งที่ระบุ
    return roles.includes('DIRECTOR') || pos === 'ผู้อำนวยการโรงเรียน' || pos === 'รองผู้อำนวยการ';
  }, [teacher.position, teacher.role]);

  // 🛡️ ตรวจสอบสิทธิ์แอดมิน (Admin)
  const isAdminUser = useMemo(() => {
    const roles = (teacher.role || '').split(',');
    return roles.includes('SCHOOL_ADMIN') || roles.includes('SUPER_ADMIN') || (teacher.username && teacher.username.toLowerCase() === 'admin');
  }, [teacher.role, teacher.username]);

  // 🌍 สิทธิ์ในการดูข้อมูลทุกชั้นเรียน (ผู้บริหาร และ แอดมิน)
  const canManageAll = useMemo(() => {
    return (teacher.gradeLevel === 'ALL') || isAdminUser || isExecutive;
  }, [teacher.gradeLevel, isAdminUser, isExecutive]);

  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
        setHasApiKey(await (window as any).aistudio.hasSelectedApiKey());
      } else {
        setHasApiKey(!!localStorage.getItem('MST_CUSTOM_GEMINI_KEY'));
      }
    };
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      setActiveTab('profile');
    }
  };

  const GRADE_LABELS: Record<string, string> = { 
      'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
      'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
  };
  
  const GRADES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3'];

  const ONET_SUBJECTS = ['ภาษาไทย', 'ภาษาอังกฤษ', 'คณิตศาสตร์', 'วิทยาศาสตร์'];
  const NT_SUBJECTS = ['คณิตศาสตร์', 'ภาษาไทย'];

  const getTeacherGrades = (t: Teacher): string[] => {
      const grades = new Set<string>();
      if (t.gradeLevel && t.gradeLevel !== 'ALL') {
          t.gradeLevel.split(',').forEach(g => grades.add(g.trim()));
      }
      if (t.gradeLevel === 'ALL') return ['ALL'];
      if (t.advisorClass) {
          const g = t.advisorClass.split('/')[0];
          if (g) grades.add(g);
      }
      if (t.teachingClasses && Array.isArray(t.teachingClasses)) {
          t.teachingClasses.forEach(cls => {
              if (cls && typeof cls === 'string') {
                const g = cls.split('/')[0];
                if (g) grades.add(g);
              }
          });
      }
      return Array.from(grades);
  };

  const myGrades = getTeacherGrades(teacher);
  
  const showNT = canManageAll || myGrades.includes('P3');
  const showOnetP6 = canManageAll || myGrades.includes('P6');
  const showOnetM3 = canManageAll || myGrades.includes('M3');
  const canAccessOnet = showNT || showOnetP6 || showOnetM3;

  useEffect(() => {
    loadInitialData();
  }, []);

  const normalizeId = (id: any) => String(id || '').trim();

  const handleProfileRefresh = async () => {
      if (!teacher.id) return;
      const fresh = await getTeacherById(String(teacher.id));
      if (fresh) {
          setTeacher(fresh);
          if (onTeacherUpdate) onTeacherUpdate(fresh);
      }
  };

  const loadInitialData = async () => {
    const data = await getTeacherDashboard(teacher.school);
    const subs = await getSubjects(teacher.school);
    const rooms = await getClassrooms(teacher.school);
    
    setSchoolInfo(data.school);
    setAvailableSubjects(subs);
    setStudents(data.students || []);
    setStats(data.results || []);
    setAssignments(data.assignments || []);
    setAllClassrooms(rooms);
  };

  const toggleStudentManagementSms = async () => {
    if (!schoolInfo) return;
    const newValue = !schoolInfo.allowAllManageStudents;
    setIsProcessing(true);
    try {
        const res = await updateSchoolSettings(teacher.school, { allowAllManageStudents: newValue });
        if (res.success) {
            setSchoolInfo({ ...schoolInfo, allowAllManageStudents: newValue });
        } else {
            alert("ไม่สามารถเปลี่ยนค่าได้: " + res.message);
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
    setIsProcessing(false);
  };

  const onetStats = useMemo(() => {
      const myOnetAssignments = assignments.filter(a => 
          (a.category === 'ONET' || a.category === 'NT' || a.title?.startsWith('[O-NET]') || a.title?.startsWith('[NT]')) && 
          (a.createdBy === teacher.name || canManageAll) 
      );
      const myOnetIds = new Set(myOnetAssignments.map(a => a.id));
      const relevantResults = stats.filter(r => r.assignmentId && myOnetIds.has(r.assignmentId));
      let count = relevantResults.length;
      let totalPercentage = relevantResults.reduce((sum, r) => sum + (r.score / (r.totalQuestions || 1)) * 100, 0);
      const average = count > 0 ? Math.round(totalPercentage / count) : 0;
      return { totalAssignments: myOnetAssignments.length, totalSubmissions: count, averageScore: average, myOnetAssignments };
  }, [assignments, stats, teacher.name, canManageAll]);

  const handleOnetDuplicate = async (original: Assignment) => {
      const isNT = original.category === 'NT' || original.title?.startsWith('[NT]');
      const label = isNT ? 'NT' : 'O-NET';
      if (!confirm(`คุณต้องการคัดลอกชุดข้อสอบ "${original.title}" เพื่อให้นักเรียนทดสอบอีกครั้งใช่หรือไม่?`)) return;
      setIsProcessing(true);
      try {
          const oldQuestions = await getQuestionsByAssignment(original.id);
          if (oldQuestions.length === 0) throw new Error("ไม่พบโจทย์ในชุดเดิม");

          let newTitle = original.title || `[${label}] ${original.subject}`;
          if (newTitle.includes('ครั้งที่')) {
              const match = newTitle.match(/ครั้งที่ (\d+)/);
              const num = match ? parseInt(match[1]) + 1 : 2;
              newTitle = newTitle.replace(/ครั้งที่ \d+/, `ครั้งที่ ${num}`);
          } else {
              newTitle = `${newTitle} ครั้งที่ 2`;
          }

          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const defaultDeadline = tomorrow.toISOString().split('T')[0];

          const cat = isNT ? 'NT' : 'ONET';
          const res = await addAssignment(teacher.school, original.subject, original.grade || 'P6', oldQuestions.length, defaultDeadline, teacher.name, newTitle, undefined, undefined, cat as any);

          if (res.id) {
              const tid = normalizeId(teacher.id);
              for (const q of oldQuestions) {
                  await addQuestion({
                      subject: q.subject, grade: original.grade, text: q.text, image: q.image || '',
                      c1: q.choices[0]?.text || '', c2: q.choices[1]?.text || '', 
                      c3: q.choices[2]?.text || '', c4: q.choices[3]?.text || '', 
                      correct: q.correctChoiceId, explanation: q.explanation,
                      school: teacher.school, teacherId: tid, assignmentId: res.id 
                  });
              }
              alert(`✅ คัดลอกสำเร็จ: ${newTitle}`);
              loadInitialData();
          }
      } catch (e: any) { alert("Error: " + e.message); } finally { setIsProcessing(false); }
  };

  const handleOpenOnetStats = async (a: Assignment) => {
      setSelectedOnetForModal(a);
      setModalTab('SCORES');
      setActiveRoomTab('ALL'); 
      setLoadingQuestions(true);
      try {
          const qData = await getQuestionsByAssignment(a.id);
          setExamQuestions(qData);
      } catch (e) { console.error(e); } finally { setLoadingQuestions(false); }
  };

  const handleOnetGenerateQuestions = async () => {
      if (!hasApiKey && !localStorage.getItem('MST_CUSTOM_GEMINI_KEY')) {
          alert("กรุณาตั้งค่า API Key ส่วนตัวที่หน้าโปรไฟล์ของคุณครูก่อนครับ");
          await handleSelectApiKey();
          return;
      }
      if (!assignSubject || !assignAiTopic) return alert("กรุณาเลือกวิชาและระบุหัวข้อเรื่อง");
      
      setIsGeneratingAi(true);
      try {
          const catStyle = (onetLevel === 'P3') ? 'nt' : 'onet';
          const generated = await generateQuestionWithAI(assignSubject, onetLevel || 'P6', assignAiTopic, 5, catStyle as any);
          if (generated) setNewlyGeneratedQuestions(prev => [...prev, ...generated]);
      } catch (e: any) { alert(e.message); } finally { setIsGeneratingAi(false); }
  };

  const handleFinalizeOnet = async () => {
      if (newlyGeneratedQuestions.length === 0) return;
      if (!assignDeadline) return alert("กรุณาระบุวันกำหนดส่ง");
      
      setIsProcessing(true);
      try {
          const tid = normalizeId(teacher.id);
          const isNT = onetLevel === 'P3';
          const label = isNT ? 'NT' : 'O-NET';
          const finalSubjectName = `${label} ${assignSubject}`; 
          const finalTitle = `[${label}] ${assignTitle || `ฝึกฝน${assignSubject} เรื่อง${assignAiTopic}`}`;
          const cat = isNT ? 'NT' : 'ONET';
          
          const res = await addAssignment(teacher.school, finalSubjectName, onetLevel || 'P6', newlyGeneratedQuestions.length, assignDeadline, teacher.name, finalTitle, undefined, undefined, cat as any);
          
          if (res.id) {
              for (const q of newlyGeneratedQuestions) {
                  await addQuestion({ 
                      subject: finalSubjectName, 
                      grade: onetLevel || 'P6', 
                      text: q.text, image: q.image || '', 
                      c1: q.c1, c2: q.c2, c3: q.c3, c4: q.c4, 
                      correct: q.correct, explanation: q.explanation, 
                      school: teacher.school, teacherId: tid, assignmentId: res.id
                  });
              }
              alert(`✅ สร้างชุดข้อสอบ ${label} เรียบร้อย`);
              setNewlyGeneratedQuestions([]); setAssignTitle(''); setAssignAiTopic(''); loadInitialData();
          }
      } catch (e: any) { alert("Error: " + e.message); } finally { setIsProcessing(false); }
  };

  const handleDownloadOnetTemplate = () => {
    const templateData = [
      ["โจทย์", "ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4", "ข้อที่ถูก (1-4)", "คำอธิบายเฉลย"],
      ["ตัวอย่าง: 5 + 5 เท่ากับเท่าไหร่?", "8", "9", "10", "11", "3", "เพราะ 5 บวก 5 ได้ผลลัพธ์คือ 10"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam_Template");
    XLSX.writeFile(wb, "MST_Exam_Template.xlsx");
  };

  const handleOnetExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows = data.slice(1);
        const imported: GeneratedQuestion[] = rows.filter((row: any) => row[0] && row[1]).map((row: any) => ({
            text: String(row[0]), c1: String(row[1] || ''), c2: String(row[2] || ''), c3: String(row[3] || ''),
            c4: String(row[4] || ''), correct: String(row[5] || '1'), explanation: String(row[6] || ''), image: ''
        }));
        if (imported.length > 0) { 
            setNewlyGeneratedQuestions(prev => [...prev, ...imported]); 
            alert(`✅ นำเข้าสำเร็จ ${imported.length} ข้อ`); 
        }
        else alert("❌ ไม่พบข้อมูลที่ถูกต้อง");
      } catch (err) { alert("❌ เกิดข้อผิดพลาดในการอ่านไฟล์"); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteAssignmentItem = async (id: string) => {
      if (!confirm('ยืนยันลบชุดข้อสอบรายการนี้?')) return;
      await deleteAssignment(id);
      loadInitialData();
  };

  const relevantClassrooms = useMemo(() => {
      if (!selectedOnetForModal) return [];
      return allClassrooms
        .filter(c => c.gradeLevel === selectedOnetForModal.grade)
        .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
  }, [selectedOnetForModal, allClassrooms]);

  return (
    <div className="max-w-7xl mx-auto pb-20 relative font-prompt">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white">
                    <img 
                        src="https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png" 
                        alt="PST" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"> ห้องพักครู Pratom Smart Tutor</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-indigo-100">{teacher.school}</span>
                        <span className="text-slate-500 text-sm font-medium">{teacher.name} {teacher.position && `(${teacher.position})`}</span>
                    </div>
                </div>
            </div>
            <button onClick={onLogout} className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 p-3 rounded-2xl transition-all shadow-sm border border-slate-200 active:scale-95 group">
                <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
        </div>

        {activeTab === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isExecutive && (
                    <MenuCard 
                        icon={<LineChart size={32}/>} 
                        title="สรุปผลสำหรับผู้บริหาร" 
                        desc="สถิติการเรียนรู้และการเข้าใช้งาน" 
                        color="from-slate-800 to-slate-900 shadow-slate-200 border-indigo-50" 
                        onClick={()=>setActiveTab('executive')}
                    />
                )}
                
                <MenuCard icon={<User size={32}/>} title="ข้อมูลของฉัน" desc="แก้ไขประวัติ/API Key" color="from-blue-500 to-indigo-600 shadow-indigo-100" onClick={()=>setActiveTab('profile')}/>
                {(isAdminUser || isExecutive) && <MenuCard icon={<Settings size={32}/>} title="ตั้งค่าโรงเรียน" desc="จัดการนักเรียน/ครู/ห้องเรียน" color="from-cyan-500 to-blue-500 shadow-cyan-100" onClick={()=>setActiveTab('school-settings')}/>}
                <MenuCard icon={<List size={32}/>} title="จัดการรายวิชา" desc="เพิ่ม/ลบ วิชาที่สอน" color="from-rose-500 to-pink-600 shadow-pink-100" onClick={()=>setActiveTab('subjects')}/>
                <MenuCard icon={<UserPlus size={32}/>} title="จัดการนักเรียน" desc="รายชื่อและข้อมูลนักเรียน" color="from-purple-500 to-indigo-600 shadow-purple-100" onClick={()=>setActiveTab('students')}/>
                <MenuCard icon={<Calendar size={32}/>} title="สั่งการบ้าน" desc="มอบหมายงานและติดตาม" color="from-orange-500 to-amber-600 shadow-orange-100" onClick={()=>setActiveTab('assignments')}/>
                <MenuCard icon={<BarChart2 size={32}/>} title="ดูผลคะแนน" desc="สถิติการสอบรายบุคคล" color="from-emerald-500 to-teal-600 shadow-emerald-100" onClick={()=>setActiveTab('stats')}/>
                <MenuCard icon={<FileText size={32}/>} title="คลังข้อสอบ" desc="จัดการข้อสอบในระบบ" color="from-sky-500 to-blue-600 shadow-sky-100" onClick={()=>setActiveTab('questions')}/>
                <MenuCard icon={<Gamepad2 size={32}/>} title="Game Room" desc="ห้องแข่งขัน Real-time" color="from-yellow-400 to-orange-500 shadow-yellow-100" onClick={onStartGame}/>
                {canAccessOnet && <MenuCard icon={<Trophy size={32}/>} title="ติวเข้ม NT/O-NET" desc="สร้างข้อสอบติว (ป.3/ป.6/ม.3)" color="from-indigo-600 to-violet-800 shadow-indigo-200" onClick={()=>setActiveTab('onet')}/>}
            </div>
        )}

        {activeTab !== 'menu' && (
            <div className="bg-white rounded-[40px] p-6 md:p-8 shadow-sm border border-slate-200 min-h-[600px]">
                <button onClick={() => { setActiveTab('menu'); setOnetLevel(null); }} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition font-black text-sm uppercase tracking-widest group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform"/> กลับเมนูหลัก
                </button>

                {activeTab === 'executive' && <ExecutiveDashboard teacher={teacher} students={students} stats={stats} />}
                {activeTab === 'profile' && <ProfileManager teacher={teacher} onUpdate={handleProfileRefresh} />}
                {activeTab === 'students' && <StudentManager students={students} teacher={teacher} canManageAll={canManageAll} schoolSettings={schoolInfo} isDirector={isExecutive} onRefresh={loadInitialData} />}
                {activeTab === 'subjects' && <SubjectManager subjects={availableSubjects} teacher={teacher} canManageAll={canManageAll} myGrades={GRADES} onRefresh={loadInitialData}/>}
                {activeTab === 'questions' && <QuestionBank subjects={availableSubjects} teacher={teacher} canManageAll={canManageAll} myGrades={GRADES} hasApiKey={hasApiKey} onSelectApiKey={handleSelectApiKey} />}
                {activeTab === 'assignments' && <AssignmentManager assignments={assignments} subjects={availableSubjects} students={students} stats={stats} teacher={teacher} onRefresh={loadInitialData}/>}
                {activeTab === 'stats' && <StatsViewer students={students} stats={stats} availableSubjects={availableSubjects} canManageAll={canManageAll} myGrades={GRADES} teacher={teacher} onRefresh={loadInitialData}/>}

                {activeTab === 'school-settings' && (
                    <div className="animate-fade-in max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 ml-2">
                                <Settings className="text-cyan-600" size={24}/> ตั้งค่าโรงเรียน
                            </h3>
                            <div className="bg-white p-1 rounded-2xl flex w-full md:w-auto shadow-sm border border-slate-100">
                                <button onClick={() => setSettingsTab('students')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${settingsTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><UserPlus size={16}/> จัดการนักเรียน</button>
                                <button onClick={() => setSettingsTab('classrooms')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${settingsTab === 'classrooms' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={16}/> ห้องเรียน</button>
                                <button onClick={() => setSettingsTab('teachers')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${settingsTab === 'teachers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><UserCog size={16}/> บุคลากรครู</button>
                            </div>
                        </div>

                        {settingsTab === 'students' && isAdminUser && (
                            <div className="mb-8 bg-indigo-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden group border-b-8 border-indigo-700">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700"><ShieldCheck size={120}/></div>
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                    <div className="max-w-xl">
                                        <h4 className="text-2xl font-black mb-2 flex items-center gap-3">สิทธิ์การจัดการข้อมูลนักเรียน</h4>
                                        <p className="text-indigo-200 font-medium text-sm leading-relaxed">
                                            หากโรงเรียนมีนักเรียนจำนวนมาก Admin สามารถเปิดสิทธิ์นี้เพื่อให้คุณครูประจำชั้นหรือคุณครูคนอื่นๆ ช่วยเพิ่มข้อมูลนักเรียนเข้าสู่ระบบได้ และสามารถปิดสิทธิ์ได้ทันทีเมื่อตรวจสอบข้อมูลครบถ้วนแล้ว
                                        </p>
                                    </div>
                                    <button 
                                        onClick={toggleStudentManagementSms}
                                        disabled={isProcessing}
                                        className={`px-8 py-4 rounded-3xl font-black flex items-center gap-3 transition-all active:scale-95 shadow-2xl ${schoolInfo?.allowAllManageStudents ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'}`}
                                    >
                                        {isProcessing ? <RefreshCw className="animate-spin" size={24}/> : (schoolInfo?.allowAllManageStudents ? <ToggleRight size={32}/> : <ToggleLeft size={32}/>)}
                                        <span className="text-lg">{schoolInfo?.allowAllManageStudents ? 'เปิดสิทธิ์อยู่' : 'ปิดสิทธิ์'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {settingsTab === 'students' ? (
                            <StudentManager students={students} teacher={teacher} canManageAll={!!isAdminUser} schoolSettings={schoolInfo} isDirector={!!isExecutive} onRefresh={loadInitialData} />
                        ) : settingsTab === 'classrooms' ? (
                            <ClassroomManager teacher={teacher} />
                        ) : (
                            <TeacherManager schoolName={teacher.school} currentAdminId={String(teacher.id)} />
                        )}
                    </div>
                )}

                {activeTab === 'onet' && (
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        {onetLevel && (
                            <div className="flex flex-wrap gap-2 mb-8 bg-slate-100 p-1.5 rounded-[22px] w-fit shadow-inner">
                                <button 
                                    disabled={!showNT}
                                    onClick={() => { setOnetLevel('P3'); setNewlyGeneratedQuestions([]); }}
                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${onetLevel === 'P3' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <BookOpen size={16}/> NT ป.3
                                </button>
                                <button 
                                    disabled={!showOnetP6}
                                    onClick={() => { setOnetLevel('P6'); setNewlyGeneratedQuestions([]); }}
                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${onetLevel === 'P6' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <GraduationCap size={16}/> O-NET ป.6
                                </button>
                                <button 
                                    disabled={!showOnetM3}
                                    onClick={() => { setOnetLevel('M3'); setNewlyGeneratedQuestions([]); }}
                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${onetLevel === 'M3' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Medal size={16}/> O-NET ม.3
                                </button>
                            </div>
                        )}

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-2"><Trophy className="text-yellow-500" size={28}/> ระบบเตรียมสอบ NT และ O-NET</h3>
                            <div className="text-xs bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full border border-indigo-100 font-black uppercase tracking-widest">Blueprint 60 - 67</div>
                        </div>

                        <div className="bg-blue-600 text-white p-5 rounded-[25px] mb-8 flex items-center gap-4 shadow-xl border-b-4 border-blue-900 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform"><Sparkles size={100}/></div>
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner"><Info size={24}/></div>
                            <div className="text-sm md:text-base font-bold leading-relaxed relative z-10">
                                <span className="text-yellow-300 font-black text-lg block mb-0.5">ประกาศจากระบบ AI อัจฉริยะ:</span>
                                ระบบ AI ได้นำแนวข้อสอบจริงตั้งแต่ <span className="underline decoration-yellow-300 decoration-4 underline-offset-4">ปี 2560 ถึง 2567</span> มาวิเคราะห์และสร้างเป็นข้อสอบชุดนี้ และจะจัดเก็บไว้ใน <span className="text-yellow-300">คลังติวเข้มพิเศษ</span> โดยไม่ปนกับคลังปกติ
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[30px] p-6 text-white shadow-md mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b-4 border-black/10">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20"><TrendingUp size={32} className="text-white"/></div>
                                <div><h4 className="text-xl font-bold">สถิติเตรียมสอบระดับชาติ</h4><p className="text-indigo-100 text-sm font-medium">สรุปผลการเตรียมความพร้อมของนักเรียน</p></div>
                            </div>
                            <div className="flex gap-8 text-center">
                                <div><div className="text-3xl font-black">{onetStats.totalAssignments}</div><div className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">ชุดข้อสอบ</div></div>
                                <div><div className="text-3xl font-black text-yellow-300">{onetStats.averageScore}%</div><div className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">เฉลี่ยรวม</div></div>
                                <div><div className="text-3xl font-black">{onetStats.totalSubmissions}</div><div className="text-[10px] text-indigo-200 font-black uppercase tracking-widest">ส่งแล้ว</div></div>
                            </div>
                        </div>

                        {!onetLevel ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <button 
                                    disabled={!showNT}
                                    onClick={()=>setOnetLevel('P3')} 
                                    className={`p-8 rounded-[45px] border-b-8 shadow-sm transition-all text-left group relative overflow-hidden flex flex-col items-center justify-center text-center ${showNT ? 'bg-white border-emerald-100 hover:border-emerald-400 hover:shadow-2xl hover:-translate-y-1' : 'bg-slate-50 border-slate-200 grayscale cursor-not-allowed'}`}
                                >
                                    <div className={`p-5 rounded-[25px] mb-6 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6 ${showNT ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <BookOpen size={40}/>
                                    </div>
                                    <h4 className={`text-2xl font-black mb-2 ${showNT ? 'text-slate-800' : 'text-slate-400'}`}>NT (ป.3)</h4>
                                    <p className={`text-xs font-bold ${showNT ? 'text-slate-500' : 'text-slate-400'}`}>การประเมินคุณภาพผู้เรียนระดับชาติ</p>
                                </button>

                                <button 
                                    disabled={!showOnetP6}
                                    onClick={()=>setOnetLevel('P6')} 
                                    className={`p-8 rounded-[45px] border-b-8 shadow-sm transition-all text-left group relative overflow-hidden flex flex-col items-center justify-center text-center ${showOnetP6 ? 'bg-white border-indigo-100 hover:border-indigo-400 hover:shadow-2xl hover:-translate-y-1' : 'bg-slate-50 border-slate-200 grayscale cursor-not-allowed'}`}
                                >
                                    <div className={`p-5 rounded-[25px] mb-6 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6 ${showOnetP6 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <GraduationCap size={40}/>
                                    </div>
                                    <h4 className={`text-2xl font-black mb-2 ${showOnetP6 ? 'text-slate-800' : 'text-slate-400'}`}>O-NET (ป.6)</h4>
                                    <p className={`text-xs font-bold ${showOnetP6 ? 'text-slate-500' : 'text-slate-400'}`}>ทดสอบทางการศึกษาระชาติ</p>
                                </button>

                                <button 
                                    disabled={!showOnetM3}
                                    onClick={()=>setOnetLevel('M3')} 
                                    className={`p-8 rounded-[45px] border-b-8 shadow-sm transition-all text-left group relative overflow-hidden flex flex-col items-center justify-center text-center ${showOnetM3 ? 'bg-white border-purple-100 hover:border-purple-400 hover:shadow-2xl hover:-translate-y-1' : 'bg-slate-50 border-slate-200 grayscale cursor-not-allowed'}`}
                                >
                                    <div className={`p-5 rounded-[25px] mb-6 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6 ${showOnetM3 ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Medal size={40}/>
                                    </div>
                                    <h4 className={`text-2xl font-black mb-2 ${showOnetM3 ? 'text-slate-800' : 'text-slate-400'}`}>O-NET (ม.3)</h4>
                                    <p className={`text-xs font-bold ${showOnetM3 ? 'text-slate-500' : 'text-slate-400'}`}>เตรียมความพร้อมสู่มัธยมปลาย</p>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                <div className="lg:col-span-4">
                                    <div className="bg-white p-6 rounded-[30px] border border-indigo-100 shadow-sm sticky top-6">
                                        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6 text-center">
                                            <div className="flex items-center justify-center gap-2 mb-3 text-indigo-700 font-black text-xs uppercase tracking-widest"><KeyRound size={18}/> Gemini AI Status</div>
                                            <button onClick={handleSelectApiKey} className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${hasApiKey || !!localStorage.getItem('MST_CUSTOM_GEMINI_KEY') ? 'bg-green-600 text-white shadow-sm' : 'bg-yellow-500 text-white shadow-md animate-pulse'}`}>
                                                {hasApiKey || !!localStorage.getItem('MST_CUSTOM_GEMINI_KEY') ? <><CheckCircle size={16}/> AI พร้อมใช้งาน</> : <><KeyRound size={16}/> เลือก API Key</>}
                                            </button>
                                        </div>

                                        <div className="space-y-5">
                                            <div><label className="text-base font-black text-slate-400 mb-2 block uppercase tracking-widest">1. ตั้งชื่อหัวข้อทดสอบ</label><input type="text" value={assignTitle} onChange={e=>setAssignTitle(e.target.value)} placeholder="เช่น ติวเข้มสมการ" className="p-3.5 border-2 border-slate-50 rounded-2xl w-full bg-slate-50 focus:bg-white focus:border-indigo-200 outline-none transition text-base font-bold shadow-inner"/></div>
                                            <div>
                                                <label className="text-base font-black text-slate-400 mb-2 block uppercase tracking-widest">2. เลือกวิชา</label>
                                                <select value={assignSubject} onChange={e=>setAssignSubject(e.target.value)} className="p-3.5 border-2 border-slate-50 rounded-2xl w-full bg-slate-50 focus:bg-white focus:border-indigo-200 outline-none transition text-base font-bold">
                                                    <option value="">-- เลือกวิชา --</option>
                                                    {(onetLevel === 'P3' ? NT_SUBJECTS : ONET_SUBJECTS).map(s=><option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div><label className="text-base font-black text-slate-400 mb-2 block uppercase tracking-widest">3. เรื่องย่อย (Topic)</label><input type="text" value={assignAiTopic} onChange={e=>setAssignAiTopic(e.target.value)} placeholder="เช่น ระบบหายใจ, เศษส่วน" className="p-3.5 border-2 border-slate-50 rounded-2xl w-full bg-slate-50 focus:bg-white focus:border-indigo-200 outline-none transition text-base font-bold shadow-inner"/></div>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={handleOnetGenerateQuestions} disabled={isGeneratingAi || !assignAiTopic} className="bg-indigo-600 text-white px-4 py-4 rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 shadow-lg transition active:scale-95 flex flex-col items-center justify-center gap-1 text-xs border-b-4 border-indigo-900">
                                                    {isGeneratingAi ? <RefreshCw className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                                                    {newlyGeneratedQuestions.length > 0 ? 'เพิ่มอีก 5 ข้อ' : 'AI ช่วยออกข้อสอบ'}
                                                </button>
                                                <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 text-white px-4 py-4 rounded-2xl font-black hover:bg-emerald-700 shadow-lg transition active:scale-95 flex items-center justify-center gap-1 text-xs border-b-4 border-emerald-900">
                                                    <UploadCloud size={20}/> นำเข้า Excel
                                                </button>
                                                <input type="file" ref={fileInputRef} onChange={handleOnetExcelUpload} accept=".xlsx, .xls" className="hidden" />
                                            </div>
                                            
                                            <div className="pt-2">
                                                <button onClick={handleDownloadOnetTemplate} className="w-full text-indigo-600 text-sm font-black py-2 hover:bg-indigo-50 rounded-xl transition uppercase tracking-widest flex items-center justify-center gap-2"><Download size={16}/> ดาวน์โหลด Template.xlsx</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="lg:col-span-8 space-y-6">
                                    {newlyGeneratedQuestions.length > 0 && (
                                        <div className="bg-white p-6 rounded-[35px] border-2 border-green-100 shadow-xl animate-slide-up relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
                                                <h5 className="font-black text-green-800 flex items-center gap-2 text-lg uppercase tracking-tight"><CheckCircle size={24}/> ตรวจสอบโจทย์ ({newlyGeneratedQuestions.length} ข้อ)</h5>
                                                <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                                                    <input type="date" value={assignDeadline} onChange={e=>setAssignDeadline(e.target.value)} className="border-2 border-green-100 rounded-xl p-2 text-sm flex-1 sm:flex-none font-black outline-none bg-slate-50 focus:bg-white transition"/>
                                                    <button onClick={handleFinalizeOnet} disabled={isProcessing} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-black hover:bg-green-700 disabled:opacity-50 text-sm shadow-xl flex-1 sm:flex-none active:scale-95 transition border-b-4 border-green-800">บันทึกและส่งภารกิจ</button>
                                                </div>
                                            </div>
                                            <div className="max-h-[450px] overflow-y-auto space-y-4 bg-slate-50/50 p-4 rounded-[25px] border border-slate-100 custom-scrollbar shadow-inner">
                                                {newlyGeneratedQuestions.map((q,i)=>(
                                                    <div key={i} className="text-base bg-white p-5 rounded-2xl border border-green-100 shadow-sm relative group hover:border-indigo-200 transition-all">
                                                        <button onClick={() => setNewlyGeneratedQuestions(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 p-1.5 text-slate-200 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                                        <div className="font-black text-slate-800 mb-3 leading-relaxed pr-8">{i+1}. {q.text}</div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm text-slate-500 font-bold pl-4 border-l-2 border-slate-100">
                                                            <div className={q.correct === '1' ? 'text-green-600 font-black' : ''}>1. {q.c1}</div>
                                                            <div className={q.correct === '2' ? 'text-green-600 font-black' : ''}>2. {q.c2}</div>
                                                            <div className={q.correct === '3' ? 'text-green-600 font-black' : ''}>3. {q.c3}</div>
                                                            <div className={q.correct === '4' ? 'text-green-600 font-black' : ''}>4. {q.c4}</div>
                                                        </div>
                                                        <div className="text-sm text-indigo-600 font-black italic border-t pt-2 border-slate-50 flex items-center gap-2"><Info size={16}/> เฉลย: {q.explanation}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-[35px] border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-6 bg-slate-50 border-b border-slate-100 font-black text-slate-700 flex items-center gap-3 text-lg"><List size={22} className="text-indigo-600"/> รายการชุดติว ในโรงเรียน</div>
                                        {onetStats.myOnetAssignments.length === 0 ? (
                                            <div className="p-20 text-center text-slate-300 font-black text-lg italic flex flex-col items-center gap-3"><Trophy size={48} className="opacity-10"/> ยังไม่มีประวัติการสร้างชุดติว</div>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {onetStats.myOnetAssignments.slice().reverse().map(a => (
                                                    <div key={a.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition group gap-4">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-black text-slate-800 text-lg leading-tight truncate">{a.title}</div>
                                                            <div className="text-sm text-slate-400 flex gap-4 mt-2 font-black uppercase tracking-wider">
                                                                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{a.subject}</span>
                                                                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{a.questionCount} ข้อ</span>
                                                                <span className="flex items-center gap-1 text-orange-600"><Clock size={14}/> {new Date(a.deadline).toLocaleDateString('th-TH')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button onClick={() => handleOnetDuplicate(a)} className="bg-green-50 text-green-600 p-2.5 rounded-xl hover:bg-green-600 hover:text-white transition shadow-sm" title="ทำซ้ำโจทย์ชุดเดิม"><Copy size={20}/></button>
                                                            <button onClick={() => handleOpenOnetStats(a)} className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition shadow-sm" title="ดูสถิติคะแนน"><Eye size={20}/></button>
                                                            <button onClick={() => handleDeleteAssignmentItem(a.id)} className="bg-red-50 text-red-500 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition shadow-sm"><Trash2 size={20}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* Modal for O-NET Details */}
        {selectedOnetForModal && createPortal(
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-prompt">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-black text-2xl text-slate-800 leading-tight">{selectedOnetForModal.title}</h3>
                            <p className="text-base text-slate-400 font-black mt-1 uppercase tracking-widest">
                                เตรียมสอบ • {selectedOnetForModal.subject} • ชั้น {GRADE_LABELS[selectedOnetForModal.grade || ''] || selectedOnetForModal.grade}
                            </p>
                        </div>
                        <button onClick={() => setSelectedOnetForModal(null)} className="text-slate-400 hover:text-red-500 transition p-2 rounded-full"><X size={28}/></button>
                    </div>

                    <div className="flex bg-slate-100 p-1 mx-8 mt-4 rounded-2xl w-fit">
                        <button onClick={() => setModalTab('SCORES')} className={`px-6 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${modalTab === 'SCORES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Users size={18}/> คะแนนนักเรียน</button>
                        <button onClick={() => setModalTab('QUESTIONS')} className={`px-6 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${modalTab === 'QUESTIONS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><FileText size={18}/> โจทย์ทั้งหมด</button>
                    </div>

                    <div className="p-0 flex-1 overflow-auto bg-white custom-scrollbar">
                        {modalTab === 'SCORES' ? (
                            <div className="flex flex-col h-full">
                                <div className="px-8 pt-4 pb-2 border-b bg-white sticky top-0 z-10">
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            onClick={() => setActiveRoomTab('ALL')} 
                                            className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${activeRoomTab === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            ทุกห้อง ({students.filter(s => s.grade === selectedOnetForModal.grade).length})
                                        </button>
                                        {relevantClassrooms.map(room => {
                                            const roomCount = students.filter(s => s.grade === selectedOnetForModal.grade && s.classroom === room.roomNumber).length;
                                            return (
                                                <button 
                                                    key={room.id}
                                                    onClick={() => setActiveRoomTab(room.roomNumber)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${activeRoomTab === room.roomNumber ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    ห้อง {room.roomNumber} ({roomCount})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <table className="w-full text-base text-left">
                                    <thead className="bg-slate-50 text-slate-400 font-black sticky top-0 shadow-sm uppercase text-sm tracking-widest">
                                        <tr><th className="p-6">รายชื่อนักเรียน</th><th className="p-6 text-center">ห้อง</th><th className="p-6 text-right">ผลคะแนน</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students
                                            .filter(s => s.grade === selectedOnetForModal.grade && (activeRoomTab === 'ALL' || s.classroom === activeRoomTab))
                                            .map(s => { 
                                                const r = stats.filter(res => String(res.studentId) === String(s.id) && res.assignmentId === selectedOnetForModal.id).sort((a,b)=>b.score - a.score)[0];
                                                return (
                                                    <tr key={s.id} className="hover:bg-slate-50 transition">
                                                        <td className="p-6 flex items-center gap-4">
                                                            <span className="text-3xl bg-slate-100 p-1.5 rounded-xl">{s.avatar}</span>
                                                            <div>
                                                                <span className="font-black text-slate-700 text-lg">{s.name}</span>
                                                                <div className="text-sm text-slate-400 font-bold uppercase tracking-tight">ID: {s.id}</div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-center text-slate-500 font-black">{GRADE_LABELS[s.grade || '']}/{s.classroom}</td>
                                                        <td className="p-6 text-right font-black">
                                                            {r ? <div className="flex flex-col items-end">
                                                                <span className="text-2xl text-indigo-600">{r.score}/{r.totalQuestions}</span>
                                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase font-black">{Math.round((r.score/r.totalQuestions)*100)}% Success</span>
                                                            </div> : <span className="text-slate-200 text-base font-bold italic">ยังไม่ส่งภารกิจ</span>}
                                                        </td>
                                                    </tr> 
                                                ) 
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 space-y-6">
                                {loadingQuestions ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
                                        <Loader2 className="animate-spin mb-4" size={56}/>
                                        <p className="font-black text-xl">กำลังโหลดข้อมูลโจทย์...</p>
                                    </div>
                                ) : examQuestions.length === 0 ? (
                                    <div className="text-center py-20 text-slate-300 italic font-black">ไม่พบข้อมูลโจทย์ในชุดนี้</div>
                                ) : (
                                    examQuestions.map((q, idx) => (
                                        <div key={q.id} className="p-6 bg-slate-50 rounded-[30px] border border-slate-200 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-200"></div>
                                            <div className="font-black text-slate-800 text-lg mb-4 leading-relaxed">{idx + 1}. {q.text}</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 pl-4 border-l-2 border-indigo-100/50">
                                                {q.choices.map((c, ci) => (
                                                    <div key={ci} className={`p-2.5 rounded-xl text-base font-bold flex items-center gap-3 ${String(ci+1) === String(q.correctChoiceId) ? 'bg-green-100 text-green-800 border border-green-200' : 'text-slate-600 bg-white border border-slate-100'}`}>
                                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${String(ci+1) === String(q.correctChoiceId) ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{ci + 1}</span>
                                                        {c.text}
                                                    </div>
                                                ))}
                                            </div>
                                            {q.explanation && (
                                                <div className="text-sm text-indigo-600 bg-indigo-50/50 p-4 rounded-2xl italic font-black flex items-start gap-2 border border-indigo-100">
                                                    <Info size={18} className="mt-0.5 flex-shrink-0"/>
                                                    <span>เฉลยอธิบาย: {q.explanation}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>, document.body
        )}
    </div>
  );
};

const MenuCard: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: string; onClick: () => void }> = ({ icon, title, desc, color, onClick }) => (
    <button onClick={onClick} className={`p-6 rounded-[35px] border-none text-left transition-all hover:-translate-y-2 shadow-lg hover:shadow-2xl flex flex-col items-start gap-4 text-white relative overflow-hidden group bg-gradient-to-br ${color}`}>
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700"></div>
        
        {/* Icon Container */}
        <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl group-hover:rotate-12 transition-transform duration-500">
            {icon}
        </div>
        
        {/* Content */}
        <div className="relative z-10">
            <h3 className="text-xl font-black mb-1 drop-shadow-md">{title}</h3>
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">{desc}</p>
        </div>
        
        {/* Bottom Accent */}
        <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
            <ChevronRight size={24}/>
        </div>
    </button>
);

export default TeacherDashboard;
