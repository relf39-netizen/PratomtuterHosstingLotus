
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Student, Teacher, Classroom, School } from '../../types';
import { 
  UserPlus, Save, RefreshCw, ArrowLeft, GraduationCap, 
  Edit, Trash2, ShieldAlert, Users, Search, 
  AlertCircle, User, X,
  ChevronRight, Plus, Star
} from 'lucide-react';
import { manageStudent, getClassrooms } from '../../services/api';

interface StudentManagerProps {
  students: Student[];
  teacher: Teacher;
  canManageAll: boolean;
  schoolSettings: School | null;
  isDirector: boolean;
  onRefresh: () => void;
}

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'GRADUATED': 'จบการศึกษา', 'ALL': 'ทุกชั้น' 
};

const GRADE_SEQUENCE = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3', 'GRADUATED'];

const StudentManager: React.FC<StudentManagerProps> = ({ 
  students, teacher, canManageAll, schoolSettings, isDirector, onRefresh 
}) => {
  const [viewLevel, setViewLevel] = useState<'CLASS_SELECT' | 'LIST'>('CLASS_SELECT');
  
  // Filter States
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string | null>(null);
  const [selectedClassroomFilter, setSelectedClassroomFilter] = useState<string>('1');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAvatar, setFormAvatar] = useState('👦');
  const [formGrade, setFormGrade] = useState('P1');
  const [formRoom, setFormRoom] = useState('1');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
      const fetchRooms = async () => {
          const data = await getClassrooms(teacher.school);
          setAllClassrooms(data);
          // Default selection if data exists
          if (data.length > 0 && !selectedGradeFilter) {
              setFormGrade(data[0].gradeLevel);
              setFormRoom(data[0].roomNumber);
          }
      };
      fetchRooms();
  }, [teacher.school]);

  const myClassrooms = useMemo(() => {
      const classes = new Set<string>();
      if (teacher.advisorClass) classes.add(teacher.advisorClass);
      if (teacher.teachingClasses && Array.isArray(teacher.teachingClasses)) {
          teacher.teachingClasses.forEach(cls => {
              if (cls && typeof cls === 'string') classes.add(cls);
          });
      }
      return Array.from(classes).sort();
  }, [teacher]);

  const canEditSelected = (grade?: string, room?: string) => {
      if (canManageAll || isDirector) return true; 
      if (schoolSettings?.allowAllManageStudents) return true; 
      const target = grade && room ? `${grade}/${room}` : `${selectedGradeFilter}/${selectedClassroomFilter}`;
      return teacher.advisorClass === target || myClassrooms.includes(target);
  };

  const openAddModal = (grade?: string, room?: string) => {
      setEditingStudentId(null);
      setFormName('');
      setFormAvatar('👦');
      setFormUsername('');
      setFormPassword('');
      
      // ลอจิกการเลือกห้องเริ่มต้นใน Modal
      if (grade && room) {
          setFormGrade(grade);
          setFormRoom(room);
      } else if (selectedGradeFilter && selectedClassroomFilter) {
          setFormGrade(selectedGradeFilter);
          setFormRoom(selectedClassroomFilter);
      } else if (allClassrooms.length > 0) {
          setFormGrade(allClassrooms[0].gradeLevel);
          setFormRoom(allClassrooms[0].roomNumber);
      }
      
      setShowFormModal(true);
  };

  const handleEditStudent = (s: Student) => {
      setEditingStudentId(s.id);
      setFormName(s.name);
      setFormAvatar(s.avatar);
      setFormGrade(s.grade || 'P1');
      setFormRoom(s.classroom || '1');
      setFormUsername(s.username || '');
      setFormPassword(s.password || '');
      setShowFormModal(true);
  };

  const handleSaveStudent = async () => {
      if (!formName) return;
      setIsSaving(true);
      
      const payload = {
          id: editingStudentId || undefined,
          action: editingStudentId ? 'edit' : 'add',
          name: formName.trim(),
          username: formUsername.trim(),
          password: formPassword.trim(),
          avatar: formAvatar,
          grade: formGrade,
          classroom: formRoom,
          school: teacher.school
      };

      const result = await manageStudent(payload);
      if (result.success) {
          alert(editingStudentId ? '✅ แก้ไขข้อมูลเรียบร้อย' : '✅ เพิ่มนักเรียนใหม่เรียบร้อย');
          setShowFormModal(false);
          onRefresh();
      } else {
          alert('❌ ผิดพลาด: ' + (result.message || 'ไม่สามารถดำเนินการได้'));
      }
      setIsSaving(false);
  };

  const handleResetStars = async (id: string, name: string) => {
      if (!confirm(`ยืนยันการรีเซ็ต "ดาวสะสม" ของ ${name} ให้เป็น 0?`)) return;
      const result = await manageStudent({ action: 'reset_stars', id });
      if (result.success) onRefresh();
      else alert('ผิดพลาด: ' + (result.message || ''));
  };

  const handleResetScores = async (id: string, name: string) => {
      if (!confirm(`ยืนยันการรีเซ็ต "คะแนนการสอบ" ทั้งหมดของ ${name}?\n*ข้อมูลประวัติการทำข้อสอบจะหายไปถาวร`)) return;
      const result = await manageStudent({ action: 'reset_scores', id });
      if (result.success) onRefresh();
      else alert('ผิดพลาด: ' + (result.message || ''));
  };

  const handleChangePassword = async (id: string, name: string) => {
      const newPass = prompt(`กำหนดรหัสผ่านใหม่ให้ ${name}:`, '');
      if (newPass === null) return;
      const result = await manageStudent({ action: 'change_password', id, password: newPass });
      if (result.success) {
          alert('✅ เปลี่ยนรหัสผ่านเรียบร้อย');
          onRefresh();
      } else alert('ผิดพลาด: ' + (result.message || ''));
  };

  const handleDeleteStudent = async (id: string) => {
      if (!confirm('ยืนยันการลบนักเรียนคนนี้? ข้อมูลคะแนนทั้งหมดจะหายไปถาวร')) return;
      const result = await manageStudent({ action: 'delete', id });
      if (result.success) onRefresh();
      else alert('ลบไม่สำเร็จ: ' + (result.message || ''));
  };

  const handlePromoteGrade = async () => {
      if (!selectedGradeFilter) return;
      const currentIndex = GRADE_SEQUENCE.indexOf(selectedGradeFilter);
      if (currentIndex === -1 || currentIndex >= GRADE_SEQUENCE.length - 1) {
          return alert('ไม่สามารถเลื่อนชั้นเรียนจากระดับนี้ได้');
      }
      
      const nextGrade = GRADE_SEQUENCE[currentIndex + 1];
      const nextGradeLabel = GRADE_LABELS[nextGrade];
      const currentGradeLabel = GRADE_LABELS[selectedGradeFilter];
      
      const studentsInClass = filteredStudents.filter(s => s.grade === selectedGradeFilter && s.classroom === selectedClassroomFilter);
      if (studentsInClass.length === 0) return alert('ไม่พบนักเรียนในห้องนี้');

      if (!confirm(`ยืนยันการเลื่อนชั้นเรียนนักเรียนจำนวน ${studentsInClass.length} คน\nจาก ${currentGradeLabel} ไปยัง ${nextGradeLabel}?\n\n*นักเรียนจะยังคงอยู่ห้องเดิม (${selectedClassroomFilter}) แต่เปลี่ยนระดับชั้น`)) return;

      setIsPromoting(true);
      const studentIds = studentsInClass.map(s => s.id);
      const result = await manageStudent({ 
          action: 'promote_bulk', 
          studentIds, 
          newGrade: nextGrade 
      });

      if (result.success) {
          alert(`✅ เลื่อนชั้นเรียนเป็น ${nextGradeLabel} เรียบร้อยแล้ว`);
          onRefresh();
          if (nextGrade === 'GRADUATED') {
              setViewLevel('CLASS_SELECT');
          } else {
              setSelectedGradeFilter(nextGrade);
          }
      } else {
          alert('❌ ผิดพลาด: ' + (result.message || 'ไม่สามารถเลื่อนชั้นเรียนได้'));
      }
      setIsPromoting(false);
  };

  const filteredStudents = useMemo(() => {
      return students.filter(s => {
          const matchClass = viewLevel === 'LIST' 
            ? (selectedGradeFilter ? s.grade === selectedGradeFilter : true) && (selectedClassroomFilter ? s.classroom === selectedClassroomFilter : true)
            : true;
          const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.includes(searchQuery);
          return matchClass && matchSearch;
      }).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [students, viewLevel, selectedGradeFilter, selectedClassroomFilter, searchQuery]);

  const getRoomsForGrade = (grade: string) => {
      return allClassrooms
          .filter(c => c.gradeLevel === grade)
          .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
  };

  const hasNoAssignedRooms = myClassrooms.length === 0 && !canManageAll && !isDirector && !schoolSettings?.allowAllManageStudents;

  return (
    <div className="animate-fade-in font-prompt">
        {/* TOP HEADER ACTIONS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-inner">
                    <Users size={28}/>
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-800 leading-none">จัดการข้อมูลนักเรียน</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1.5">Student Records & Management</p>
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={() => openAddModal()} 
                    className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-2 border-b-4 border-indigo-900"
                >
                    <UserPlus size={18}/> เพิ่มนักเรียนใหม่
                </button>
                <button onClick={onRefresh} className="p-3.5 bg-slate-50 text-slate-500 hover:text-indigo-600 rounded-2xl transition shadow-sm border border-slate-100"><RefreshCw size={20}/></button>
            </div>
        </div>

        {viewLevel === 'CLASS_SELECT' ? (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(canManageAll || isDirector || schoolSettings?.allowAllManageStudents) && (
                        <button 
                            onClick={() => { setSelectedGradeFilter('P1'); setSelectedClassroomFilter('1'); setViewLevel('LIST'); }}
                            className="bg-slate-900 text-white rounded-[40px] p-8 text-left shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all relative overflow-hidden group border-b-8 border-indigo-500"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><ShieldAlert size={120}/></div>
                            <h4 className="text-2xl font-black mb-1">นักเรียนทั้งโรงเรียน</h4>
                            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Global Access Control</p>
                            <div className="mt-8 flex items-center gap-2 text-indigo-400 font-black text-sm uppercase">
                                <span>เปิดจัดการข้อมูล</span> <ChevronRight size={16}/>
                            </div>
                        </button>
                    )}

                    {myClassrooms.map(cls => {
                        const isAdvisor = cls === teacher.advisorClass;
                        const [g, r] = cls.split('/');
                        const studentCount = students.filter(s => s.grade === g && s.classroom === r).length;

                        return (
                            <button 
                                key={cls}
                                onClick={() => { setSelectedGradeFilter(g); setSelectedClassroomFilter(r); setViewLevel('LIST'); }}
                                className={`rounded-[40px] p-8 text-left shadow-lg transition-all relative overflow-hidden group border-b-8 ${isAdvisor ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-indigo-950' : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-300 hover:-translate-y-1'}`}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Users size={120}/></div>
                                <div className="relative z-10">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">{isAdvisor ? 'ห้องที่คุณเป็นครูประจำชั้น' : 'ห้องที่คุณเข้าสอน'}</div>
                                    <h4 className="text-3xl font-black mb-1">ชั้น {GRADE_LABELS[g] || g}/{r}</h4>
                                    <div className={`mt-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isAdvisor ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                                        <User size={14}/> {studentCount} นักเรียน
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {/* Empty State Card if no rooms assigned */}
                    {hasNoAssignedRooms && (
                        <div className="col-span-full py-16 px-8 text-center bg-white rounded-[45px] border-4 border-dashed border-slate-100 flex flex-col items-center gap-6">
                            <div className="bg-amber-50 p-6 rounded-full text-amber-500 animate-pulse">
                                <AlertCircle size={48}/>
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-800">ไม่พบข้อมูลห้องเรียนที่คุณรับผิดชอบ</h4>
                                <p className="text-slate-500 font-medium text-sm mt-2 max-w-md mx-auto">
                                    คุณครูสามารถระบุห้องเรียนที่สอนได้ที่เมนู <b>"ข้อมูลของฉัน"</b> หรือกดปุ่มด้านล่างเพื่อเริ่มเพิ่มรายชื่อนักเรียนรายบุคคลได้ทันทีครับ
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={() => openAddModal()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition flex items-center gap-2">
                                    <Plus size={20}/> เพิ่มนักเรียนคนแรก
                                </button>
                                <button onClick={() => onRefresh()} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition">
                                    รีเฟรชข้อมูล
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            /* LIST VIEW */
            <div className="space-y-6 animate-slide-up">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewLevel('CLASS_SELECT')} className="p-2 bg-white text-slate-500 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100 transition"><ArrowLeft size={20}/></button>
                        <div>
                            <h4 className="text-xl font-black text-slate-800 leading-tight">ชั้น {GRADE_LABELS[selectedGradeFilter || ''] || selectedGradeFilter}/{selectedClassroomFilter}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Student Roster</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                        {(canManageAll || isDirector) && selectedGradeFilter !== 'GRADUATED' && (
                            <button 
                                onClick={handlePromoteGrade}
                                disabled={isPromoting || filteredStudents.length === 0}
                                className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-100 transition flex items-center gap-2 border border-emerald-100 disabled:opacity-50"
                            >
                                {isPromoting ? <RefreshCw size={18} className="animate-spin"/> : <GraduationCap size={18}/>}
                                เลื่อนชั้นเรียน
                            </button>
                        )}
                        <div className="relative flex-1 lg:w-64">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="ค้นหาชื่อ หรือ รหัส..."
                                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-400 outline-none transition font-bold text-sm shadow-sm"
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18}/>
                        </div>
                        {(canManageAll || isDirector || schoolSettings?.allowAllManageStudents) && (
                            <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                                <select value={selectedGradeFilter || ''} onChange={e => setSelectedGradeFilter(e.target.value)} className="bg-slate-50 rounded-xl px-3 py-2 text-xs font-black text-slate-600 outline-none">
                                    {Object.entries(GRADE_LABELS).filter(([k]) => k !== 'ALL').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <select value={selectedClassroomFilter} onChange={e => setSelectedClassroomFilter(e.target.value)} className="bg-slate-50 rounded-xl px-3 py-2 text-xs font-black text-slate-600 outline-none">
                                    {getRoomsForGrade(selectedGradeFilter || 'P1').map(c => (<option key={c.id} value={c.roomNumber}>ห้อง {c.roomNumber}</option>))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="p-6">ข้อมูลนักเรียน</th>
                                <th className="p-6 text-center">รหัสประจำตัว</th>
                                <th className="p-6 text-center">คะแนนสะสม</th>
                                <th className="p-6 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-24 text-center text-slate-300 font-black italic">
                                        <Users size={60} className="mx-auto mb-4 opacity-10"/>
                                        ไม่พบข้อมูลนักเรียนในเงื่อนไขนี้
                                    </td>
                                </tr>
                            ) : filteredStudents.map((s) => (
                                <tr key={s.id} className="group hover:bg-indigo-50/30 transition-all">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">{s.avatar}</div>
                                            <div>
                                                <div className="font-black text-slate-800 text-lg leading-tight">{s.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">ชั้น {GRADE_LABELS[s.grade || ''] || s.grade}/{s.classroom}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-indigo-600 font-mono text-sm font-black shadow-sm">
                                            {s.id}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full font-black text-sm border border-amber-100">
                                            <Star size={14} fill="currentColor"/> {s.stars || 0}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {(canManageAll || isDirector || teacher.advisorClass === `${s.grade}/${s.classroom}`) && (
                                                <>
                                                    <button onClick={() => handleChangePassword(s.id, s.name)} title="เปลี่ยนรหัสผ่าน" className="p-3 bg-white text-indigo-500 rounded-xl border border-slate-100 shadow-sm hover:bg-indigo-500 hover:text-white transition active:scale-90"><ShieldAlert size={18}/></button>
                                                    <button onClick={() => handleResetStars(s.id, s.name)} title="รีเซ็ตดาว" className="p-3 bg-white text-amber-500 rounded-xl border border-slate-100 shadow-sm hover:bg-amber-500 hover:text-white transition active:scale-90"><Star size={18}/></button>
                                                    <button onClick={() => handleResetScores(s.id, s.name)} title="รีเซ็ตคะแนน" className="p-3 bg-white text-blue-500 rounded-xl border border-slate-100 shadow-sm hover:bg-blue-500 hover:text-white transition active:scale-90"><RefreshCw size={18}/></button>
                                                </>
                                            )}
                                            <button onClick={() => handleEditStudent(s)} title="แก้ไขข้อมูล" className="p-3 bg-white text-orange-500 rounded-xl border border-slate-100 shadow-sm hover:bg-orange-500 hover:text-white transition active:scale-90"><Edit size={18}/></button>
                                            <button onClick={() => handleDeleteStudent(s.id)} title="ลบนักเรียน" className="p-3 bg-white text-red-500 rounded-xl border border-slate-100 shadow-sm hover:bg-red-500 hover:text-white transition active:scale-90"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- ADD / EDIT MODAL --- */}
        {showFormModal && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in font-prompt">
                <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col relative border-b-[12px] border-indigo-100 animate-scale-in">
                    <div className="bg-slate-900 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-5 -translate-y-5"><UserPlus size={120}/></div>
                        <h3 className="text-2xl font-black mb-1 flex items-center gap-3">
                            {editingStudentId ? <Edit/> : <UserPlus/>} 
                            {editingStudentId ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
                        </h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                            {editingStudentId ? `ID: ${editingStudentId}` : 'Register new student to system'}
                        </p>
                        <button onClick={() => setShowFormModal(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex justify-center mb-4">
                            <div className="relative group cursor-pointer" onClick={() => setFormAvatar(formAvatar === '👦' ? '👧' : '👦')}>
                                <div className="text-7xl bg-slate-50 p-6 rounded-[35px] border-4 border-slate-100 shadow-inner group-hover:scale-105 transition-transform">{formAvatar}</div>
                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white"><RefreshCw size={14}/></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">ชื่อ-นามสกุล (ไม่ใส่ ด.ช./ด.ญ.)</label>
                                <div className="relative">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={formName} 
                                        onChange={e => setFormName(e.target.value)} 
                                        className="w-full p-4 pl-12 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition font-black text-slate-700 bg-slate-50 focus:bg-white shadow-inner" 
                                        placeholder="เช่น มานะ อดทน" 
                                    />
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={20}/>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">ชื่อผู้ใช้งาน (Username)</label>
                                    <input 
                                        type="text" 
                                        value={formUsername} 
                                        onChange={e => setFormUsername(e.target.value)} 
                                        className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm" 
                                        placeholder="Username นักเรียน"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">รหัสผ่าน (Password)</label>
                                    <input 
                                        type="text" 
                                        value={formPassword} 
                                        onChange={e => setFormPassword(e.target.value)} 
                                        className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm"
                                        placeholder="รหัสผ่าน"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">ระดับชั้น</label>
                                    <select value={formGrade} onChange={e => setFormGrade(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm">
                                        {Object.entries(GRADE_LABELS).filter(([k]) => k !== 'ALL' && k !== 'GRADUATED').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">ห้องเรียน</label>
                                    <select value={formRoom} onChange={e => setFormRoom(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm">
                                        {getRoomsForGrade(formGrade).map(c => (<option key={c.id} value={c.roomNumber}>ห้อง {c.roomNumber}</option>))}
                                        {getRoomsForGrade(formGrade).length === 0 && <option value="1">ห้อง 1</option>}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {!canEditSelected(formGrade, formRoom) && (
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex gap-3 items-start animate-shake">
                                <ShieldAlert className="text-amber-500 shrink-0" size={20}/>
                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">คำเตือน: คุณไม่ได้เป็นครูประจำชั้นห้องนี้ แต่สามารถเพิ่มข้อมูลได้เนื่องจากได้รับสิทธิ์พิเศษจากโรงเรียน</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setShowFormModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition">ยกเลิก</button>
                            <button 
                                onClick={handleSaveStudent} 
                                disabled={isSaving || !formName}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border-b-4 border-indigo-900"
                            >
                                {isSaving ? <RefreshCw className="animate-spin" size={24}/> : <Save size={24}/>} 
                                {editingStudentId ? 'บันทึกแก้ไข' : 'ยืนยันเพิ่มนักเรียน'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>, document.body
        )}
    </div>
  );
};

export default StudentManager;
