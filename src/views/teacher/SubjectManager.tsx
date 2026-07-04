
import React, { useState, useEffect, useMemo } from 'react';
import { SubjectConfig, Teacher, Classroom } from '../../types';
import { 
  List, PlusCircle, Book, Calculator, 
  Languages, Globe, Gamepad2, Palette, Trash2, 
  AlertCircle, RefreshCw, 
  HeartPulse,
  GraduationCap, BookOpen, Atom, Music, Zap
} from 'lucide-react';
import { addSubject, deleteSubject, getClassrooms, getAllTeachers } from '../../services/api';

interface SubjectManagerProps {
  subjects: SubjectConfig[];
  teacher: Teacher;
  canManageAll: boolean;
  myGrades: string[];
  onRefresh: () => void;
}

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
};

const SUBJECT_ICONS = [
    { name: 'Book', label: 'ภาษาไทย', component: <BookOpen size={20}/> },
    { name: 'Calculator', label: 'คณิตศาสตร์', component: <Calculator size={20}/> },
    { name: 'Microscope', label: 'วิทยาศาสตร์', component: <Atom size={20}/> },
    { name: 'Languages', label: 'ภาษาอังกฤษ', component: <Languages size={20}/> },
    { name: 'Globe', label: 'สังคมศึกษา', component: <Globe size={20}/> },
    { name: 'HeartPulse', label: 'สุขศึกษา', component: <HeartPulse size={20}/> },
    { name: 'Palette', label: 'ศิลปะ', component: <Palette size={20}/> },
    { name: 'Music', label: 'ดนตรี', component: <Music size={20}/> },
    { name: 'Computer', label: 'คอมพิวเตอร์', component: <Gamepad2 size={20}/> },
    { name: 'Zap', label: 'กิจกรรม', component: <Zap size={20}/> },
];

const CARD_COLORS = [
    { name: 'Indigo Blue', class: 'bg-indigo-50 border-indigo-200 text-indigo-600', accent: 'bg-indigo-600' },
    { name: 'Rose Pink', class: 'bg-rose-50 border-rose-200 text-rose-600', accent: 'bg-rose-600' },
    { name: 'Emerald Green', class: 'bg-emerald-50 border-emerald-200 text-emerald-600', accent: 'bg-emerald-600' },
    { name: 'Amber Gold', class: 'bg-amber-50 border-amber-200 text-amber-600', accent: 'bg-amber-600' },
    { name: 'Violet Purple', class: 'bg-violet-50 border-violet-200 text-violet-600', accent: 'bg-violet-600' },
    { name: 'Cyan Sky', class: 'bg-cyan-50 border-cyan-200 text-cyan-600', accent: 'bg-cyan-600' },
    { name: 'Orange Sun', class: 'bg-orange-50 border-orange-200 text-orange-600', accent: 'bg-orange-600' },
];

const SubjectManager: React.FC<SubjectManagerProps> = ({ subjects, teacher, canManageAll: _canManageAll, onRefresh }) => {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectIcon, setNewSubjectIcon] = useState('Book');
  const [newSubjectColor, setNewSubjectColor] = useState(CARD_COLORS[0].class);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [targetRooms, setTargetRooms] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [filterGrade, setFilterGrade] = useState<string>('ALL');

  useEffect(() => {
      fetchRooms();
      fetchTeachers();
  }, [teacher.school]);

  const fetchTeachers = async () => {
      try {
          const list = await getAllTeachers();
          setTeachersList(list.filter(t => t.school === teacher.school));
      } catch (err) {
          console.error("Fetch Teachers Error:", err);
      }
  };

  const fetchRooms = async () => {
      const data = await getClassrooms(teacher.school);
      setAllClassrooms(data);
      
      // กำหนดระดับชั้นเริ่มต้นให้ Form
      if (data.length > 0 && !selectedGrade) {
          const firstGrade = data.sort((a,b) => a.gradeLevel.localeCompare(b.gradeLevel))[0].gradeLevel;
          setSelectedGrade(firstGrade);
      }
  };

  // ดึงระดับชั้นทั้งหมดที่มีห้องเรียนในโรงเรียนนี้
  const availableGrades = useMemo(() => {
      const grades = new Set<string>();
      allClassrooms.forEach(c => grades.add(c.gradeLevel));
      return Array.from(grades).sort();
  }, [allClassrooms]);

  // เมื่อเปลี่ยนระดับชั้น ให้รีเซ็ตห้องที่เลือก (เลือกทั้งหมดของชั้นนั้นเป็นค่าเริ่มต้น)
  useEffect(() => {
      if (selectedGrade) {
          const roomsInGrade = allClassrooms
            .filter(c => c.gradeLevel === selectedGrade)
            .map(c => c.roomNumber);
          setTargetRooms(roomsInGrade);
      }
  }, [selectedGrade, allClassrooms]);

  const toggleRoom = (room: string) => {
      setTargetRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]);
  };

  const handleAddSubject = async () => {
      if (!newSubjectName) return alert('กรุณากรอกชื่อวิชา');
      if (!selectedGrade) return alert('กรุณาเลือกระดับชั้น');
      if (targetRooms.length === 0) return alert('กรุณาเลือกอย่างน้อย 1 ห้องเรียน');
      
      setIsProcessing(true);
      const selectedIds = allClassrooms
        .filter(c => c.gradeLevel === selectedGrade && targetRooms.includes(c.roomNumber))
        .map(c => c.id);
      
      const teacherIdStr = String(teacher.id || '').trim();
      const generatedId = crypto.randomUUID();

      const newSub: SubjectConfig = { 
          id: generatedId, 
          name: newSubjectName.trim(), 
          school: teacher.school, 
          teacherId: teacherIdStr, 
          grade: selectedGrade, 
          targetClassrooms: targetRooms, 
          targetClassroomIds: selectedIds, 
          icon: newSubjectIcon, 
          color: newSubjectColor 
      };
      
      try {
          const result = await addSubject(teacher.school, newSub);
          if (result.success) {
              alert('✅ เพิ่มวิชาเรียบร้อย');
              setNewSubjectName('');
              onRefresh();
          } else {
              alert('❌ ไม่สามารถสร้างรายวิชาได้: ' + (result.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'));
          }
      } catch (err: any) {
          alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const isDirector = useMemo(() => {
    const pos = teacher.position || '';
    const roles = (teacher.role || '').split(',');
    return roles.includes('DIRECTOR') || pos === 'ผู้อำนวยการโรงเรียน' || pos === 'รองผู้อำนวยการ';
  }, [teacher.position, teacher.role]);

  // กรองวิชา: แสดงวิชาที่ตนเองสร้างขึ้นมาเท่านั้น ห้ามนำวิชาครูคนอื่นมาแสดง ยกเว้นผู้อำนวยการโรงเรียนให้แสดงทั้งหมดและกรองระดับชั้นได้
  const mySubjects = useMemo(() => {
      const tid = String(teacher.id || '').trim();
      return subjects.filter(s => {
          const isMySchool = String(s.school).trim() === String(teacher.school).trim();
          if (!isMySchool) return false;

          if (isDirector) {
              if (filterGrade !== 'ALL' && s.grade !== filterGrade) return false;
              return true;
          } else {
              return String(s.teacherId).trim() === tid;
          }
      });
  }, [subjects, teacher.id, teacher.school, isDirector, filterGrade]);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in font-prompt px-2 pb-10">
        <div className="flex justify-between items-center mb-8 bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
            <div>
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg">
                        <List size={24}/>
                    </div>
                    จัดการรายวิชาที่คุณสอน
                </h3>
            </div>
            <button onClick={() => { fetchRooms(); onRefresh(); }} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:rotate-180 shadow-sm border border-slate-100">
                <RefreshCw size={22}/>
            </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden sticky top-24">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <h4 className="font-black text-slate-800 mb-8 flex items-center gap-2">
                        <PlusCircle className="text-indigo-600" size={24}/> ข้อมูลวิชาใหม่
                    </h4>
                    
                    {availableGrades.length === 0 ? (
                        <div className="bg-amber-50 p-6 rounded-3xl text-sm text-amber-700 font-bold border border-amber-100 leading-relaxed shadow-inner">
                            <AlertCircle className="inline mr-2" size={20}/> 
                            โรงเรียนนี้ยังไม่ได้ตั้งค่าห้องเรียน กรุณาไปที่เมนู "ตั้งค่าโรงเรียน" เพื่อเพิ่มห้องเรียนก่อนสร้างวิชาครับ
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ชื่อวิชาเรียน</label>
                                <input 
                                    type="text" 
                                    value={newSubjectName} 
                                    onChange={e => setNewSubjectName(e.target.value)} 
                                    className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-black text-slate-700 shadow-inner" 
                                    placeholder="เช่น คณิตศาสตร์ ป.6 (เพิ่มเติม)" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ระดับชั้น</label>
                                    <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-white text-sm font-black text-slate-700 outline-none focus:border-indigo-400 shadow-sm">
                                        {availableGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g] || g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">โทนสี</label>
                                    <select value={newSubjectColor} onChange={e => setNewSubjectColor(e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-white text-sm font-black text-slate-700 outline-none focus:border-indigo-400 shadow-sm">
                                        {CARD_COLORS.map(c => <option key={c.name} value={c.class}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5 ml-1">สัญลักษณ์ (Icon)</label>
                                <div className="grid grid-cols-5 gap-2.5 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                                    {SUBJECT_ICONS.map(i => (
                                        <button 
                                            key={i.name} 
                                            type="button"
                                            onClick={() => setNewSubjectIcon(i.name)} 
                                            className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-center ${newSubjectIcon === i.name ? 'border-indigo-500 bg-white text-indigo-600 scale-110 shadow-lg ring-4 ring-indigo-50' : 'border-transparent text-slate-300 hover:bg-white'}`}
                                        >
                                            {i.component}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[30px] border border-slate-100 shadow-inner">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">มอบหมายให้ห้องเรียน:</label>
                                <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {allClassrooms.filter(c => c.gradeLevel === selectedGrade).map(room => (
                                        <button 
                                            key={room.id} 
                                            type="button"
                                            onClick={() => toggleRoom(room.roomNumber)} 
                                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${targetRooms.includes(room.roomNumber) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                                        >
                                            ห้อง {room.roomNumber}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleAddSubject} 
                                disabled={isProcessing} 
                                className="w-full bg-indigo-600 text-white py-5 rounded-[25px] font-black text-xl shadow-xl hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border-b-8 border-indigo-900 mt-4"
                            >
                                {isProcessing ? <RefreshCw className="animate-spin" size={26}/> : <PlusCircle size={26}/>}
                                ยืนยันสร้างรายวิชา
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-8">
                <div className="bg-white p-10 rounded-[50px] border border-slate-200 shadow-sm min-h-[700px] flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-slate-50 pb-8">
                        <div>
                            <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                                <BookOpen className="text-emerald-500" size={28}/> 
                                {isDirector ? `รายวิชาทั้งหมดในโรงเรียน (${mySubjects.length})` : `รายวิชาในความดูแล (${mySubjects.length})`}
                            </h4>
                            {isDirector && (
                                <p className="text-xs text-indigo-600 font-bold mt-1">ในฐานะผู้อำนวยการโรงเรียน คุณสามารถติดตามดูรายวิชาของครูทุกคนได้</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {isDirector && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-500 shrink-0">เลือกระดับชั้น:</span>
                                    <select 
                                        value={filterGrade} 
                                        onChange={e => setFilterGrade(e.target.value)} 
                                        className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-400 shadow-sm shrink-0"
                                    >
                                        <option value="ALL">ทั้งหมดทุกชั้น</option>
                                        <option value="P1">ป.1</option>
                                        <option value="P2">ป.2</option>
                                        <option value="P3">ป.3</option>
                                        <option value="P4">ป.4</option>
                                        <option value="P5">ป.5</option>
                                        <option value="P6">ป.6</option>
                                        <option value="M1">ม.1</option>
                                        <option value="M2">ม.2</option>
                                        <option value="M3">ม.3</option>
                                    </select>
                                </div>
                            )}
                            <div className="bg-slate-100 px-5 py-2.5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 shrink-0">School Subjects</div>
                        </div>
                    </div>

                    {mySubjects.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-32 text-slate-200">
                            <div className="bg-slate-50 p-12 rounded-[60px] mb-8 shadow-inner">
                                <Book size={100} className="opacity-10"/>
                            </div>
                            <p className="text-xl font-black italic text-slate-300">ยังไม่มีรายวิชาที่ถูกสร้างขึ้น</p>
                            <p className="text-sm font-bold text-slate-300 mt-2">สร้างวิชาใหม่ได้ที่แผงด้านซ้ายมือครับ</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {mySubjects.map(sub => {
                                const colorConfig = CARD_COLORS.find(c => c.class === sub.color) || CARD_COLORS[0];
                                const creatorTeacher = teachersList.find(t => String(t.id).trim() === String(sub.teacherId).trim());
                                const creatorName = creatorTeacher ? creatorTeacher.name : 'ไม่ทราบชื่อครู';
                                return (
                                    <div key={sub.id} className={`p-8 rounded-[40px] border-2 shadow-sm transition-all group relative overflow-hidden flex flex-col h-full border-b-[12px] ${sub.color || 'bg-white border-slate-100'} hover:shadow-2xl hover:-translate-y-1.5`}>
                                        <div className={`absolute top-0 left-0 w-2.5 h-full ${colorConfig.accent} opacity-30`}></div>
                                        
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="p-5 bg-white/70 rounded-3xl shadow-sm border border-white/50 backdrop-blur-md">
                                                {SUBJECT_ICONS.find(i => i.name === sub.icon)?.component || <BookOpen size={24}/>}
                                            </div>
                                            <button 
                                                onClick={async () => { if(confirm('ยืนยันการลบวิชานี้?')) { await deleteSubject(teacher.school, sub.id); onRefresh(); } }} 
                                                className="p-3 bg-white/40 text-slate-400 hover:text-red-600 hover:bg-white rounded-2xl transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={22} />
                                            </button>
                                        </div>
                                        
                                        <h5 className="font-black text-xl text-slate-800 truncate mb-1">{sub.name}</h5>
                                        <p className="text-xs text-slate-500/80 font-black mb-5">ผู้สอน/ผู้สร้าง: {creatorName}</p>
                                        
                                        <div className="mt-auto bg-white/60 rounded-[30px] p-5 border border-white/60 backdrop-blur-xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-[11px] text-slate-500 font-black uppercase flex items-center gap-2 tracking-widest">
                                                    <GraduationCap size={16} className="text-indigo-500"/> ชั้น {GRADE_LABELS[sub.grade] || sub.grade}
                                                </div>
                                                <div className="bg-white px-3 py-1 rounded-xl text-[10px] font-black text-indigo-600 border border-indigo-100">
                                                    {sub.targetClassrooms?.length || 0} ห้อง
                                                </div>
                                            </div>
                                            <div className="text-xs font-black text-slate-600 line-clamp-1 leading-relaxed">
                                                {sub.targetClassrooms && sub.targetClassrooms.length > 0 
                                                    ? `ห้อง: ${sub.targetClassrooms.join(', ')}` 
                                                    : 'เปิดรับนักเรียนทุกห้อง'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default SubjectManager;
