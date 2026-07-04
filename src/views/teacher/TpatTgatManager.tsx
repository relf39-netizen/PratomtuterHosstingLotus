import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Teacher, Assignment, ExamResult, Student, Question, AssignmentCategory } from '../../types';
import { 
  Sparkles, RefreshCw, 
  Save, History, X, List, 
  PlusCircle, Trash2, Eye, Clock,
  ChevronRight, Database, Send, CheckSquare, Square, Loader2
} from 'lucide-react';
// Fix: Updated import path to correctly point to services folder
import { generateQuestionWithAI, GeneratedQuestion } from '../../services/aiService';
// Added missing deleteQuestion to imports
import { addAssignment, addQuestion, deleteAssignment, deleteQuestion } from '../../services/api';
import { supabase } from '../../services/firebaseConfig';

interface TpatTgatManagerProps {
  teacher: Teacher;
  assignments: Assignment[];
  stats: ExamResult[];
  students: Student[];
  onRefresh: () => void;
}

const CATEGORIES = [
    { id: 'TGAT', label: 'TGAT (ความถนัดทั่วไป)', color: 'indigo', items: [
        { id: 'TGAT1', name: 'TGAT1 การสื่อสารภาษาอังกฤษ' },
        { id: 'TGAT2', name: 'TGAT2 การคิดอย่างมีเหตุผล' },
        { id: 'TGAT3', name: 'TGAT3 สมรรถนะการทำงาน' }
    ]},
    { id: 'TPAT', label: 'TPAT (ความถนัดวิชาชีพ)', color: 'rose', items: [
        { id: 'TPAT1', name: 'TPAT1 กสพท. (แพทย์)' },
        { id: 'TPAT2', name: 'TPAT2 ศิลปกรรมศาสตร์' },
        { id: 'TPAT3', name: 'TPAT3 วิทย์-เทคโนโลยี-วิศวะ' },
        { id: 'TPAT4', name: 'TPAT4 สถาปัตยกรรมศาสตร์' },
        { id: 'TPAT5', name: 'TPAT5 ครุศาสตร์/ศึกษาศาสตร์' }
    ]}
];

const TpatTgatManager: React.FC<TpatTgatManagerProps> = ({ 
    teacher, assignments: initialAssignments, stats: initialStats, students, onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'BANK' | 'MISSIONS' | 'STATS'>('BANK');
  const [selectedSubId, setSelectedSubId] = useState<string>('TGAT1');
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);

  // Selection for creating assignment
  const [selectedForMission, setSelectedForMission] = useState<string[]>([]);
  const [isCreatingMission, setIsCreatingMission] = useState(false);
  
  // AI & Manual Add
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempGenerated, setTempGenerated] = useState<GeneratedQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Mission Detail
  const [missionTitle, setMissionTitle] = useState('');
  const [missionDeadline, setMissionDeadline] = useState('');
  const [missionGrade, setMissionGrade] = useState<'M5' | 'M6'>('M6');

  // Tracking
  const [localAssignments] = useState<Assignment[]>(initialAssignments);
  const [localStats] = useState<ExamResult[]>(initialStats);
  const [selectedMissionForModal, setSelectedMissionForModal] = useState<Assignment | null>(null);

  useEffect(() => {
    loadBank();
  }, [selectedSubId]);

  const loadBank = async () => {
    setLoadingBank(true);
    try {
        // ดึงข้อสอบในหมวดที่เลือก เฉพาะของโรงเรียนเรา
        const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('school', teacher.school)
            .eq('subject', selectedSubId);
        
        const mapped = (data || []).map((q: any) => ({
            ...q,
            choices: typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices,
            correctChoiceId: String(q.correct_choice_id)
        }));
        setBankQuestions(mapped);
    } catch (e) { console.error(e); }
    setLoadingBank(false);
  };

  const handleAiGenToBank = async () => {
      if (!aiTopic) return alert("กรุณาระบุหัวข้อเรื่อง");
      setIsGenerating(true);
      try {
          const type = selectedSubId.startsWith('TGAT') ? 'tgat' : 'tpat';
          // Fix: Passing 'tgat' or 'tpat' as style is now valid due to aiService.ts update
          const generated = await generateQuestionWithAI(selectedSubId, 'M6', aiTopic, 5, type as any);
          if (generated) setTempGenerated(prev => [...prev, ...generated]);
      } catch (e: any) { alert(e.message); }
      setIsGenerating(false);
  };

  const saveTempToBank = async () => {
      setIsSaving(true);
      try {
          for (const q of tempGenerated) {
              await addQuestion({
                  subject: selectedSubId, grade: 'M6', text: q.text,
                  c1: q.c1, c2: q.c2, c3: q.c3, c4: q.c4,
                  correct: q.correct, explanation: q.explanation,
                  school: teacher.school, teacherId: String(teacher.id)
              });
          }
          alert("✅ เพิ่มโจทย์เข้าคลังเรียบร้อย");
          setTempGenerated([]); setShowAddModal(false); loadBank();
      } catch (e) { alert("เกิดข้อผิดพลาด"); }
      setIsSaving(false);
  };

  const handleCreateMissionFromBank = async () => {
      if (selectedForMission.length === 0) return alert("กรุณาเลือกโจทย์อย่างน้อย 1 ข้อ");
      if (!missionTitle || !missionDeadline) return alert("กรุณากรอกหัวข้อและวันส่งงาน");
      
      setIsSaving(true);
      try {
          const category = selectedSubId.startsWith('TGAT') ? 'TGAT' : 'TPAT';
          const res = await addAssignment(teacher.school, selectedSubId, missionGrade, selectedForMission.length, missionDeadline, teacher.name, `[${selectedSubId}] ${missionTitle}`, undefined, undefined, category as AssignmentCategory);
          
          if (res.id) {
              const selectedQuestions = bankQuestions.filter(q => selectedForMission.includes(q.id));
              for (const q of selectedQuestions) {
                  // คัดลอกโจทย์จากคลังมาเป็น Assignment Questions
                  await addQuestion({
                      subject: q.subject, grade: missionGrade, text: q.text, image: q.image || '',
                      c1: q.choices[0]?.text || '', c2: q.choices[1]?.text || '', 
                      c3: q.choices[2]?.text || '', c4: q.choices[3]?.text || '', 
                      correct: q.correctChoiceId, explanation: q.explanation,
                      school: teacher.school, teacherId: String(teacher.id), assignmentId: res.id
                  });
              }
              alert("✅ สร้างภารกิจจากคลังโจทย์เรียบร้อย");
              setIsCreatingMission(false); setSelectedForMission([]); setMissionTitle('');
              onRefresh();
          }
      } catch (e) { alert("เกิดข้อผิดพลาด"); }
      setIsSaving(false);
  };

  const toggleSelect = (id: string) => {
      setSelectedForMission(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const tcasMissions = useMemo(() => {
      return localAssignments.filter(a => a.category === 'TGAT' || a.category === 'TPAT').reverse();
  }, [localAssignments]);

  return (
    <div className="font-prompt animate-fade-in pb-10">
        {/* Main Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-[22px] mb-8 w-fit shadow-inner">
            <button onClick={() => setActiveTab('BANK')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'BANK' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Database size={18}/> คลังข้อสอบ TCAS</button>
            <button onClick={() => setActiveTab('MISSIONS')} className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'MISSIONS' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}><Send size={18}/> ภารกิจที่มอบหมาย</button>
        </div>

        {activeTab === 'BANK' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Category Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    {CATEGORIES.map(cat => (
                        <div key={cat.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className={`px-5 py-3 bg-${cat.color}-50 text-${cat.color}-700 font-black text-xs uppercase tracking-widest border-b border-${cat.color}-100`}>{cat.label}</div>
                            <div className="p-2 space-y-1">
                                {cat.items.map(sub => (
                                    <button 
                                        key={sub.id} 
                                        onClick={() => { setSelectedSubId(sub.id); setIsCreatingMission(false); }}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${selectedSubId === sub.id ? `bg-${cat.color}-600 text-white shadow-md` : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <span className="truncate pr-2">{sub.name}</span>
                                        <ChevronRight size={14} className={selectedSubId === sub.id ? 'text-white' : 'text-slate-300 group-hover:text-indigo-400'}/>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Bank Content */}
                <div className="lg:col-span-9 space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner`}><Database size={32}/></div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-800">{selectedSubId} Question Bank</h4>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">สะสมโจทย์คุณภาพสำหรับโรงเรียนของคุณ</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"><PlusCircle size={20}/> เพิ่มโจทย์เข้าคลัง</button>
                        </div>
                    </div>

                    {/* Question List area */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="font-black text-slate-700">รายการโจทย์ ({bankQuestions.length} ข้อ)</span>
                                {selectedForMission.length > 0 && (
                                    <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black animate-pulse border border-orange-200">เลือกอยู่ {selectedForMission.length} ข้อ</div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {isCreatingMission ? (
                                    <>
                                        <button onClick={() => setIsCreatingMission(false)} className="px-4 py-2 text-slate-400 font-black text-xs hover:underline">ยกเลิก</button>
                                        <button onClick={handleCreateMissionFromBank} disabled={isSaving} className="bg-orange-50 text-white px-6 py-2 rounded-xl font-black text-xs shadow-md hover:bg-orange-600 flex items-center gap-2">
                                            {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} ยืนยันมอบหมายภารกิจ
                                        </button>
                                    </>
                                ) : (
                                    bankQuestions.length > 0 && <button onClick={() => setIsCreatingMission(true)} className="bg-white border-2 border-orange-500 text-orange-600 px-6 py-2 rounded-xl font-black text-xs hover:bg-orange-50 transition shadow-sm">สร้างภารกิจจากคลัง</button>
                                )}
                            </div>
                        </div>

                        {/* Mission Creator Overlay Inputs */}
                        {isCreatingMission && (
                            <div className="p-6 bg-orange-50 border-b border-orange-100 animate-slide-up grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="block text-[10px] font-black text-orange-600 uppercase mb-1">หัวข้อภารกิจ</label><input type="text" value={missionTitle} onChange={e=>setMissionTitle(e.target.value)} placeholder="เช่น แบบฝึกหัดเสมือนจริงรอบที่ 1" className="w-full p-3 rounded-xl border border-orange-200 outline-none font-bold text-sm bg-white"/></div>
                                <div><label className="block text-[10px] font-black text-orange-600 uppercase mb-1">กำหนดส่ง</label><input type="date" value={missionDeadline} onChange={e=>setMissionDeadline(e.target.value)} className="w-full p-3 rounded-xl border border-orange-200 outline-none font-bold text-sm bg-white"/></div>
                                <div><label className="block text-[10px] font-black text-orange-600 uppercase mb-1">ระดับชั้น</label><select value={missionGrade} onChange={e=>setMissionGrade(e.target.value as any)} className="w-full p-3 rounded-xl border border-orange-200 outline-none font-bold text-sm bg-white"><option value="M5">ม.5</option><option value="M6">ม.6</option></select></div>
                            </div>
                        )}

                        <div className="p-6 space-y-4 flex-1">
                            {loadingBank ? (
                                <div className="flex flex-col items-center justify-center py-20 text-indigo-500"><Loader2 className="animate-spin mb-4" size={48}/><p className="font-bold">กำลังโหลดคลังข้อสอบ...</p></div>
                            ) : bankQuestions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-slate-300"><Database size={80} className="opacity-10 mb-4"/><p className="font-black text-lg italic">ยังไม่มีโจทย์ในคลังวิชานี้</p></div>
                            ) : (
                                bankQuestions.map((q, idx) => (
                                    <div key={q.id} className={`p-6 rounded-[30px] border-2 transition-all group relative ${selectedForMission.includes(q.id) ? 'border-orange-400 bg-orange-50/30' : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-indigo-200'}`}>
                                        <div className="flex gap-4">
                                            {isCreatingMission && (
                                                <button onClick={() => toggleSelect(q.id)} className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedForMission.includes(q.id) ? 'bg-orange-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-200'}`}>
                                                    {selectedForMission.includes(q.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                                </button>
                                            )}
                                            <div className="flex-1">
                                                <div className="font-black text-slate-800 text-lg mb-3 leading-relaxed">{idx + 1}. {q.text}</div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-500 font-bold pl-4 border-l-2 border-indigo-100">
                                                    {q.choices.map((c, ci) => (
                                                        <div key={ci} className={String(ci+1) === String(q.correctChoiceId) ? 'text-green-600' : ''}>{ci+1}. {c.text}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {!isCreatingMission && (
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={async () => { if(confirm('ลบโจทย์นี้จากคลัง?')) { await deleteQuestion(q.id); loadBank(); } }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'MISSIONS' && (
            <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-fade-in">
                <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                    <h4 className="font-black text-xl text-slate-700 flex items-center gap-3"><History size={26} className="text-orange-500"/> ประวัติภารกิจ TCAS</h4>
                    <button onClick={onRefresh} className="p-3 text-slate-400 hover:text-indigo-600 transition hover:bg-white rounded-2xl shadow-sm bg-slate-100"><RefreshCw size={20}/></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white text-slate-400 font-black border-b uppercase tracking-widest text-[10px]">
                            <tr><th className="p-8">หัวข้อชุดข้อสอบ</th><th className="p-8 text-center">ประเภท</th><th className="p-8 text-center">ระดับชั้น</th><th className="p-8 text-right">จัดการ</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tcasMissions.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-8">
                                        <div className="font-black text-slate-800 text-lg leading-tight">{a.title}</div>
                                        <div className="text-xs text-slate-400 mt-2 font-bold flex items-center gap-4">
                                            <span className="flex items-center gap-1.5"><Clock size={14}/> กำหนดส่ง {new Date(a.deadline).toLocaleDateString('th-TH')}</span>
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">{a.questionCount} ข้อ</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-center">
                                        <span className={`px-4 py-1.5 rounded-full font-black text-xs border ${a.category === 'TGAT' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{a.category}</span>
                                    </td>
                                    <td className="p-8 text-center"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-black text-xs">{a.grade}</span></td>
                                    <td className="p-8 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setSelectedMissionForModal(a)} className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition shadow-sm"><Eye size={20}/></button>
                                            <button onClick={async () => { if(confirm('ลบชุดภารกิจนี้?')) { await deleteAssignment(a.id); onRefresh(); } }} className="bg-red-50 text-red-500 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition shadow-sm"><Trash2 size={20}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {tcasMissions.length === 0 && (
                                <tr><td colSpan={4} className="p-32 text-center text-slate-300 font-black italic text-lg">ยังไม่มีประวัติการมอบหมายภารกิจ</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- MODAL: Add Question to Bank --- */}
        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
                <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                    <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
                        <h3 className="font-black text-2xl flex items-center gap-3"><Sparkles size={28}/> เพิ่มโจทย์เข้าคลัง {selectedSubId}</h3>
                        <button onClick={() => setShowAddModal(false)} className="hover:bg-white/20 p-2 rounded-full transition"><X/></button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                        <div className="mb-8 p-6 bg-white rounded-[35px] border-4 border-dashed border-indigo-100">
                            <label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest text-center">ให้ AI ช่วยร่างโจทย์จากหัวข้อที่คุณต้องการ</label>
                            <div className="flex flex-col gap-4">
                                <input type="text" value={aiTopic} onChange={e => setAiTopic(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-black text-lg text-center bg-slate-50 focus:bg-white transition shadow-inner" placeholder="เช่น Reading Comprehension, อนุกรมมิติ..." />
                                <button onClick={handleAiGenToBank} disabled={isGenerating || !aiTopic} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2 border-b-4 border-indigo-900">
                                    {isGenerating ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={20}/>} {tempGenerated.length > 0 ? 'สร้างเพิ่มอีก 5 ข้อ' : 'Gen ข้อสอบอัจฉริยะ'}
                                </button>
                            </div>
                        </div>

                        {tempGenerated.length > 0 && (
                            <div className="space-y-4 animate-slide-up">
                                <div className="flex justify-between items-center px-2"><h4 className="font-black text-slate-800 flex items-center gap-2"><List size={18}/> ตรวจสอบรายการ ({tempGenerated.length})</h4><button onClick={()=>setTempGenerated([])} className="text-xs text-red-500 font-bold">ล้างทั้งหมด</button></div>
                                {tempGenerated.map((q, i) => (
                                    <div key={i} className="p-5 bg-white border-2 border-slate-100 rounded-3xl relative group hover:border-indigo-300 transition-all shadow-sm">
                                        <button onClick={() => setTempGenerated(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                        <div className="font-black text-slate-800 mb-2">{i+1}. {q.text}</div>
                                        <div className="text-xs text-slate-500 font-bold flex flex-wrap gap-x-4">
                                            <span className={q.correct==='1'?'text-green-600':''}>1. {q.c1}</span><span className={q.correct==='2'?'text-green-600':''}>2. {q.c2}</span>
                                            <span className={q.correct==='3'?'text-green-600':''}>3. {q.c3}</span><span className={q.correct==='4'?'text-green-600':''}>4. {q.c4}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {tempGenerated.length > 0 && (
                        <div className="p-6 border-t bg-white flex-shrink-0">
                            <button onClick={saveTempToBank} disabled={isSaving} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-700 transition active:scale-95 flex items-center justify-center gap-3 border-b-4 border-emerald-800">
                                {isSaving ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>} บันทึกเข้าคลังโรงเรียน
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- MODAL: Mission Tracker (Details) --- */}
        {selectedMissionForModal && createPortal(
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-black text-2xl text-slate-800">{selectedMissionForModal.title}</h3>
                            <p className="text-sm text-slate-400 font-black mt-1 uppercase tracking-widest">{selectedMissionForModal.category} {selectedMissionForModal.subject} • ม.{selectedMissionForModal.grade}</p>
                        </div>
                        <button onClick={() => setSelectedMissionForModal(null)} className="text-slate-400 hover:text-red-500 transition p-2 rounded-full"><X size={28}/></button>
                    </div>
                    <div className="p-8 overflow-auto flex-1 bg-white custom-scrollbar">
                        <table className="w-full text-base text-left">
                            <thead className="bg-slate-50 text-slate-400 font-black border-b text-xs uppercase tracking-widest">
                                <tr><th className="p-6">ชื่อนักเรียน</th><th className="p-6 text-center">สถานะ</th><th className="p-6 text-right">คะแนน (Best)</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {students.filter(s => s.grade === selectedMissionForModal.grade).map(s => {
                                    // Fixed: Use localStats instead of non-existent 'stats' variable
                                    const r = localStats.filter(stat => String(stat.studentId) === String(s.id) && stat.assignmentId === selectedMissionForModal.id).sort((a,b)=>b.score - a.score)[0];
                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50 transition">
                                            <td className="p-6 flex items-center gap-4"><span className="text-3xl">{s.avatar}</span><span className="font-black text-slate-700">{s.name}</span></td>
                                            <td className="p-6 text-center">{r ? <span className="bg-emerald-50 text-emerald-600 px-4 py-1 rounded-full text-xs font-black border border-emerald-100">ส่งแล้ว</span> : <span className="text-slate-200 italic font-bold">ยังไม่ส่ง</span>}</td>
                                            <td className="p-6 text-right font-black text-indigo-600 text-xl">{r ? `${r.score}/${r.totalQuestions}` : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>, document.body
        )}
    </div>
  );
};

export default TpatTgatManager;