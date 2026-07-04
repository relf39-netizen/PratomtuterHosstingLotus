
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Question, SubjectConfig, Teacher } from '../../types';
import { 
  FileText, Wand2, Edit, Trash2, Loader2, RefreshCw, Save, 
  PlusCircle, X, List, Sparkles, 
  ChevronsLeft, ChevronsRight,
  Download, UploadCloud, Database, LayoutGrid, AlertTriangle, Search, HelpCircle, ArrowLeft
} from 'lucide-react';
import { addQuestion, editQuestion, deleteQuestion, getQuestionsBySubjectAndGrade } from '../../services/api';
import { generateQuestionWithAI, GeneratedQuestion } from '../../services/aiService';

declare const XLSX: any;

interface QuestionBankProps {
  subjects: SubjectConfig[];
  teacher: Teacher;
  canManageAll: boolean;
  myGrades: string[];
  hasApiKey: boolean;
  onSelectApiKey: () => Promise<void>;
}

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6', 
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
};

const checkSimilarity = (s1: string, s2: string): number => {
    const clean = (s: string) => s.replace(/\s+/g, '').replace(/[^\w\u0E00-\u0E7F]/g, '');
    const c1 = clean(s1);
    const c2 = clean(s2);
    if (c1 === c2) return 1.0;
    if (c1.length > 5 && c2.length > 5 && (c1.includes(c2) || c2.includes(c1))) return 0.9;
    const getNGrams = (s: string) => {
        const res = new Set<string>();
        for (let i = 0; i < s.length - 1; i++) res.add(s.substring(i, i + 2));
        return res;
    };
    const set1 = getNGrams(c1);
    const set2 = getNGrams(c2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / (union.size || 1);
};

const QuestionBank: React.FC<QuestionBankProps> = ({ subjects, teacher, hasApiKey: initialHasKey, onSelectApiKey }) => {
  const [viewMode, setViewMode] = useState<'EXPLORER' | 'AI_GENERATOR'>('EXPLORER');
  const [qSubject, setQSubject] = useState<string>('');
  const [qGrade, setQGrade] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; 

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qChoices, setQChoices] = useState({c1:'', c2:'', c3:'', c4:''});
  const [qCorrect, setQCorrect] = useState('1');
  const [qExplain, setQExplain] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiPreviewQuestions, setAiPreviewQuestions] = useState<GeneratedQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [realHasKey, setRealHasKey] = useState(initialHasKey);
  useEffect(() => {
    setRealHasKey(initialHasKey || !!localStorage.getItem('MST_CUSTOM_GEMINI_KEY'));
  }, [initialHasKey]);

  const isDirector = useMemo(() => {
    const pos = teacher.position || '';
    const roles = (teacher.role || '').split(',');
    return roles.includes('DIRECTOR') || pos === 'ผู้อำนวยการโรงเรียน' || pos === 'รองผู้อำนวยการ';
  }, [teacher.position, teacher.role]);

  const myOwnedSubjects = useMemo(() => {
      return subjects.filter(s => {
          const isMySchool = String(s.school).trim() === String(teacher.school).trim();
          if (!isMySchool) return false;
          if (isDirector) return true;
          return String(s.teacherId).trim() === String(teacher.id).trim();
      });
  }, [subjects, teacher.id, teacher.school, isDirector]);

  const myAvailableGrades = useMemo(() => {
      const grades = new Set<string>();
      myOwnedSubjects.forEach(s => grades.add(s.grade));
      return Array.from(grades).sort();
  }, [myOwnedSubjects]);

  const myFilteredSubjects = useMemo(() => {
      return myOwnedSubjects.filter(s => s.grade === qGrade || s.grade === 'ALL');
  }, [myOwnedSubjects, qGrade]);

  const loadInitialData = async () => {
      // Assignments state was removed, so this is no longer needed
      // const data = await getTeacherDashboard(teacher.school);
      // setAssignments(data.assignments || []);
  };

  const loadQuestions = async () => {
      if (qSubject && qGrade) {
          setLoadingQuestions(true);
          setDuplicateIds(new Set());
          try {
              const data = await getQuestionsBySubjectAndGrade(qSubject, qGrade, teacher.school);
              const filteredQuestions = data.filter(q => {
                  if (isDirector) return true;
                  return String(q.teacherId).trim() === String(teacher.id).trim();
              });
              setQuestions(filteredQuestions);
              setCurrentPage(1);
          } catch (e) { 
              console.error("Load Questions Error:", e);
              setQuestions([]);
          }
          setLoadingQuestions(false);
      } else {
          setQuestions([]);
      }
  };

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { loadQuestions(); }, [qSubject, qGrade]);

  const filteredQuestionsList = useMemo(() => {
      return questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [questions, searchQuery]);

  const totalPages = Math.ceil(filteredQuestionsList.length / ITEMS_PER_PAGE);
  const currentQuestions = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredQuestionsList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuestionsList, currentPage]);

  const scanDuplicates = () => {
      setIsScanning(true);
      const dups = new Set<string>();
      for (let i = 0; i < questions.length; i++) {
          for (let j = i + 1; j < questions.length; j++) {
              if (checkSimilarity(questions[i].text, questions[j].text) > 0.8) {
                  dups.add(questions[i].id);
                  dups.add(questions[j].id);
              }
          }
      }
      setDuplicateIds(dups);
      setIsScanning(false);
      if (dups.size > 0) alert(`⚠️ พบโจทย์ที่อาจจะซ้ำซ้อนกันจำนวน ${dups.size} ข้อ (ระบบไฮไลท์เป็นสีส้มในคลังด้านล่างครับ)`);
      else alert("✅ ไม่พบโจทย์ซ้ำซ้อนในระดับชั้นและวิชานี้ครับ");
  };

  const handleEditQuestion = (q: Question) => {
      setEditingQuestionId(q.id);
      setQText(q.text);
      setQSubject(q.subject);
      setQGrade(q.grade || '');
      setQChoices({
          c1: q.choices[0]?.text || '',
          c2: q.choices[1]?.text || '',
          c3: q.choices[2]?.text || '',
          c4: q.choices[3]?.text || ''
      });
      setQCorrect(String(q.correctChoiceId));
      setQExplain(q.explanation);
  };

  const handleSaveQuestion = async () => {
      if (!qText || !qSubject || !qGrade) return alert('กรุณาระบุข้อมูลโจทย์และวิชาให้ครบถ้วน');
      setIsProcessing(true);
      const payload = { 
          id: editingQuestionId, subject: qSubject, grade: qGrade, text: qText, 
          c1: qChoices.c1, c2: qChoices.c2, c3: qChoices.c3, c4: qChoices.c4, 
          correct_choice_id: qCorrect, explanation: qExplain, school: teacher.school, teacherId: String(teacher.id) 
      };
      const result = editingQuestionId ? await editQuestion(payload) : await addQuestion(payload);
      setIsProcessing(false);
      if (result.success) {
          alert('✅ บันทึกข้อมูลเรียบร้อย');
          setQText(''); setQChoices({c1:'', c2:'', c3:'', c4:''}); setQExplain(''); setEditingQuestionId(null);
          loadQuestions();
      } else { alert('❌ ผิดพลาด: ' + result.message); }
  };

  const handleAiGenerate = async () => {
      if (!realHasKey) { 
          alert("กรุณาตั้งค่า API Key ก่อนใช้งาน AI ครับ");
          await onSelectApiKey(); 
          return; 
      }
      if (!aiTopic || !qSubject || !qGrade) return alert("กรุณาระบุข้อมูลวิชาและหัวข้อที่ต้องการ");
      setIsGeneratingAi(true);
      try {
          const currentTexts = questions.map(q => q.text).slice(0, 30);
          const generated = await generateQuestionWithAI(qSubject, qGrade, aiTopic, 5, 'normal', currentTexts);
          if (generated) setAiPreviewQuestions(prev => [...prev, ...generated]);
      } catch (e: any) { alert(e.message); }
      setIsGeneratingAi(false);
  };

  const handleConfirmAiQuestions = async () => {
      if (aiPreviewQuestions.length === 0) return;
      setIsProcessing(true);
      try {
          for (const q of aiPreviewQuestions) {
              await addQuestion({
                  subject: qSubject, grade: qGrade, text: q.text,
                  c1: q.c1, c2: q.c2, c3: q.c3, c4: q.c4,
                  correct: q.correct, explanation: q.explanation,
                  school: teacher.school, teacherId: String(teacher.id)
              });
          }
          alert(`✅ เพิ่มโจทย์ ${aiPreviewQuestions.length} ข้อ เข้าคลังสำเร็จ`);
          setAiPreviewQuestions([]); setAiTopic(''); setViewMode('EXPLORER');
          loadQuestions();
      } catch (e) { alert("เกิดข้อผิดพลาดในการบันทึก"); }
      setIsProcessing(false);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const imported = rows.filter((r:any) => r[0]).map((r:any) => ({
            text: String(r[0]), c1: String(r[1] || ''), c2: String(r[2] || ''), c3: String(r[3] || ''),
            c4: String(r[4] || ''), correct: String(r[5] || '1'), explanation: String(r[6] || '')
        }));
        if (imported.length > 0) { 
            setAiPreviewQuestions(imported); 
            setViewMode('AI_GENERATOR');
        } else {
            alert("❌ ไม่พบข้อมูลที่ถูกต้องในไฟล์");
        }
      } catch (err) { alert("❌ ไฟล์ไม่ถูกต้อง หรือรูปแบบผิดพลาด"); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      ["โจทย์", "ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4", "ข้อที่ถูก (1-4)", "คำอธิบายเฉลย"],
      ["ตัวอย่าง: 5 + 5 เท่ากับเท่าไหร่?", "8", "9", "10", "11", "3", "เพราะ 5 บวก 5 ได้ผลลัพธ์คือ 10"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam_Template");
    XLSX.writeFile(wb, "MST_Exam_Template.xlsx");
  };

  if (viewMode === 'EXPLORER') {
    return (
        <div className="font-prompt animate-fade-in pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 📋 ส่วนจัดการ (ซ้าย) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-6 rounded-[35px] border border-slate-200 shadow-xl relative overflow-hidden sticky top-24">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-700"></div>
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                {editingQuestionId ? <Edit className="text-orange-500" size={20}/> : <PlusCircle className="text-indigo-600" size={20}/>}
                                {editingQuestionId ? 'แก้ไขโจทย์' : 'เพิ่มโจทย์เข้าคลัง'}
                            </h4>
                            {editingQuestionId && (
                                <button onClick={() => { setEditingQuestionId(null); setQText(''); }} className="text-[10px] font-black text-red-500 hover:underline">ยกเลิกแก้ไข</button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <button onClick={() => { setAiPreviewQuestions([]); setViewMode('AI_GENERATOR'); }} className="bg-white hover:bg-pink-50 text-pink-600 p-3 rounded-2xl transition-all shadow-sm border border-pink-100 flex flex-col items-center justify-center gap-1 group active:scale-95">
                                <div className="bg-pink-50 p-1.5 rounded-xl group-hover:bg-pink-600 group-hover:text-white transition-colors"><Wand2 size={18}/></div>
                                <span className="text-[10px] font-black uppercase tracking-tighter">AI ออกโจทย์</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="bg-white hover:bg-emerald-50 text-emerald-600 p-3 rounded-2xl transition-all shadow-sm border border-emerald-100 flex flex-col items-center justify-center gap-1 group active:scale-95">
                                <div className="bg-emerald-50 p-1.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors"><UploadCloud size={18}/></div>
                                <span className="text-[10px] font-black uppercase tracking-tighter">นำเข้า Excel</span>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
                        </div>
                        
                        <button onClick={handleDownloadTemplate} className="w-full mb-6 text-indigo-600 text-[9px] font-black py-1.5 hover:bg-indigo-50 rounded-xl transition uppercase tracking-widest flex items-center justify-center gap-2 border border-dashed border-indigo-200">
                            <Download size={12}/> ดาวน์โหลด Template Excel
                        </button>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">1. เลือกระดับชั้น</label>
                                    <select value={qGrade} onChange={e => { setQGrade(e.target.value); setQSubject(''); }} className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-black text-slate-700 outline-none focus:border-indigo-400 text-sm">
                                        <option value="">-- เลือกชั้น --</option>
                                        {myAvailableGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g] || g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">2. เลือกวิชา</label>
                                    <select disabled={!qGrade} value={qSubject} onChange={e => setQSubject(e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 font-black text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50 text-sm">
                                        <option value="">-- เลือกวิชา --</option>
                                        {myFilteredSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-700 flex items-center justify-between">
                                    <span>3. ระบุรายละเอียดคำถาม</span>
                                    <HelpCircle size={12} className="text-slate-300"/>
                                </label>
                                <textarea value={qText} onChange={e => setQText(e.target.value)} rows={2} className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold outline-none focus:bg-white focus:border-indigo-400 shadow-inner transition-all" placeholder="พิมพ์โจทย์คำถามที่นี่..." />
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {['1','2','3','4'].map(num => (
                                        <div key={num} className="flex items-center gap-2">
                                            <button onClick={() => setQCorrect(num)} className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shadow-sm transition-all active:scale-90 ${qCorrect === num ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>{num}</button>
                                            <input type="text" value={(qChoices as any)[`c${num}`]} onChange={e => setQChoices({...qChoices, [`c${num}`]: e.target.value})} className="flex-1 p-2 border-2 border-slate-100 rounded-xl text-xs font-bold focus:border-indigo-400 shadow-inner outline-none" placeholder={`ตัวเลือกที่ ${num}`} />
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">คำอธิบายเฉลย</label>
                                    <textarea value={qExplain} onChange={e => setQExplain(e.target.value)} rows={1} className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 text-xs font-bold outline-none focus:border-indigo-400 shadow-inner transition-all" placeholder="เฉลยข้อนี้เพราะ..." />
                                </div>

                                <button onClick={handleSaveQuestion} disabled={isProcessing || !qText} className="w-full py-3.5 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 border-b-4 border-indigo-900 disabled:opacity-50 transition-all active:scale-95 text-base">
                                    {isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} 
                                    {editingQuestionId ? 'บันทึกการแก้ไข' : 'บันทึกโจทย์เข้าคลัง'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📚 ส่วนสืบค้น (ขวา) */}
                <div className="lg:col-span-7">
                    <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm min-h-[850px] flex flex-col relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-5 gap-4">
                            <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-2xl text-indigo-600"><Database size={20}/></div> 
                                คลังข้อสอบของฉัน
                            </h4>
                            <div className="flex items-center gap-2">
                                <button onClick={loadQuestions} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 transition-all active:rotate-180" title="รีเฟรชคลัง"><RefreshCw size={18}/></button>
                                <button onClick={scanDuplicates} disabled={questions.length < 2 || isScanning} className={`px-4 py-2 rounded-xl font-black text-[10px] transition-all flex items-center gap-2 border ${duplicateIds.size > 0 ? 'bg-orange-600 text-white border-orange-700' : 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100'}`}>
                                    {isScanning ? <RefreshCw className="animate-spin" size={14}/> : <AlertTriangle size={14}/>} 
                                    {duplicateIds.size > 0 ? `พบซ้ำ ${duplicateIds.size}` : 'ตรวจโจทย์ซ้ำ'}
                                </button>
                            </div>
                        </div>

                        {(qSubject && qGrade) ? (
                            <div className="mb-5 relative animate-fade-in">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    placeholder={`ค้นหาใน ${qSubject} ${GRADE_LABELS[qGrade]}...`}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-indigo-400 font-bold text-xs"
                                />
                                <Search className="absolute left-3.5 top-3 text-slate-300" size={16}/>
                            </div>
                        ) : null}

                        {loadingQuestions ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-indigo-500">
                                <Loader2 className="animate-spin mb-3" size={40}/><p className="font-black text-sm animate-pulse">กำลังเรียกข้อมูลคลังวิชา...</p>
                            </div>
                        ) : (!qSubject || !qGrade) ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-300">
                                <LayoutGrid size={80} className="opacity-10 mb-5"/><p className="font-black text-sm text-center leading-relaxed">เลือกระดับชั้นและวิชาที่คุณสอน<br/>เพื่อเรียกดูคลังโจทย์ส่วนตัวครับ</p>
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-200">
                                <FileText size={60} className="opacity-10 mb-4"/>
                                <p className="font-black text-sm">ยังไม่มีโจทย์ในวิชา {qSubject}</p>
                                <p className="text-[10px] font-bold text-slate-300">เริ่มเพิ่มโจทย์จากฟอร์มด้านซ้ายได้เลยจ้า</p>
                            </div>
                        ) : (
                            <div className="space-y-3 flex-1 flex flex-col animate-slide-up">
                                <div className="flex justify-between items-center px-2 mb-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Questions Found: <span className="text-indigo-600">{filteredQuestionsList.length} items</span></p>
                                    <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Page {currentPage} of {totalPages || 1}</div>
                                </div>

                                <div className="space-y-3 flex-1">
                                    {currentQuestions.map((q, idx) => {
                                        const isDuplicate = duplicateIds.has(q.id);
                                        return (
                                            <div key={q.id} className={`p-5 bg-white rounded-[25px] border-2 transition-all hover:shadow-lg border-l-[8px] relative group ${isDuplicate ? 'border-orange-200 bg-orange-50 border-l-orange-500' : 'border-slate-50 hover:border-indigo-100 border-l-slate-100 hover:border-l-indigo-500'}`}>
                                                <div className="flex justify-between items-start mb-3 gap-3">
                                                    <div className="font-black text-slate-800 text-base leading-tight pr-10">{(currentPage-1)*ITEMS_PER_PAGE + idx + 1}. {q.text}</div>
                                                    {isDuplicate && (
                                                        <div className="bg-orange-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shadow-sm flex items-center gap-1 animate-pulse shrink-0"><AlertTriangle size={10}/> Possible Dup</div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3 border-l-2 border-slate-200 group-hover:border-indigo-200 transition-colors">
                                                    {q.choices.map((c, ci) => (
                                                        <div key={ci} className={`flex items-center gap-2 p-1 rounded-lg ${String(ci+1) === String(q.correctChoiceId) ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-600'}`}>
                                                            <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[9px] font-black ${String(ci+1) === String(q.correctChoiceId) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{ci+1}</span>
                                                            <span className={`font-bold text-xs ${String(ci+1) === String(q.correctChoiceId) ? 'text-emerald-800 font-black' : 'text-slate-600'}`}>{c.text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-1.5">
                                                    <button onClick={() => { handleEditQuestion(q); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 bg-white text-orange-500 rounded-xl border shadow-md hover:bg-orange-500 hover:text-white transition active:scale-90"><Edit size={16}/></button>
                                                    <button onClick={async () => { if(confirm('ลบโจทย์ข้อนี้ออกจากคลัง?')) { await deleteQuestion(q.id); loadQuestions(); } }} className="p-2 bg-white text-red-500 rounded-xl border shadow-md hover:bg-red-500 hover:text-white transition active:scale-90"><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="pt-6 border-t border-slate-100 flex justify-center items-center gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white transition disabled:opacity-30"><ChevronsLeft size={16}/></button>
                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
                                            return (
                                                <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-8 h-8 rounded-lg font-black text-xs transition-all ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>{pageNum}</button>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white transition disabled:opacity-30"><ChevronsRight size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // --- RENDER AI GENERATOR VIEW (COMPACT) ---
  return (
    <div className="font-prompt animate-fade-in pb-10 flex justify-center">
        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col w-full max-w-2xl min-h-[500px]">
            <div className="bg-slate-900 p-5 flex justify-between items-center text-white relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-indigo-500"></div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setViewMode('EXPLORER')} className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-400 hover:text-white"><ArrowLeft size={20}/></button>
                    <div className="bg-indigo-600 p-2 rounded-xl shadow-lg"><Wand2 size={20}/></div>
                    <div>
                        <h3 className="text-lg font-black leading-none">AI Question Draftsman</h3>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">วิชา {qSubject} ({GRADE_LABELS[qGrade]})</p>
                    </div>
                </div>
                <button onClick={() => setViewMode('EXPLORER')} className="p-1.5 hover:bg-white/10 rounded-full transition"><X size={20}/></button>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50 p-4">
                {aiPreviewQuestions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-4">
                        <div className="bg-white p-6 rounded-[35px] border-2 border-dashed border-indigo-100 text-center w-full shadow-sm">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-3"><Sparkles size={28}/></div>
                            <h5 className="font-black text-indigo-900 mb-1 text-base">ระบุหัวข้อที่คุณต้องการ</h5>
                            <p className="text-slate-400 text-[10px] font-bold mb-4 italic">สร้างโจทย์ใหม่ 5 ข้อ ด้วยพลัง AI</p>
                            
                            <input 
                                type="text" 
                                value={aiTopic} 
                                onChange={e => setAiTopic(e.target.value)} 
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-400 outline-none font-black text-lg text-center bg-white shadow-inner transition-all mb-4" 
                                placeholder="เช่น การบวกเลข, แรงเสียดทาน" 
                            />

                            <button onClick={handleAiGenerate} disabled={isGeneratingAi || !qSubject || !aiTopic} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 transition active:scale-95 border-b-4 border-indigo-900 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isGeneratingAi ? <RefreshCw className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                                สร้างข้อสอบด้วย AI
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-slide-up flex flex-col h-full">
                        <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100 shrink-0">
                            <h4 className="font-black text-slate-800 text-xs flex items-center gap-2 ml-2"><List size={14} className="text-indigo-600"/> ตรวจสอบร่างโจทย์ ({aiPreviewQuestions.length} ข้อ)</h4>
                            <div className="flex gap-2">
                                <button onClick={()=>setAiPreviewQuestions([])} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg font-black text-[9px] hover:bg-slate-200 transition">เริ่มใหม่</button>
                                <button onClick={handleAiGenerate} disabled={isGeneratingAi} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[9px] border border-indigo-100 hover:bg-indigo-100 transition flex items-center gap-1">
                                    {isGeneratingAi ? <RefreshCw className="animate-spin" size={10}/> : <Sparkles size={10}/>} เพิ่มโจทย์
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[400px]">
                            {aiPreviewQuestions.map((q, i) => (
                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl relative group hover:border-indigo-300 shadow-sm transition-all">
                                    <button onClick={() => setAiPreviewQuestions(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 p-1 text-slate-200 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                                    <div className="font-black text-slate-800 mb-2 leading-relaxed pr-8 text-xs">
                                        <span className="text-indigo-500 mr-1">{i+1}.</span> {q.text}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pl-3 border-l-2 border-indigo-50">
                                        {[1,2,3,4].map(num => (
                                            <div key={num} className={`text-[10px] font-bold ${q.correct === String(num) ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {num}. {(q as any)[`c${num}`]}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white p-4 border-t border-slate-100 rounded-b-[40px] shadow-xl flex gap-3 shrink-0">
                            <button onClick={() => setViewMode('EXPLORER')} className="px-5 py-3 bg-slate-100 text-slate-500 rounded-xl font-black hover:bg-slate-200 transition text-sm">ยกเลิก</button>
                            <button onClick={handleConfirmAiQuestions} disabled={isProcessing} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-base shadow-lg hover:bg-emerald-700 transition active:scale-95 border-b-4 border-emerald-900 flex items-center justify-center gap-2">
                                {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                บันทึกลงคลังถาวร
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default QuestionBank;
