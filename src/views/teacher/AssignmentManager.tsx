
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Assignment, Question, SubjectConfig, Teacher, Student, ExamResult, Classroom, AssignmentCategory } from '../../types';
import { 
  RefreshCw, BrainCircuit, Save, 
  Eye, Trash2, Loader2, Clock, X, FileText, 
  Sparkles, PlusCircle, History, 
  Users, Info, UploadCloud, Download, 
  Settings, ClipboardCheck, BookOpen, GraduationCap, Lock,
  Printer
} from 'lucide-react';
import { addAssignment, deleteAssignment, addQuestion, getQuestionsByAssignment, getClassrooms, getQuestionsBySubjectAndGrade, toggleAssignmentStatus } from '../../services/api';
import { generateQuestionWithAI, GeneratedQuestion } from '../../services/aiService';

// ประกาศ XLSX สำหรับระบบ Import
declare const XLSX: any;

interface AssignmentManagerProps {
  assignments: Assignment[];
  subjects: SubjectConfig[];
  students: Student[];
  stats: ExamResult[];
  teacher: Teacher;
  onRefresh: () => void;
}

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6', 
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
};

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ assignments, subjects, students, stats, teacher, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'CREATE' | 'HISTORY' | 'EXAMS'>('CREATE');

  // Exam Creator States
  const [showExamCreator, setShowExamCreator] = useState(false);
  const [examType, setExamType] = useState<'MIDTERM' | 'FINAL'>('MIDTERM');
  const [examTotalQuestions, setExamTotalQuestions] = useState(30);
  const [selectedUnitsForExam, setSelectedUnitsForExam] = useState<string[]>([]);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [examStatus, setExamStatus] = useState<'LOCKED' | 'OPEN'>('LOCKED');
  const [bankQuestionsForExam, setBankQuestionsForExam] = useState<Question[]>([]);
  const [loadingBankQuestions, setLoadingBankQuestions] = useState(false);

  // New interactive AI Exam states
  const [examCreatorMode, setExamCreatorMode] = useState<'AI_INTERACTIVE' | 'RANDOM_PICK'>('AI_INTERACTIVE');
  const [aiExamPrompt, setAiExamPrompt] = useState('');
  const [aiExamCount, setAiExamCount] = useState(10);
  const [draftAiQuestions, setDraftAiQuestions] = useState<(GeneratedQuestion & { unit?: string })[]>([]);
  const [accumulatedExamQuestions, setAccumulatedExamQuestions] = useState<(GeneratedQuestion & { unit?: string })[]>([]);
  const [isGeneratingAiExamDraft, setIsGeneratingAiExamDraft] = useState(false);

  // Print Preview States
  const [printAssignment, setPrintAssignment] = useState<Assignment | null>(null);
  const [printQuestions, setPrintQuestions] = useState<Question[]>([]);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [showAnswersInPrint, setShowAnswersInPrint] = useState(false);
  
  // Form States (Combined into one page)
  const [assignTitle, setAssignTitle] = useState('');
  const [assignSubject, setAssignSubject] = useState<string>('');
  const [assignGrade, setAssignGrade] = useState<string>(''); 
  const [assignCategory, setAssignCategory] = useState<AssignmentCategory>('GENERAL');
  const [assignTargetClassrooms, setAssignTargetClassrooms] = useState<string[]>([]);
  const [assignDeadline, setAssignDeadline] = useState('');
  const [allowRetake, setAllowRetake] = useState(false);
  
  const [assignAiTopic, setAssignAiTopic] = useState('');
  const [newlyGeneratedQuestions, setNewlyGeneratedQuestions] = useState<(GeneratedQuestion & { unit?: string })[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Question Bank
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail Modal States
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [modalTab, setModalTab] = useState<'SCORES' | 'QUESTIONS'>('SCORES');
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);

  useEffect(() => {
      const fetchRooms = async () => {
          const data = await getClassrooms(teacher.school);
          setAllClassrooms(data);
      };
      fetchRooms();
  }, [teacher.school]);

  const isDirector = useMemo(() => {
    const pos = teacher.position || '';
    const roles = (teacher.role || '').split(',');
    return roles.includes('DIRECTOR') || pos === 'ผู้อำนวยการโรงเรียน' || pos === 'รองผู้อำนวยการ';
  }, [teacher.position, teacher.role]);

  const availableGrades = useMemo(() => {
      if (isDirector) {
          return ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3'];
      }
      const g = new Set<string>();
      if (teacher.teachingClasses) {
          teacher.teachingClasses.forEach(c => g.add(c.split('/')[0]));
      }
      if (g.size === 0) return ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3'];
      return Array.from(g).sort();
  }, [teacher, isDirector]);

  useEffect(() => {
      if (availableGrades.length > 0 && !assignGrade) setAssignGrade(availableGrades[0]);
  }, [availableGrades]);

  const subjectsForGrade = useMemo(() => {
      return subjects.filter(s => {
          const isMySchool = String(s.school).trim() === String(teacher.school).trim();
          if (!isMySchool) return false;

          const matchesGrade = s.grade === assignGrade || s.grade === 'ALL';
          if (!matchesGrade) return false;

          if (isDirector) return true; // Director sees all subjects
          return String(s.teacherId).trim() === String(teacher.id).trim(); // normal teacher sees only their own
      });
  }, [subjects, assignGrade, teacher.id, teacher.school, isDirector]);

  useEffect(() => {
      if (subjectsForGrade.length > 0 && !subjectsForGrade.find(s => s.name === assignSubject)) {
          setAssignSubject(subjectsForGrade[0].name);
      }
  }, [subjectsForGrade]);

  const validRooms = useMemo(() => {
      return allClassrooms.filter(c => c.gradeLevel === assignGrade).map(c => c.roomNumber).sort((a,b) => Number(a)-Number(b));
  }, [assignGrade, allClassrooms]);

  const handleDownloadTemplate = () => {
    const templateData = [
      ["โจทย์", "ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4", "ข้อที่ถูก (1-4)", "คำอธิบาย"],
      ["1+1 เท่ากับเท่าไหร่?", "1", "2", "3", "4", "2", "เพราะ 1 บวก 1 ได้ 2"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "MST_Assignment_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const importedQuestions: GeneratedQuestion[] = rows.filter((row: any) => row[0] && row[1]).map((row: any) => ({
            text: String(row[0]), c1: String(row[1] || ''), c2: String(row[2] || ''), c3: String(row[3] || ''),
            c4: String(row[4] || ''), correct: String(row[5] || '1'), explanation: String(row[6] || ''), image: ''
        }));
        if (importedQuestions.length > 0) {
          setNewlyGeneratedQuestions(prev => [...prev, ...importedQuestions]);
          alert(`✅ นำเข้าสำเร็จ ${importedQuestions.length} ข้อ`);
        }
      } catch (err) { alert("❌ เกิดข้อผิดพลาดในการอ่านไฟล์"); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleOpenDetail = async (a: Assignment) => {
      setSelectedAssignment(a);
      setModalTab('SCORES');
      setLoadingQuestions(true);
      try {
          const qData = await getQuestionsByAssignment(a.id);
          setExamQuestions(qData);
      } catch (e) { console.error(e); } finally { setLoadingQuestions(false); }
  };

  const handleFinalizeAssignment = async () => {
      if (!assignTitle) return alert("กรุณาระบุหัวข้อการบ้าน");
      if (!assignSubject) return alert("กรุณาเลือกวิชา");
      if (assignTargetClassrooms.length === 0) return alert("กรุณาเลือกห้องเรียน");
      if (newlyGeneratedQuestions.length === 0) return alert("กรุณาเพิ่มโจทย์คำถาม");
      if (!assignDeadline) return alert("กรุณาระบุวันส่ง");
      
      setIsProcessing(true);
      const selectedIds = allClassrooms.filter(c => c.gradeLevel === assignGrade && assignTargetClassrooms.includes(c.roomNumber)).map(c => c.id);
      
      const assignmentRes = await addAssignment(
          teacher.school, assignSubject, assignGrade, newlyGeneratedQuestions.length, assignDeadline, teacher.name, assignTitle, assignTargetClassrooms, selectedIds, assignCategory
      );
      
      if (assignmentRes.id) {
          const tid = String(teacher.id || '');
          for (const q of newlyGeneratedQuestions) {
              await addQuestion({ 
                  subject: assignSubject, grade: assignGrade, text: q.text, image: q.image || '', 
                  c1: q.c1, c2: q.c2, c3: q.c3, c4: q.c4, correct: q.correct, explanation: q.explanation, 
                  school: teacher.school, teacherId: tid, assignmentId: assignmentRes.id,
                  targetClassrooms: assignTargetClassrooms, targetClassroomIds: selectedIds,
                  unit: q.unit
              });
          }
          alert('✅ บันทึกและมอบหมายงานเรียบร้อย');
          setNewlyGeneratedQuestions([]); setAssignTitle(''); setAssignAiTopic(''); setAssignTargetClassrooms([]); setAssignCategory('GENERAL');
          onRefresh();
          setActiveTab('HISTORY');
      } else { alert('เกิดข้อผิดพลาด: ' + assignmentRes.error); }
      setIsProcessing(false);
  };

  const handleAssignGenerateQuestions = async () => {
      if (!assignAiTopic) return alert("กรุณาระบุหัวข้อเรื่อง");
      setIsGeneratingAi(true);
      try {
          const existingData = await getQuestionsBySubjectAndGrade(assignSubject, assignGrade, teacher.school);
          const existingTexts = existingData.map(q => q.text).slice(0, 20);

          const generated = await generateQuestionWithAI(assignSubject, assignGrade, assignAiTopic, 5, 'normal', existingTexts);
          if (generated) {
              const withUnit = generated.map(q => ({ ...q, unit: assignAiTopic }));
              setNewlyGeneratedQuestions(prev => [...prev, ...withUnit]);
          }
      } catch (e: any) { alert("Error: " + e.message); } finally { setIsGeneratingAi(false); }
  };

  const handleOpenBank = async () => {
      if (!assignSubject || !assignGrade) return alert("กรุณาเลือกวิชาและระดับชั้นก่อน");
      setLoadingBank(true);
      setShowQuestionBank(true);
      try {
          const data = await getQuestionsBySubjectAndGrade(assignSubject, assignGrade, teacher.school);
          setBankQuestions(data);
      } catch (e) { console.error(e); } finally { setLoadingBank(false); }
  };

  const handleAddFromBank = () => {
      const selected = bankQuestions.filter(q => selectedBankIds.includes(q.id));
      const formatted = selected.map(q => ({
          text: q.text,
          image: q.image,
          c1: q.choices[0]?.text || '',
          c2: q.choices[1]?.text || '',
          c3: q.choices[2]?.text || '',
          c4: q.choices[3]?.text || '',
          correct: String(q.correctChoiceId),
          explanation: q.explanation,
          unit: q.unit
      }));
      setNewlyGeneratedQuestions(prev => [...prev, ...formatted]);
      setShowQuestionBank(false);
      setSelectedBankIds([]);
  };

  const countSubmitted = (assignmentId: string) => {
      return stats.filter(r => r.assignmentId === assignmentId).length;
  };

  const displayedAssignments = useMemo(() => {
      return assignments.filter(a => {
          const isMySchool = String(a.school || '').trim() === String(teacher.school).trim();
          if (!isMySchool) return false;
          
          if (isDirector) return true; // Director sees everything in the school
          return a.createdBy === teacher.name; // Normal teacher sees only their own
      });
  }, [assignments, isDirector, teacher.name, teacher.school]);

  const filteredSourceAssignments = useMemo(() => {
    return displayedAssignments.filter(a => 
      a.grade === assignGrade && 
      a.subject === assignSubject && 
      a.category === 'GENERAL'
    );
  }, [displayedAssignments, assignGrade, assignSubject]);

  useEffect(() => {
    if (showExamCreator && assignSubject && assignGrade) {
      const loadExamBankQuestions = async () => {
        setLoadingBankQuestions(true);
        try {
          const qs = await getQuestionsBySubjectAndGrade(assignSubject, assignGrade, teacher.school);
          setBankQuestionsForExam(qs);
        } catch (e) {
          console.error("Load Exam Bank Questions Error:", e);
        } finally {
          setLoadingBankQuestions(false);
        }
      };
      loadExamBankQuestions();
    }
  }, [showExamCreator, assignSubject, assignGrade, teacher.school]);

  const availableExamSources = useMemo(() => {
    const sourcesMap = new Map<string, { id: string, title: string, questionCount: number, type: 'ASSIGNMENT' | 'BANK_UNIT', questions: any[] }>();

    // 1. Add normal general assignments (homeworks) as sources
    filteredSourceAssignments.forEach(a => {
      sourcesMap.set(a.id, {
        id: a.id,
        title: a.title || a.subject || 'การบ้านเดิม',
        questionCount: a.questionCount || 0,
        type: 'ASSIGNMENT',
        questions: []
      });
    });

    // 2. Add units from the Question Bank questions of this subject/grade
    const groupedBank: Record<string, Question[]> = {};
    bankQuestionsForExam.forEach(q => {
      const uName = (q.unit || '').trim() || 'คำถามทั่วไปในคลังข้อสอบ';
      if (!groupedBank[uName]) {
        groupedBank[uName] = [];
      }
      groupedBank[uName].push(q);
    });

    Object.entries(groupedBank).forEach(([uName, qs]) => {
      const key = `bank_unit_${uName}`;
      sourcesMap.set(key, {
        id: key,
        title: `คลังข้อสอบ: ${uName}`,
        questionCount: qs.length,
        type: 'BANK_UNIT',
        questions: qs
      });
    });

    return Array.from(sourcesMap.values());
  }, [filteredSourceAssignments, bankQuestionsForExam]);

  const handleCreateBalancedExam = async () => {
    if (selectedUnitsForExam.length === 0) {
      alert('กรุณาเลือกหน่วยการเรียนรู้ที่ต้องการนำมาออกข้อสอบอย่างน้อย 1 หน่วยครับ');
      return;
    }
    if (assignTargetClassrooms.length === 0) {
      alert('กรุณาเลือกห้องเรียนที่ต้องการมอบหมายข้อสอบครับ');
      return;
    }

    setIsCreatingExam(true);
    try {
      const examTitle = `${examType === 'MIDTERM' ? 'สอบกลางภาค' : 'สอบปลายภาค'} - ${assignSubject} (${GRADE_LABELS[assignGrade]})`;
      const deadline = assignDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const selectedIds = allClassrooms.filter(c => c.gradeLevel === assignGrade && assignTargetClassrooms.includes(c.roomNumber)).map(c => c.id);

      const res = await addAssignment(
        teacher.school, assignSubject, assignGrade, examTotalQuestions, deadline, teacher.name, examTitle, assignTargetClassrooms, selectedIds, examType, examStatus
      );

      if (!res.id) {
        if (res.error?.includes('assignments_category_check')) {
          throw new Error('ฐานข้อมูลยังไม่รองรับหมวดหมู่ "กลางภาค" หรือ "ปลายภาค" กรุณาแจ้ง Admin ให้รัน SQL Migration เพื่ออัปเดต Check Constraint');
        }
        throw new Error(res.error || 'Failed to create assignment');
      }
      const newExamId = res.id;

      const allSourceQuestions: any[] = [];
      for (const sourceId of selectedUnitsForExam) {
        if (sourceId.startsWith('bank_unit_')) {
          const src = availableExamSources.find(s => s.id === sourceId);
          if (src) {
            allSourceQuestions.push(...src.questions.map(q => ({ ...q, source_unit: sourceId })));
          }
        } else {
          const unitQuestions = await getQuestionsByAssignment(sourceId);
          allSourceQuestions.push(...unitQuestions.map(q => ({ ...q, source_unit: sourceId })));
        }
      }

      const totalAvailable = allSourceQuestions.length;
      if (totalAvailable < examTotalQuestions) {
        const proceed = window.confirm(`จำนวนข้อสอบในหน่วยที่เลือกมีเพียง ${totalAvailable} ข้อ ซึ่งน้อยกว่าที่กำหนดไว้ (${examTotalQuestions} ข้อ) \n\nระบบจะใช้ข้อสอบที่มีทั้งหมดแทน คุณต้องการดำเนินการต่อหรือไม่?`);
        if (!proceed) {
          setIsCreatingExam(false);
          return;
        }
      }

      const questionsByUnit: Record<string, any[]> = {};
      selectedUnitsForExam.forEach(id => {
        questionsByUnit[id] = allSourceQuestions.filter(q => q.source_unit === id);
      });

      const finalQuestions: any[] = [];
      const perUnit = Math.floor(examTotalQuestions / selectedUnitsForExam.length);
      let remaining = examTotalQuestions % selectedUnitsForExam.length;

      selectedUnitsForExam.forEach(id => {
        const unitQs = questionsByUnit[id];
        const countToPick = perUnit + (remaining > 0 ? 1 : 0);
        if (remaining > 0) remaining--;

        const shuffled = [...unitQs].sort(() => 0.5 - Math.random());
        finalQuestions.push(...shuffled.slice(0, countToPick));
      });

      const tid = String(teacher.id || '');
      let addedCount = 0;
      let failCount = 0;
      let lastError = '';

      for (const q of finalQuestions) {
        try {
          const result = await addQuestion({
            subject: assignSubject,
            grade: assignGrade,
            text: q.text || '',
            image: q.image || '',
            c1: q.choices[0]?.text || '',
            c2: q.choices[1]?.text || '',
            c3: q.choices[2]?.text || '',
            c4: q.choices[3]?.text || '',
            correct: String(q.correctChoiceId || '1'),
            explanation: q.explanation || '',
            school: teacher.school,
            teacherId: tid,
            assignmentId: newExamId,
            targetClassrooms: assignTargetClassrooms,
            targetClassroomIds: selectedIds,
            unit: q.unit || q.topic || ''
          });
          if (result.success) {
            addedCount++;
          } else {
            failCount++;
            lastError = result.message || 'Unknown error';
          }
        } catch (e: any) {
          failCount++;
          lastError = e.message;
        }
      }

      if (failCount > 0) {
        alert(`✅ สร้างการสอบสำเร็จแล้ว\n\nเพิ่มข้อสอบสำเร็จ: ${addedCount} ข้อ\nล้มเหลว: ${failCount} ข้อ\nสาเหตุล่าสุด: ${lastError}`);
      } else {
        alert(`✅ สร้างการสอบแบบสุ่มสำเร็จแล้วครับ!\nเพิ่มข้อสอบทั้งหมด ${addedCount} ข้อ`);
      }
      setShowExamCreator(false);
      onRefresh();
    } catch (err: any) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsCreatingExam(false);
    }
  };

  const handleCreateAIExam = async () => {
    if (selectedUnitsForExam.length === 0) {
      alert('กรุณาเลือกหน่วยการเรียนรู้เพื่อเป็นแนวทางให้ AI ครับ');
      return;
    }
    if (assignTargetClassrooms.length === 0) {
      alert('กรุณาเลือกห้องเรียนที่ต้องการมอบหมายข้อสอบครับ');
      return;
    }

    setIsCreatingExam(true);
    try {
      const selectedUnitTitles = availableExamSources
        .filter(s => selectedUnitsForExam.includes(s.id))
        .map(s => s.title)
        .join(', ');

      const combinedTopic = `ข้อสอบ${examType === 'MIDTERM' ? 'กลางภาค' : 'ปลายภาค'} ครอบคลุมเนื้อหา: ${selectedUnitTitles}`;
      
      const aiQuestions = await generateQuestionWithAI(
        assignSubject,
        assignGrade,
        combinedTopic,
        examTotalQuestions,
        'exam'
      );

      if (!aiQuestions) throw new Error('AI ไม่สามารถสร้างข้อสอบได้ในขณะนี้');

      const examTitle = `${examType === 'MIDTERM' ? 'สอบกลางภาค (AI)' : 'สอบปลายภาค (AI)'} - ${assignSubject} (${GRADE_LABELS[assignGrade]})`;
      const deadline = assignDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const selectedIds = allClassrooms.filter(c => c.gradeLevel === assignGrade && assignTargetClassrooms.includes(c.roomNumber)).map(c => c.id);

      const res = await addAssignment(
        teacher.school, assignSubject, assignGrade, examTotalQuestions, deadline, teacher.name, examTitle, assignTargetClassrooms, selectedIds, examType, examStatus
      );

      if (!res.id) {
        if (res.error?.includes('assignments_category_check')) {
          throw new Error('ฐานข้อมูลยังไม่รองรับหมวดหมู่ "กลางภาค" หรือ "ปลายภาค" กรุณาแจ้ง Admin ให้รัน SQL Migration เพื่ออัปเดต Check Constraint');
        }
        throw new Error(res.error || 'Failed to create assignment');
      }
      const newExamId = res.id;

      const tid = String(teacher.id || '');
      let addedCount = 0;
      let failCount = 0;
      let lastError = '';

      for (const q of aiQuestions) {
        try {
          const result = await addQuestion({
            subject: assignSubject,
            grade: assignGrade,
            text: q.text || '',
            image: q.image || '',
            c1: q.c1,
            c2: q.c2,
            c3: q.c3,
            c4: q.c4,
            correct: q.correct,
            explanation: q.explanation,
            school: teacher.school,
            teacherId: tid,
            assignmentId: newExamId,
            targetClassrooms: assignTargetClassrooms,
            targetClassroomIds: selectedIds,
            unit: combinedTopic
          });
          if (result.success) {
            addedCount++;
          } else {
            failCount++;
            lastError = result.message || 'Unknown error';
          }
        } catch (e: any) {
          failCount++;
          lastError = e.message;
        }
      }

      if (failCount > 0) {
        alert(`✅ สร้างข้อสอบด้วย AI สำเร็จแล้วครับ\n\nเพิ่มสำเร็จ: ${addedCount} ข้อ\nล้มเหลว: ${failCount} ข้อ\nสาเหตุล่าสุด: ${lastError}`);
      } else {
        alert('✅ สร้างข้อสอบด้วย AI ครอบคลุมทุกหน่วยสำเร็จแล้วครับ!');
      }
      setShowExamCreator(false);
      onRefresh();
    } catch (err: any) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsCreatingExam(false);
    }
  };

  const handleGenerateDraftAIQuestions = async () => {
    if (!aiExamPrompt.trim()) {
      alert('กรุณากรอกคำสั่งหรือหัวข้อที่ต้องการออกข้อสอบก่อนครับ เช่น "การบวกเลขจำนวนไม่เกิน 10"');
      return;
    }
    if (!assignSubject) {
      alert('กรุณาเลือกวิชาที่ต้องการก่อนครับ');
      return;
    }
    if (!assignGrade) {
      alert('กรุณาเลือก ระดับชั้น ก่อนครับ');
      return;
    }

    setIsGeneratingAiExamDraft(true);
    try {
      const existingTexts = accumulatedExamQuestions.map(q => q.text);
      const aiQuestions = await generateQuestionWithAI(
        assignSubject,
        assignGrade,
        aiExamPrompt,
        aiExamCount,
        'exam',
        existingTexts
      );

      if (!aiQuestions || aiQuestions.length === 0) {
        throw new Error('AI ไม่สามารถออกข้อสอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ');
      }

      setDraftAiQuestions(aiQuestions);
    } catch (err: any) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsGeneratingAiExamDraft(false);
    }
  };

  const handleAddDraftToAccumulated = () => {
    if (draftAiQuestions.length === 0) return;
    setAccumulatedExamQuestions(prev => [
      ...prev,
      ...draftAiQuestions.map(q => ({
        ...q,
        unit: aiExamPrompt || 'หัวข้อทั่วไป'
      }))
    ]);
    setDraftAiQuestions([]);
    setAiExamPrompt('');
    alert(`✅ เพิ่มข้อสอบเข้ารายการสะสมเรียบร้อยแล้วครับ! ในชุดข้อสอบสะสมแล้ว ${accumulatedExamQuestions.length + draftAiQuestions.length} ข้อ\n\nคุณสามารถเปลี่ยนรายละเอียดคำสั่งเพื่อสร้างข้อสอบในส่วนถัดไปได้ทันทีครับ`);
  };

  const handleSaveAccumulatedExam = async () => {
    if (accumulatedExamQuestions.length === 0) {
      alert('กรุณาออกข้อสอบด้วย AI และสะสมข้อสอบอย่างน้อย 1 ข้อก่อนบันทึกครับ');
      return;
    }
    if (assignTargetClassrooms.length === 0) {
      alert('กรุณาเลือกห้องเรียนที่ต้องการมอบหมายข้อสอบก่อนครับ');
      return;
    }

    setIsCreatingExam(true);
    try {
      const examTitle = `${examType === 'MIDTERM' ? 'สอบกลางภาค (AI)' : 'สอบปลายภาค (AI)'} - ${assignSubject} (${GRADE_LABELS[assignGrade]})`;
      const deadline = assignDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const selectedIds = allClassrooms.filter(c => c.gradeLevel === assignGrade && assignTargetClassrooms.includes(c.roomNumber)).map(c => c.id);

      const res = await addAssignment(
        teacher.school, 
        assignSubject, 
        assignGrade, 
        accumulatedExamQuestions.length, 
        deadline, 
        teacher.name, 
        examTitle, 
        assignTargetClassrooms, 
        selectedIds, 
        examType, 
        examStatus
      );

      if (!res.id) {
        if (res.error?.includes('assignments_category_check')) {
          throw new Error('ฐานข้อมูลยังไม่รองรับหมวดหมู่ "กลางภาค" หรือ "ปลายภาค" กรุณาแจ้ง Admin');
        }
        throw new Error(res.error || 'Failed to create exam');
      }
      const newExamId = res.id;
      const tid = String(teacher.id || '');
      let addedCount = 0;
      let failCount = 0;
      let lastError = '';

      for (const q of accumulatedExamQuestions) {
        try {
          const result = await addQuestion({
            subject: assignSubject,
            grade: assignGrade,
            text: q.text || '',
            image: q.image || '',
            c1: q.c1,
            c2: q.c2,
            c3: q.c3,
            c4: q.c4,
            correct: q.correct,
            explanation: q.explanation,
            school: teacher.school,
            teacherId: tid,
            assignmentId: newExamId,
            targetClassrooms: assignTargetClassrooms,
            targetClassroomIds: selectedIds,
            unit: q.unit || 'ข้อสอบ AI'
          });
          if (result.success) {
            addedCount++;
          } else {
            failCount++;
            lastError = result.message || 'Unknown error';
          }
        } catch (e: any) {
          failCount++;
          lastError = e.message;
        }
      }

      if (failCount > 0) {
        alert(`✅ สร้างข้อสอบสำเร็จบางส่วนครับ\n\nบันทึกสำเร็จ: ${addedCount} ข้อ\nล้มเหลว: ${failCount} ข้อ\nสาเหตุล่าสุด: ${lastError}`);
      } else {
        alert(`🎉 บันทึกและจัดทำข้อสอบเรียบร้อยแล้วครับ! ทั้งหมด ${addedCount} ข้อ มอบหมายให้กับห้องเรียนแล้ว`);
      }

      // Reset
      setShowExamCreator(false);
      setAccumulatedExamQuestions([]);
      setDraftAiQuestions([]);
      setAiExamPrompt('');
      onRefresh();
    } catch (err: any) {
      alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsCreatingExam(false);
    }
  };

  const handleOpenPrintPreview = async (a: Assignment) => {
    setPrintAssignment(a);
    setLoadingPrint(true);
    setPrintQuestions([]);
    try {
      const qs = await getQuestionsByAssignment(a.id);
      setPrintQuestions(qs);
    } catch (err) {
      console.error("Load print questions error:", err);
    } finally {
      setLoadingPrint(false);
    }
  };

  const handlePrintAction = () => {
    if (!printAssignment || printQuestions.length === 0) return;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) return;

    const isMidterm = printAssignment.title?.includes('กลางภาค') || printAssignment.category === 'MIDTERM';
    const categoryLabel = isMidterm ? 'ข้อสอบกลางภาค' : 'ข้อสอบปลายภาค';
    const subjectName = printAssignment.subject;
    const gradeLabel = GRADE_LABELS[printAssignment.grade || 'ALL'] || printAssignment.grade;
    const schoolName = teacher.school;

    let questionsHtml = '';
    printQuestions.forEach((q, idx) => {
      const qAny = q as any;
      questionsHtml += `
        <div class="question-container" style="margin-bottom: 25px; page-break-inside: avoid;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${idx + 1}. ${qAny.text}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-left: 15px; margin-bottom: 15px;">
            <div style="font-size: 14px;">1) ${qAny.c1 || (qAny.choices && qAny.choices[0]?.text) || ''}</div>
            <div style="font-size: 14px;">2) ${qAny.c2 || (qAny.choices && qAny.choices[1]?.text) || ''}</div>
            <div style="font-size: 14px;">3) ${qAny.c3 || (qAny.choices && qAny.choices[2]?.text) || ''}</div>
            <div style="font-size: 14px;">4) ${qAny.c4 || (qAny.choices && qAny.choices[3]?.text) || ''}</div>
          </div>
          ${showAnswersInPrint ? `
            <div style="font-size: 13px; color: #16a34a; background-color: #f0fdf4; padding: 10px; border-radius: 8px; margin-left: 15px; border-left: 4px solid #16a34a; margin-top: 10px;">
              <b>เฉลย:</b> ข้อ ${qAny.correct || qAny.correctChoiceId} &nbsp;&nbsp;&bull;&nbsp;&nbsp; <b>คำอธิบาย:</b> ${qAny.explanation || 'ไม่มีคำอธิบายเพิ่มเติม'}
            </div>
          ` : ''}
        </div>
      `;
    });

    let answerKeyHtml = '';
    if (!showAnswersInPrint) {
      printQuestions.forEach((q, idx) => {
        const qAny = q as any;
        answerKeyHtml += `
          <span style="display: inline-block; width: 100px; margin-bottom: 10px; font-size: 14px;">
            ข้อ ${idx + 1}: ตอบ <b>${qAny.correct || qAny.correctChoiceId}</b>
          </span>
        `;
      });
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${categoryLabel} - ${subjectName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
          body {
            font-family: 'Sarabun', sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px double #cbd5e1;
            padding-bottom: 20px;
          }
          .school-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .exam-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .meta-info {
            font-size: 14px;
            color: #475569;
          }
          .student-fields {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            border-top: 1px dashed #e2e8f0;
            padding-top: 10px;
          }
          .answer-key-section {
            margin-top: 50px;
            border-top: 2px dashed #94a3b8;
            padding-top: 20px;
            page-break-before: always;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-title">${schoolName}</div>
          <div class="exam-title">${categoryLabel} - ${subjectName}</div>
          <div class="meta-info">ระดับชั้น: ${gradeLabel} &nbsp;&nbsp;&bull;&nbsp;&nbsp; จำนวนข้อสอบ: ${printQuestions.length} ข้อ &nbsp;&nbsp;&bull;&nbsp;&nbsp; ผู้สอน: ${teacher.name}</div>
          <div class="student-fields">
            <div style="flex: 2;">ชื่อ-นามสกุล: ............................................................................</div>
            <div style="flex: 1;">ชั้น: ..................</div>
            <div style="flex: 1;">เลขที่: ............</div>
          </div>
        </div>
        
        <div class="questions-list">
          ${questionsHtml}
        </div>
        
        ${!showAnswersInPrint ? `
          <div class="answer-key-section">
            <h3 style="margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">เฉลยข้อสอบ (สำหรับคุณครูนำไปทบทวน)</h3>
            <div style="display: flex; flex-wrap: wrap;">
              ${answerKeyHtml}
            </div>
          </div>
        ` : ''}
      </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(fullHtml);
    frameDoc.close();

    printFrame.contentWindow?.focus();
    setTimeout(() => {
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 500);
  };


  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-10 font-prompt">
        {/* Main Tab Navigation */}
        <div className="flex bg-slate-100 p-1.5 rounded-[22px] mb-8 w-fit shadow-inner">
            <button 
                onClick={() => setActiveTab('CREATE')} 
                className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'CREATE' ? 'bg-white text-orange-600 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
            >
                <PlusCircle size={18}/> มอบหมายงานใหม่
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')} 
                className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
            >
                <History size={18}/> รายการสั่งการบ้าน
            </button>
            <button 
                onClick={() => setActiveTab('EXAMS')} 
                className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'EXAMS' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
            >
                <GraduationCap size={18}/> สอบกลางภาค/ปลายภาค
            </button>
        </div>

        {activeTab === 'CREATE' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
                {/* 📝 Left side: Settings Card */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>
                        <h4 className="font-black text-xl text-slate-800 mb-6 flex items-center gap-3"><Settings className="text-orange-500" size={24}/> ตั้งค่าชุดการบ้าน</h4>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">หัวข้อการบ้าน</label>
                                <input type="text" value={assignTitle} onChange={e => setAssignTitle(e.target.value)} placeholder="ระบุชื่อชุดงาน เช่น ทบทวนบทที่ 1" className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-orange-400 focus:bg-white bg-slate-50 outline-none transition-all font-bold shadow-inner"/>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">ระดับชั้น</label>
                                    <select value={assignGrade} onChange={e => {setAssignGrade(e.target.value); setAssignTargetClassrooms([]);}} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-700 outline-none focus:border-orange-400">
                                        {availableGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g] || g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">วิชา</label>
                                    <select value={assignSubject} onChange={e => setAssignSubject(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-700 outline-none focus:border-orange-400">
                                        <option value="">-- เลือกวิชา --</option>
                                        {subjectsForGrade.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-1">มอบหมายให้ห้องเรียน</label>
                                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 shadow-inner max-h-40 overflow-y-auto custom-scrollbar">
                                    {validRooms.length > 0 ? validRooms.map(room => (
                                        <button 
                                            key={room} 
                                            onClick={() => setAssignTargetClassrooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room])}
                                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${assignTargetClassrooms.includes(room) ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'}`}
                                        >
                                            ห้อง {room}
                                        </button>
                                    )) : <p className="text-[10px] text-slate-500 italic font-bold">กรุณาเพิ่มห้องเรียนในระดับชั้นนี้ก่อน</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">กำหนดส่ง</label>
                                    <input type="date" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white font-bold text-slate-700 outline-none focus:border-orange-400"/>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button 
                                        onClick={() => setAllowRetake(!allowRetake)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${allowRetake ? 'bg-green-50 border-green-400 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase">ทำซ้ำได้</span>
                                        <div className={`w-8 h-4 rounded-full relative ${allowRetake ? 'bg-green-500' : 'bg-slate-300'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${allowRetake ? 'left-4.5' : 'left-0.5'}`}></div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-900 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={80}/></div>
                        <h5 className="font-black text-lg mb-4 flex items-center gap-2"><BrainCircuit className="text-indigo-400"/> เพิ่มโจทย์เข้าชุดงาน</h5>
                        
                        <div className="space-y-4">
                            <input type="text" value={assignAiTopic} onChange={e => setAssignAiTopic(e.target.value)} placeholder="ระบุหัวข้อเน้นย้ำ (AI จะช่วยร่างให้)" className="w-full p-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-indigo-300 font-bold outline-none focus:bg-white/20 transition"/>
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={handleAssignGenerateQuestions} disabled={isGeneratingAi || !assignAiTopic} className="bg-indigo-500 hover:bg-indigo-400 text-white p-4 rounded-2xl font-black text-xs flex flex-row items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 shadow-lg">
                                    {isGeneratingAi ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                                    สร้าง 5 ข้อ ด้วย AI
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={handleOpenBank} className="bg-white border-2 border-indigo-100 text-indigo-600 p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 transition hover:bg-indigo-50 active:scale-95 shadow-sm">
                                        <BookOpen size={20}/> คลังโจทย์เดิม
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 transition active:scale-95 shadow-lg">
                                        <UploadCloud size={20}/> นำเข้า Excel
                                    </button>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            <button onClick={handleDownloadTemplate} className="w-full text-center text-[10px] text-indigo-300 font-bold hover:underline py-1 flex items-center justify-center gap-1"><Download size={12}/> ดาวน์โหลดตัวอย่าง Excel</button>
                        </div>
                    </div>
                </div>

                {/* 📋 Right side: Questions Preview & Finalize */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-[50px] border border-slate-100 shadow-sm min-h-full flex flex-col overflow-hidden">
                        <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                            <div>
                                <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                                    <ClipboardCheck className="text-emerald-500" size={28}/> เนื้อหาการบ้าน ({newlyGeneratedQuestions.length} ข้อ)
                                </h4>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 ml-11">Review & Finalize Assignment</p>
                            </div>
                            {newlyGeneratedQuestions.length > 0 && (
                                <button onClick={() => setNewlyGeneratedQuestions([])} className="text-[10px] font-black text-red-500 hover:underline">ล้างทั้งหมด</button>
                            )}
                        </div>

                        <div className="p-8 flex-1 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {newlyGeneratedQuestions.length === 0 ? (
                                <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                                    <div className="bg-slate-50 p-10 rounded-[50px] mb-6 shadow-inner"><FileText size={80} className="opacity-20"/></div>
                                    <p className="font-black text-lg text-slate-500 italic">ยังไม่มีโจทย์คำถามในขณะนี้</p>
                                    <p className="text-xs font-bold text-slate-400 mt-2">กรุณาใช้ AI หรืออัปโหลด Excel จากแผงด้านซ้าย</p>
                                </div>
                            ) : (
                                newlyGeneratedQuestions.map((q, i) => (
                                    <div key={i} className="p-6 bg-slate-50 rounded-[35px] border-2 border-slate-100 group relative transition-all hover:bg-white hover:shadow-xl hover:border-indigo-100 animate-slide-up">
                                        <button onClick={() => setNewlyGeneratedQuestions(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={20}/></button>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">หน่วย: {q.unit || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div className="font-black text-slate-800 text-lg mb-4 pr-10">{i+1}. {q.text}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-500 pl-4 border-l-2 border-indigo-100 font-bold">
                                            <div className={q.correct === '1' ? 'text-emerald-600' : ''}>1. {q.c1}</div>
                                            {/* Fix: Changed q.code to q.correct and removed redundant label text */}
                                            <div className={q.correct === '2' ? 'text-emerald-600' : ''}>2. {q.c2}</div>
                                            <div className={q.correct === '3' ? 'text-emerald-600' : ''}>3. {q.c3}</div>
                                            <div className={q.correct === '4' ? 'text-emerald-600' : ''}>4. {q.c4}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {newlyGeneratedQuestions.length > 0 && (
                            <div className="p-8 border-t bg-white sticky bottom-0">
                                <button 
                                    onClick={handleFinalizeAssignment} 
                                    disabled={isProcessing}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-6 rounded-[30px] font-black text-2xl shadow-xl hover:shadow-green-100 transition active:scale-95 flex items-center justify-center gap-4 border-b-8 border-green-800"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" size={32}/> : <Save size={32}/>}
                                    บันทึกและมอบหมายงาน
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'HISTORY' && (
            <div className="bg-white rounded-[45px] border border-slate-100 shadow-sm overflow-hidden animate-slide-up">
                <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                    <h4 className="font-black text-xl text-slate-700 flex items-center gap-3"><History className="text-indigo-500" size={26}/> ประวัติการสั่งการบ้าน</h4>
                    <button onClick={onRefresh} className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm transition active:rotate-180 duration-500"><RefreshCw size={20}/></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white text-slate-400 font-black border-b uppercase tracking-widest text-[10px]">
                            <tr><th className="p-8">หัวข้อการบ้าน</th><th className="p-8 text-center">ระดับชั้น</th><th className="p-8 text-center">ส่งแล้ว</th><th className="p-8 text-right">จัดการ</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayedAssignments.filter(a => a.category === 'GENERAL' && !a.title?.startsWith('[O-NET]')).length === 0 && (
                                <tr><td colSpan={4} className="p-32 text-center text-slate-500 font-black italic text-lg">ยังไม่มีข้อมูลประวัติการสั่งการบ้าน</td></tr>
                            )}
                            {displayedAssignments.filter(a => a.category === 'GENERAL' && !a.title?.startsWith('[O-NET]')).slice().reverse().map((a) => {
                                const submittedCount = countSubmitted(a.id);
                                return (
                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-8">
                                            <div className="font-black text-slate-800 text-lg leading-tight">{a.title || a.subject}</div>
                                            <div className="text-xs text-slate-400 mt-2 font-bold flex items-center gap-4 uppercase tracking-tighter">
                                                <span className="flex items-center gap-1.5"><Clock size={14}/> ส่งภายใน {new Date(a.deadline).toLocaleDateString('th-TH')}</span>
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-indigo-500">{a.questionCount} ข้อ</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-black text-xs border border-indigo-100 shadow-sm">{GRADE_LABELS[a.grade || 'ALL'] || a.grade}</span>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="text-lg font-black text-slate-700">{submittedCount}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">นักเรียน</div>
                                            </div>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button onClick={() => handleOpenDetail(a)} className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl hover:bg-indigo-600 hover:text-white transition shadow-sm border border-indigo-100"><Eye size={22}/></button>
                                                <button onClick={async () => { if(confirm('ยืนยันลบชุดการบ้านนี้?')) { await deleteAssignment(a.id); onRefresh(); } }} className="bg-red-50 text-red-500 p-3.5 rounded-2xl hover:bg-red-500 hover:text-white transition shadow-sm border border-red-100"><Trash2 size={22}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'EXAMS' && (
            <div className="bg-white rounded-[45px] border border-slate-100 shadow-sm overflow-hidden animate-slide-up">
                <div className="p-8 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h4 className="font-black text-xl text-slate-700 flex items-center gap-3"><GraduationCap className="text-rose-500" size={26}/> รายการสอบกลางภาค / ปลายภาค</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-9">Midterm & Final Examination Management</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowExamCreator(true)}
                            className="bg-rose-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-rose-100 hover:scale-105 active:scale-95 transition-all"
                        >
                            <PlusCircle size={20}/> จัดทำข้อสอบใหม่
                        </button>
                        <button onClick={onRefresh} className="p-2.5 bg-white text-slate-400 hover:text-rose-600 rounded-2xl shadow-sm transition active:rotate-180 duration-500 border border-slate-100"><RefreshCw size={20}/></button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white text-slate-400 font-black border-b uppercase tracking-widest text-[10px]">
                            <tr><th className="p-8">หัวข้อสอบ</th><th className="p-8 text-center">ระดับชั้น</th><th className="p-8 text-center">ประเภท</th><th className="p-8 text-center">สถานะระบบสอบ</th><th className="p-8 text-center">ผู้เข้าสอบแล้ว</th><th className="p-8 text-right">จัดการ</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayedAssignments.filter(a => a.category === 'MIDTERM' || a.category === 'FINAL' || a.category === 'EXAM').slice().reverse().map((a) => {
                                const submittedCount = countSubmitted(a.id);
                                return (
                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-8">
                                            <div className="font-black text-slate-800 text-lg leading-tight">{a.title || a.subject}</div>
                                            <div className="text-xs text-slate-400 mt-2 font-bold flex items-center gap-4 uppercase tracking-tighter">
                                                <span className="flex items-center gap-1.5"><Clock size={14}/> ส่งภายใน {new Date(a.deadline).toLocaleDateString('th-TH')}</span>
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-rose-500">{a.questionCount} ข้อ</span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className="bg-rose-50 text-rose-700 px-4 py-1.5 rounded-full font-black text-xs border border-rose-100 shadow-sm">{GRADE_LABELS[a.grade || 'ALL'] || a.grade}</span>
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className={`px-4 py-1.5 rounded-full font-black text-xs border shadow-sm ${
                                                a.category === 'MIDTERM' 
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                            }`}>
                                                {a.category === 'MIDTERM' ? 'กลางภาค' : 'ปลายภาค'}
                                            </span>
                                        </td>
                                        <td className="p-8 text-center">
                                            <button 
                                                type="button"
                                                onClick={async () => {
                                                    await toggleAssignmentStatus(a.id, a.status || 'LOCKED');
                                                    onRefresh();
                                                }}
                                                className={`px-4 py-2 rounded-xl text-xs font-black border-2 flex items-center justify-center gap-1.5 mx-auto transition-all ${
                                                    a.status === 'LOCKED' 
                                                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                                                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                                }`}
                                            >
                                                {a.status === 'LOCKED' ? (
                                                    <><Lock size={12}/> ปิดระบบสอบ</>
                                                ) : (
                                                    <><Sparkles size={12}/> เปิดระบบสอบ</>
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-8 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="text-lg font-black text-slate-700">{submittedCount}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">นักเรียน</div>
                                            </div>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenPrintPreview(a)} 
                                                    className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl hover:bg-amber-600 hover:text-white transition shadow-sm border border-amber-100"
                                                    title="พิมพ์ข้อสอบสำหรับทบทวน"
                                                >
                                                    <Printer size={22}/>
                                                </button>
                                                <button onClick={() => handleOpenDetail(a)} className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl hover:bg-indigo-600 hover:text-white transition shadow-sm border border-indigo-100"><Eye size={22}/></button>
                                                <button onClick={async () => { if(confirm('ยืนยันลบชุดข้อสอบนี้?')) { await deleteAssignment(a.id); onRefresh(); } }} className="bg-red-50 text-red-500 p-3.5 rounded-2xl hover:bg-red-500 hover:text-white transition shadow-sm border border-red-100"><Trash2 size={22}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- MODAL: Exam Creator --- */}
        {showExamCreator && createPortal(
            <div className="fixed inset-0 bg-slate-900/60 z-[70] backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-prompt">
                <div className="bg-white w-full max-w-6xl rounded-[40px] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh]">
                    <div className="p-8 bg-rose-50 border-b flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-rose-500 text-white p-3 rounded-2xl shadow-lg shadow-rose-100">
                                <GraduationCap size={32}/>
                            </div>
                            <div>
                                <h3 className="font-black text-2xl text-slate-800">เครื่องมือจัดทำข้อสอบมาตรฐาน (กลางภาค/ปลายภาค)</h3>
                                <p className="text-xs text-rose-500 font-bold uppercase tracking-widest mt-0.5">Interactive Midterm & Final Examination Architect</p>
                            </div>
                        </div>
                        <button onClick={() => {
                            setShowExamCreator(false);
                            setAccumulatedExamQuestions([]);
                            setDraftAiQuestions([]);
                            setAiExamPrompt('');
                        }} className="text-slate-400 hover:text-rose-500 transition p-2 hover:bg-white rounded-full"><X size={32}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* 📋 Left Pane: Config & Parameters (Col-Span 4) */}
                            <div className="lg:col-span-4 space-y-6 border-r border-slate-100 pr-0 lg:pr-8">
                                <h4 className="font-black text-slate-700 text-sm border-b pb-2 uppercase tracking-wider flex items-center gap-2"><Settings size={16} className="text-rose-500"/> ตั้งค่าข้อมูลทั่วไป</h4>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทการสอบ</label>
                                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                                        <button onClick={() => setExamType('MIDTERM')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${examType === 'MIDTERM' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>กลางภาค</button>
                                        <button onClick={() => setExamType('FINAL')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${examType === 'FINAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ปลายภาค</button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะเริ่มต้นระบบสอบ</label>
                                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                                        <button onClick={() => setExamStatus('LOCKED')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-1.5 ${examStatus === 'LOCKED' ? 'bg-white text-rose-600 shadow-sm font-black' : 'text-slate-500'}`}>
                                            <Lock size={14}/> ปิดระบบสอบไว้ก่อน
                                        </button>
                                        <button onClick={() => setExamStatus('OPEN')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-1.5 ${examStatus === 'OPEN' ? 'bg-white text-emerald-600 shadow-sm font-black' : 'text-slate-500'}`}>
                                            <Sparkles size={14}/> เปิดให้ทำได้ทันที
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ระดับชั้น</label>
                                        <select value={assignGrade} onChange={(e) => setAssignGrade(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-rose-400 transition font-black text-slate-700">
                                            {availableGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g] || g}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">วิชา</label>
                                        <select value={assignSubject} onChange={(e) => setAssignSubject(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-rose-400 transition font-black text-slate-700">
                                            {subjectsForGrade.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">กำหนดส่ง / กำหนดสอบ</label>
                                    <input 
                                        type="date" 
                                        value={assignDeadline} 
                                        onChange={(e) => setAssignDeadline(e.target.value)}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-rose-400 transition font-black text-slate-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">มอบหมายให้ห้องเรียน</label>
                                    <div className="flex flex-wrap gap-2">
                                        {validRooms.length > 0 ? validRooms.map(room => (
                                            <button 
                                                key={room} 
                                                onClick={() => setAssignTargetClassrooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room])}
                                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${assignTargetClassrooms.includes(room) ? 'bg-rose-600 border-rose-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'}`}
                                            >
                                                ห้อง {room}
                                            </button>
                                        )) : <p className="text-[10px] text-slate-500 italic font-bold">ไม่พบห้องเรียนในระดับนี้</p>}
                                    </div>
                                </div>
                            </div>

                            {/* 🛠️ Right Pane: Interactive Exam Wizard (Col-Span 8) */}
                            <div className="lg:col-span-8 flex flex-col space-y-6">
                                
                                {/* Mode Selector tabs */}
                                <div className="flex bg-slate-100 p-1.5 rounded-[22px] shadow-inner shrink-0">
                                    <button 
                                        onClick={() => setExamCreatorMode('AI_INTERACTIVE')} 
                                        className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${examCreatorMode === 'AI_INTERACTIVE' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        <Sparkles size={16}/> ออกข้อสอบด้วย AI ทีละส่วน (แนะนำ)
                                    </button>
                                    <button 
                                        onClick={() => setExamCreatorMode('RANDOM_PICK')} 
                                        className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${examCreatorMode === 'RANDOM_PICK' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        <BookOpen size={16}/> สุ่มดึงข้อสอบดั้งเดิมจากคลัง
                                    </button>
                                </div>

                                {examCreatorMode === 'AI_INTERACTIVE' ? (
                                    <div className="space-y-6 flex-1 flex flex-col">
                                        
                                        {/* Prompt Draft Form */}
                                        <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-[35px] p-6 border border-rose-100/60 shadow-sm space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h5 className="font-black text-slate-800 text-base flex items-center gap-2">📝 ระบุรายละเอียดข้อสอบที่ต้องการออกในรอบนี้</h5>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">คุณสามารถออกโจทย์หัวข้อแรก แล้วเพิ่มเข้าชุดสะสม จากนั้นค่อยเปลี่ยนหัวข้อพิมพ์เพื่อออกโจทย์หัวข้อถัดไปได้ไม่จำกัด</p>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-rose-100 flex items-center gap-2 text-xs font-black text-rose-600 shrink-0 shadow-sm">
                                                    <span>จำนวนข้อรอบนี้:</span>
                                                    <input 
                                                        type="number" 
                                                        value={aiExamCount} 
                                                        onChange={(e) => setAiExamCount(Math.max(1, Math.min(50, Number(e.target.value))))} 
                                                        className="w-12 text-center bg-transparent focus:outline-none border-b border-rose-400 font-black"
                                                    />
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <textarea 
                                                    value={aiExamPrompt}
                                                    onChange={(e) => setAiExamPrompt(e.target.value)}
                                                    placeholder='ตัวอย่าง: "รายวิชาคณิตศาสตร์ 10 ข้อแรกเป็นการบวกเลขหลักเดียว" หรือ "โจทย์การคูณเลขสองหลักจำนวน 10 ข้อถัดไป"'
                                                    className="w-full p-4 min-h-[90px] bg-white rounded-2xl outline-none border-2 border-transparent focus:border-rose-300 shadow-inner font-bold text-slate-700 text-sm resize-none custom-scrollbar"
                                                />
                                            </div>

                                            <button 
                                                onClick={handleGenerateDraftAIQuestions}
                                                disabled={isGeneratingAiExamDraft}
                                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-rose-200 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isGeneratingAiExamDraft ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={20}/>
                                                        <span>ระบบ AI กำลังวิเคราะห์และเรียบเรียงโจทย์ข้อสอบ...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <BrainCircuit size={20}/>
                                                        <span>✨ สั่งการให้ AI ออกข้อสอบรอบนี้</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Draft Questions list from AI */}
                                        {draftAiQuestions.length > 0 && (
                                            <div className="border border-emerald-100 bg-emerald-50/40 rounded-[35px] p-6 space-y-4 animate-slide-up">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h5 className="font-black text-emerald-800 text-base flex items-center gap-2">🔍 ตรวจสอบโจทย์ชุดล่าสุดที่ AI ออกให้สำเร็จ ({draftAiQuestions.length} ข้อ)</h5>
                                                        <p className="text-[10px] text-emerald-600/80 font-bold">กรุณาตรวจสอบโจทย์ด้านล่าง หากถูกต้องเรียบร้อยแล้วกดปุ่มสีเขียวเพื่อนำเข้าสู่ชุดข้อสอบหลักครับ</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                                                    {draftAiQuestions.map((q, idx) => (
                                                        <div key={idx} className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm text-sm">
                                                            <div className="font-black text-slate-800 mb-2">คำถามที่ {idx + 1}: {q.text}</div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 pl-3 border-l-2 border-emerald-200">
                                                                <div>ก. {q.c1} {String(q.correct) === '1' && '✅'}</div>
                                                                <div>ข. {q.c2} {String(q.correct) === '2' && '✅'}</div>
                                                                <div>ค. {q.c3} {String(q.correct) === '3' && '✅'}</div>
                                                                <div>ง. {q.c4} {String(q.correct) === '4' && '✅'}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button 
                                                    onClick={handleAddDraftToAccumulated}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95"
                                                >
                                                    <PlusCircle size={20}/>
                                                    <span>➕ เพิ่มข้อสอบ {draftAiQuestions.length} ข้อนี้ ลงในชุดข้อสอบสะสมหลัก</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Accumulated Main exam set (Active draft) */}
                                        <div className="flex-1 flex flex-col min-h-[180px]">
                                            <div className="flex justify-between items-center mb-3">
                                                <h5 className="font-black text-slate-700 text-sm flex items-center gap-2">📦 รายการข้อสอบสะสมหลักในชุดนี้ ({accumulatedExamQuestions.length} ข้อ)</h5>
                                                {accumulatedExamQuestions.length > 0 && (
                                                    <button onClick={() => { if(confirm('ต้องการล้างข้อสอบสะสมทั้งหมดเริ่มใหม่?')) setAccumulatedExamQuestions([]); }} className="text-[10px] font-black text-red-500 hover:underline">ล้างข้อสอบทั้งหมด</button>
                                                )}
                                            </div>

                                            <div className="flex-1 bg-slate-50 rounded-[35px] border-2 border-slate-100 p-5 overflow-y-auto custom-scrollbar max-h-[300px] shadow-inner">
                                                {accumulatedExamQuestions.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm py-12">
                                                        <ClipboardCheck size={48} className="opacity-20 mb-3"/>
                                                        <span>ยังไม่มีข้อสอบสะสมในชุดหลัก</span>
                                                        <span className="text-[10px] text-slate-400 mt-1 not-italic font-bold">ใช้คำสั่ง AI ออกข้อสอบด้านบน แล้วกดเพิ่มสะสมโจทย์ได้เลยครับ</span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {accumulatedExamQuestions.map((q, idx) => (
                                                            <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-xs flex justify-between items-start gap-4">
                                                                <div className="space-y-1.5 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-rose-50 text-rose-600 font-black px-2 py-0.5 rounded text-[9px] uppercase">ข้อที่ {idx + 1}</span>
                                                                        <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded text-[9px] truncate max-w-[150px]">คำสั่ง: {q.unit}</span>
                                                                    </div>
                                                                    <div className="font-black text-slate-700 text-sm">{q.text}</div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => setAccumulatedExamQuestions(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-lg transition"
                                                                    title="ลบข้อนี้ออก"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Save Exam Set trigger */}
                                        {accumulatedExamQuestions.length > 0 && (
                                            <button 
                                                onClick={handleSaveAccumulatedExam}
                                                disabled={isCreatingExam || accumulatedExamQuestions.length === 0}
                                                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-black py-4 rounded-3xl transition shadow-xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Save size={20} className="text-emerald-400"/>
                                                <span>💾 บันทึกและสร้างการสอบจริงอย่างเป็นทางการ ({accumulatedExamQuestions.length} ข้อ)</span>
                                            </button>
                                        )}

                                    </div>
                                ) : (
                                    <div className="space-y-6 flex-1 flex flex-col">
                                        {/* RANDOM_PICK MODE: Original Unit Selector */}
                                        <div className="flex justify-between items-end shrink-0">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">เลือกหน่วยการเรียนรู้ (คลังข้อสอบเดิม)</label>
                                            <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">เลือกแล้ว {selectedUnitsForExam.length} หน่วย</span>
                                        </div>

                                        <div className="bg-slate-50 rounded-[35px] p-5 space-y-2 flex-1 overflow-y-auto max-h-[300px] border-2 border-slate-100 shadow-inner custom-scrollbar">
                                            {loadingBankQuestions ? (
                                                <div className="py-20 text-center flex flex-col items-center justify-center text-rose-500 gap-2">
                                                    <Loader2 className="animate-spin" size={36}/>
                                                    <span className="text-xs font-black">กำลังโหลดข้อสอบจากคลัง...</span>
                                                </div>
                                            ) : availableExamSources.length > 0 ? (
                                                availableExamSources.map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => setSelectedUnitsForExam(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                                                        className={`p-4 rounded-2xl cursor-pointer transition-all border-2 flex justify-between items-center ${selectedUnitsForExam.includes(s.id) ? 'bg-white border-rose-500 shadow-md ring-4 ring-rose-50' : 'bg-white/50 border-transparent hover:border-rose-200'}`}
                                                    >
                                                        <div>
                                                            <p className="font-black text-slate-700 text-sm leading-tight">{s.title}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                                                                {s.type === 'BANK_UNIT' ? 'ดึงจากคลังข้อสอบโดยตรง' : 'ดึงจากการบ้านเดิม'} • {s.questionCount} ข้อ
                                                            </p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${selectedUnitsForExam.includes(s.id) ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                            <ClipboardCheck size={14}/>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-16 text-center">
                                                    <div className="text-slate-200 mb-3 flex justify-center"><BookOpen size={44}/></div>
                                                    <p className="text-xs text-slate-400 font-black italic">ไม่พบคลังข้อสอบหรือชุดการบ้านในระดับชั้น/วิชานี้<br/>กรุณาสร้างชุดการบ้านหรือเพิ่มข้อสอบในคลังก่อนครับ</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="shrink-0 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ต้องการดึงจำนวนข้อสอบรวมทั้งหมด</label>
                                            <input 
                                                type="number" 
                                                value={examTotalQuestions} 
                                                onChange={(e) => setExamTotalQuestions(Number(e.target.value))}
                                                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-rose-400 transition font-black text-slate-700"
                                                min={1} max={100}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 italic font-bold">* ระบบจะเฉลี่ยจำนวนข้อดึงจากแต่ละหน่วยที่เลือกให้เท่ากันที่สุดโดยอัตโนมัติ</p>
                                        </div>

                                        {/* Action Buttons for traditional randomizer */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 shrink-0">
                                            <button 
                                                onClick={handleCreateBalancedExam}
                                                disabled={isCreatingExam || selectedUnitsForExam.length === 0}
                                                className="group relative bg-white border-2 border-slate-200 hover:border-rose-500 p-5 rounded-3xl transition-all hover:shadow-lg disabled:opacity-50 disabled:grayscale overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover:bg-rose-500 transition-colors"></div>
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="bg-slate-50 group-hover:bg-rose-50 p-3 rounded-xl text-slate-400 group-hover:text-rose-600 transition-colors shadow-inner">
                                                        <RefreshCw size={24}/>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800 text-sm">สุ่มข้อสอบแบบถัวเฉลี่ย</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">ดึงโจทย์แบบเกลี่ยจำนวนข้อให้เท่าๆ กัน</p>
                                                    </div>
                                                </div>
                                            </button>

                                            <button 
                                                onClick={handleCreateAIExam}
                                                disabled={isCreatingExam || selectedUnitsForExam.length === 0}
                                                className="group relative bg-slate-900 p-5 rounded-3xl transition-all hover:shadow-lg hover:scale-[1.01] disabled:opacity-50 disabled:grayscale overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-md shadow-indigo-950">
                                                        <Sparkles size={24}/>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-white text-sm">สร้างข้อสอบรวมหน่วยด้วย AI</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">ให้ AI ออกโจทย์ใหม่ตามหัวข้อเดิมทั้งหมด</p>
                                                    </div>
                                                </div>
                                                {isCreatingExam && (
                                                    <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex flex-col items-center justify-center">
                                                        <Loader2 className="text-indigo-400 animate-spin mb-1" size={24}/>
                                                        <p className="text-white font-black text-[10px] animate-pulse">กำลังประมวลผลข้อสอบ...</p>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t flex justify-center shrink-0">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                           <Info size={14}/> ระบบจะจัดเก็บเป็นชุดข้อสอบมาตรฐานประเภท {examType === 'MIDTERM' ? 'กลางภาค' : 'ปลายภาค'} โดยอัตโนมัติ
                        </p>
                    </div>
                </div>
            </div>
        , document.body)}

        {/* --- MODAL: Question Bank --- */}
        {showQuestionBank && createPortal(
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-black text-2xl text-slate-800">คลังข้อสอบ ({bankQuestions.length} ข้อ)</h3>
                            <p className="text-sm text-slate-400 font-black uppercase tracking-widest mt-1">วิชา {assignSubject} • ชั้น {GRADE_LABELS[assignGrade]}</p>
                        </div>
                        <button onClick={() => setShowQuestionBank(false)} className="text-slate-400 hover:text-red-500 transition p-2 rounded-full"><X size={32}/></button>
                    </div>

                    <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                        {loadingBank ? (
                            <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
                                <Loader2 className="animate-spin mb-4" size={56}/>
                                <p className="font-black text-xl">กำลังดึงข้อมูลคลังข้อสอบ...</p>
                            </div>
                        ) : bankQuestions.length === 0 ? (
                            <div className="text-center py-20 text-slate-300 italic font-black">ไม่พบข้อสอบเดิมในระบบวิชานี้</div>
                        ) : (
                            <div className="grid gap-4">
                                {bankQuestions.map(q => (
                                    <div 
                                        key={q.id} 
                                        onClick={() => setSelectedBankIds(prev => prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id])}
                                        className={`p-6 rounded-[30px] border-2 transition-all cursor-pointer flex items-start gap-4 ${selectedBankIds.includes(q.id) ? 'bg-indigo-50 border-indigo-500 shadow-md scale-[1.01]' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 transition-all ${selectedBankIds.includes(q.id) ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-slate-200 text-transparent'}`}>
                                            <ClipboardCheck size={14}/>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[9px] font-black text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">หน่วย: {q.unit || 'ทั่วไป'}</span>
                                            </div>
                                            <div className="font-black text-slate-800 text-base">{q.text}</div>
                                            <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-bold text-slate-400">
                                                {q.choices.map((c, ci) => (
                                                    <div key={ci} className={String(ci+1) === String(q.correctChoiceId) ? 'text-emerald-600' : ''}>{ci+1}. {c.text}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-8 border-t bg-slate-50">
                        <button 
                            onClick={handleAddFromBank}
                            disabled={selectedBankIds.length === 0}
                            className={`w-full py-5 rounded-[25px] font-black text-xl text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${selectedBankIds.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-300 cursor-not-allowed'}`}
                        >
                            เลือก {selectedBankIds.length} ข้อ เข้าสู่ชุดงาน
                        </button>
                    </div>
                </div>
            </div>, document.body
        )}

        {/* --- MODAL: Detail Viewer --- */}
        {selectedAssignment && createPortal(
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="p-8 border-b flex justify-between items-center bg-slate-50 relative">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
                        <div>
                            <h3 className="font-black text-2xl text-slate-800">{selectedAssignment.title || selectedAssignment.subject}</h3>
                            <p className="text-sm text-slate-500 font-black mt-1 uppercase tracking-widest">ชั้น {GRADE_LABELS[selectedAssignment.grade || ''] || selectedAssignment.grade} • ID: {selectedAssignment.id}</p>
                        </div>
                        <button onClick={() => setSelectedAssignment(null)} className="text-slate-400 hover:text-red-500 transition p-2 rounded-full"><X size={32}/></button>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mx-8 mt-6">
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                            <button onClick={() => setModalTab('SCORES')} className={`px-8 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${modalTab === 'SCORES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}><Users size={18}/> คะแนนนักเรียน</button>
                            <button onClick={() => setModalTab('QUESTIONS')} className={`px-8 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all ${modalTab === 'QUESTIONS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}><FileText size={18}/> โจทย์ทั้งหมด</button>
                        </div>
                        <button 
                            onClick={() => {
                                handleOpenPrintPreview(selectedAssignment);
                                setSelectedAssignment(null);
                            }} 
                            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-md shadow-amber-100"
                        >
                            <Printer size={18}/> พิมพ์ข้อสอบนี้
                        </button>
                    </div>

                    <div className="p-0 flex-1 overflow-auto bg-white custom-scrollbar mt-4">
                        {modalTab === 'SCORES' ? (
                            <table className="w-full text-base text-left">
                                <thead className="bg-slate-50 text-slate-500 font-black sticky top-0 shadow-sm uppercase text-[10px] tracking-widest">
                                    <tr><th className="p-8">ชื่อนักเรียน</th><th className="p-8 text-center">ห้อง</th><th className="p-8 text-center">สถานะ</th><th className="p-8 text-right">คะแนน</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.filter(s => (!selectedAssignment.grade || selectedAssignment.grade === 'ALL' || s.grade === selectedAssignment.grade) && (!selectedAssignment.targetClassrooms?.length || (s.classroom && selectedAssignment.targetClassrooms.includes(s.classroom)))).map(s => { 
                                        const r = stats.filter(stat => String(stat.studentId) === String(s.id) && stat.assignmentId === selectedAssignment.id).sort((a,b)=>b.score - a.score)[0]; 
                                        return (
                                            <tr key={s.id} className="hover:bg-slate-50 transition">
                                                <td className="p-8 flex items-center gap-4"><span className="text-4xl bg-slate-50 p-2 rounded-2xl shadow-inner">{s.avatar}</span><span className="font-black text-slate-700 text-lg">{s.name}</span></td>
                                                <td className="p-8 text-center text-slate-500 font-black">ห้อง {s.classroom}</td>
                                                <td className="p-8 text-center">{r ? <span className="bg-emerald-50 text-emerald-600 px-5 py-1.5 rounded-full text-xs font-black border border-emerald-100 shadow-sm">ส่งแล้ว</span> : <span className="text-slate-400 italic font-bold">ยังไม่ส่ง</span>}</td>
                                                <td className="p-8 text-right font-black text-indigo-600 text-3xl">{r ? `${r.score}/${r.totalQuestions}` : '-'}</td>
                                            </tr> 
                                        ) 
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-10 space-y-6">
                                {loadingQuestions ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-indigo-500"><Loader2 className="animate-spin mb-4" size={56}/><p className="font-black text-xl">กำลังโหลดโจทย์...</p></div>
                                ) : examQuestions.length === 0 ? (
                                    <div className="text-center py-20 text-slate-300 italic font-black">ไม่พบข้อมูลโจทย์ในระบบ</div>
                                ) : (
                                    examQuestions.map((q, idx) => (
                                        <div key={q.id} className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-200 opacity-50"></div>
                                            <div className="font-black text-slate-800 text-xl mb-6 pr-10">{idx + 1}. {q.text}</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pl-4 border-l-4 border-indigo-100/50">
                                                {q.choices.map((c, ci) => (
                                                    <div key={ci} className={`p-3 rounded-2xl text-base font-bold flex items-center gap-3 ${String(ci+1) === String(q.correctChoiceId) ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' : 'text-slate-600 bg-white border border-slate-50'}`}>
                                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${String(ci+1) === String(q.correctChoiceId) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{ci+1}</span>
                                                        {c.text}
                                                    </div>
                                                ))}
                                            </div>
                                            {q.explanation && (
                                                <div className="text-xs text-indigo-600 bg-indigo-50/50 p-4 rounded-2xl italic font-black flex items-start gap-2 border border-indigo-100">
                                                    <Info size={16} className="mt-0.5 flex-shrink-0"/>
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

        {/* --- MODAL: Print Preview --- */}
        {printAssignment && createPortal(
            <div className="fixed inset-0 bg-slate-900/60 z-[80] backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-prompt">
                <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[95vh]">
                    <div className="p-8 bg-amber-50 border-b border-amber-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg shadow-amber-100">
                                <Printer size={32}/>
                            </div>
                            <div>
                                <h3 className="font-black text-2xl text-slate-800">ตัวอย่างก่อนพิมพ์ข้อสอบ</h3>
                                <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-0.5">Exam Print Preview & settings</p>
                            </div>
                        </div>
                        <button onClick={() => setPrintAssignment(null)} className="text-slate-400 hover:text-amber-600 transition p-2 hover:bg-white rounded-full"><X size={32}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 bg-slate-100 custom-scrollbar flex flex-col lg:flex-row gap-8">
                        {/* Print Settings Column */}
                        <div className="lg:w-1/3 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6 shrink-0 h-fit">
                            <h4 className="font-black text-slate-800 text-base border-b pb-3">ตั้งค่าหน้ากระดาษ</h4>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-600">แสดงเฉลยและเหตุผลประกอบ</span>
                                    <button 
                                        type="button"
                                        onClick={() => setShowAnswersInPrint(!showAnswersInPrint)}
                                        className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${showAnswersInPrint ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${showAnswersInPrint ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold">* หากเปิด: จะพิมพ์เฉลยแนบใต้แต่ละข้อคำถาม<br/>* หากปิด: จะแนบชุดเฉลยข้อสอบรวมที่หน้าสุดท้ายแยกให้แทน</p>
                            </div>

                            <button 
                                type="button"
                                onClick={handlePrintAction}
                                disabled={loadingPrint || printQuestions.length === 0}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl transition duration-200 shadow-lg shadow-amber-100 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                            >
                                <Printer size={18}/>
                                พิมพ์ข้อสอบจริง (Print)
                            </button>
                        </div>

                        {/* Document Simulation Sheet */}
                        <div className="flex-1 bg-white p-10 rounded-3xl border border-slate-200/60 shadow-md min-h-[500px] flex flex-col">
                            {loadingPrint ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12 gap-3">
                                    <Loader2 className="animate-spin text-amber-500" size={48}/>
                                    <span className="text-sm font-black animate-pulse">กำลังจัดทำหน้าตัวอย่างคำถาม...</span>
                                </div>
                            ) : printQuestions.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                                    <span>ไม่พบข้อสอบในชุดนี้</span>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Simulated School Header */}
                                    <div className="text-center border-b-2 border-double pb-4">
                                        <div className="text-lg font-black text-slate-800">{teacher.school}</div>
                                        <div className="text-sm font-black text-slate-700 mt-1">
                                            {printAssignment.title?.includes('กลางภาค') || printAssignment.category === 'MIDTERM' ? 'ข้อสอบกลางภาค' : 'ข้อสอบปลายภาค'} - วิชา {printAssignment.subject}
                                        </div>
                                        <div className="text-[11px] font-black text-slate-400 mt-1">
                                            ระดับชั้น: {GRADE_LABELS[printAssignment.grade || 'ALL'] || printAssignment.grade} • ข้อสอบทั้งหมด {printQuestions.length} ข้อ • ผู้สอน: {teacher.name}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 border-t border-dashed mt-3 pt-2 text-[10px] text-slate-400 font-bold text-left">
                                            <div>ชื่อ-นามสกุล: ...........................................</div>
                                            <div>ชั้น: ................</div>
                                            <div>เลขที่: ............</div>
                                        </div>
                                    </div>

                                    {/* Simulated Questions List */}
                                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar text-left">
                                        {printQuestions.map((q, idx) => {
                                            const qAny = q as any;
                                            return (
                                                <div key={idx} className="space-y-2 text-xs">
                                                    <div className="font-black text-slate-800">{idx + 1}. {qAny.text}</div>
                                                    <div className="grid grid-cols-2 gap-2 pl-4 text-slate-500 font-bold">
                                                        <div>1) {qAny.c1 || (qAny.choices && qAny.choices[0]?.text) || ''}</div>
                                                        <div>2) {qAny.c2 || (qAny.choices && qAny.choices[1]?.text) || ''}</div>
                                                        <div>3) {qAny.c3 || (qAny.choices && qAny.choices[2]?.text) || ''}</div>
                                                        <div>4) {qAny.c4 || (qAny.choices && qAny.choices[3]?.text) || ''}</div>
                                                    </div>
                                                    {showAnswersInPrint && (
                                                        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-2.5 rounded-r-xl mt-2 text-[11px] text-emerald-800 font-bold">
                                                            <b>เฉลย:</b> ข้อ {qAny.correct || qAny.correctChoiceId} &nbsp;&bull;&nbsp; <b>คำอธิบาย:</b> {qAny.explanation || 'ไม่มีคำอธิบายเพิ่มเติม'}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                        <button 
                            type="button"
                            onClick={() => setPrintAssignment(null)}
                            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-sm rounded-xl transition"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            </div>
        , document.body)}
    </div>
  );
};

export default AssignmentManager;
