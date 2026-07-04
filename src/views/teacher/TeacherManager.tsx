
import React, { useState, useEffect } from 'react';
import { Teacher, RegistrationRequest } from '../../types';
import { UserCog, CheckCircle, Save, User, Trash2, Award, Briefcase, RefreshCw, ShieldAlert, X, Loader2, GraduationCap, Check, UserPlus, ShieldCheck, Shield } from 'lucide-react';
import { supabase } from '../../services/firebaseConfig';
import { manageTeacher, approveRegistration, rejectRegistration } from '../../services/api';

interface TeacherManagerProps {
  schoolName: string;
  currentAdminId: string;
}

const ROLES = [
    { id: 'TEACHER', label: 'ครูผู้สอน / ครูประจำชั้น' },
    { id: 'DIRECTOR', label: 'ผู้อำนวยการ / ผู้บริหารโรงเรียน' },
    { id: 'SCHOOL_ADMIN', label: 'ผู้ดูแลระบบโรงเรียน (Admin)' }
];

const GRADES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3', 'ALL'];
const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกระดับชั้น' 
};

const TeacherManager: React.FC<TeacherManagerProps> = ({ schoolName, currentAdminId }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  
  // Approval Modal States
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [targetRoles, setTargetRoles] = useState<string[]>(['TEACHER']);
  const [targetGrade, setTargetGrade] = useState('ALL');
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Role Modal States
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [newRoles, setNewRoles] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [schoolName]);

  const loadData = async () => {
    try {
        const { data: tData } = await supabase.from('teachers').select('*').eq('school', schoolName).order('name');
        const { data: schoolData } = await supabase.from('schools').select('id').eq('name', schoolName).single();
        
        if (tData) {
            setTeachers(tData.map((t: any) => ({
                ...t,
                advisorClass: t.advisor_class, 
                gradeLevel: t.grade_level,
                teachingClasses: t.teaching_classes ? (typeof t.teaching_classes === 'string' ? JSON.parse(t.teaching_classes) : t.teaching_classes) : []
            })));
        }

        if (schoolData) {
            const { data: rData } = await supabase.from('registration_requests').select('*').eq('school_id', schoolData.id).eq('status', 'pending').eq('type', 'TEACHER');
            if (rData) {
                setRequests(rData.map((r:any) => ({ ...r, citizenId: r.citizen_id, schoolId: r.school_id })));
            }
        }
    } catch (e) { console.error(e); }
  };

  const handleApproveConfirm = async () => {
      if (!selectedRequest) return;
      setIsProcessing(true);
      const rolesString = targetRoles.join(',');
      const success = await approveRegistration(selectedRequest, rolesString, targetGrade, schoolName);
      if (success) {
          alert("✅ อนุมัติคุณครูเรียบร้อยแล้ว รหัสผ่านเริ่มต้นคือ 123456");
          setSelectedRequest(null);
          loadData();
      } else {
          alert("❌ เกิดข้อผิดพลาดในการอนุมัติ");
      }
      setIsProcessing(false);
  };

  const handleUpdateRole = async () => {
      if (!editingTeacher || newRoles.length === 0) return;
      setIsProcessing(true);
      const rolesString = newRoles.join(',');
      const res = await manageTeacher('update_role', { id: editingTeacher.id, role: rolesString });
      if (res.success) {
          alert("✅ ปรับปรุงสิทธิ์เรียบร้อยแล้ว");
          setEditingTeacher(null);
          loadData();
      } else {
          alert("❌ ไม่สามารถปรับปรุงสิทธิ์ได้");
      }
      setIsProcessing(false);
  };

  const handleDeleteTeacher = async (t: Teacher) => {
      if (String(t.id) === currentAdminId) return alert("ไม่สามารถลบตัวเองได้");
      if (!confirm(`ยืนยันการลบข้อมูลคุณครู ${t.name} ออกจากระบบถาวร?`)) return;
      await supabase.from('teachers').delete().eq('id', t.id);
      loadData();
  };

  return (
    <div className="animate-fade-in font-prompt">
        <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div className="bg-cyan-100 p-2.5 rounded-2xl text-cyan-600"><UserCog size={28}/></div>
                บริหารจัดการบุคลากรโรงเรียน
            </h3>
            <button onClick={loadData} className="p-3 bg-slate-50 text-slate-400 hover:text-cyan-600 rounded-2xl transition-all active:rotate-180 duration-500 shadow-sm border border-slate-100"><RefreshCw size={22}/></button>
        </div>

        {/* --- Section: Pending Teacher Requests --- */}
        {requests.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-100 rounded-[35px] p-8 mb-10 shadow-sm animate-slide-up relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><UserPlus size={100}/></div>
                <h4 className="font-black text-rose-800 mb-6 flex items-center gap-2 uppercase tracking-tight relative z-10"><ShieldAlert size={22}/> คำขอสมัครสมาชิกจากครูใหม่ ({requests.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white p-6 rounded-[30px] border border-rose-200 flex justify-between items-center shadow-sm group hover:border-rose-400 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 font-black shrink-0"><GraduationCap size={28}/></div>
                                <div>
                                    <div className="font-black text-slate-800 text-lg leading-tight">{req.name} {req.surname}</div>
                                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-tighter mt-1"><Briefcase size={12}/> {req.position}</div>
                                    <div className="text-[9px] text-indigo-400 font-bold uppercase mt-0.5">Username: {req.citizenId}</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setSelectedRequest(req); setTargetRoles(['TEACHER']); }} className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 shadow-md shadow-green-100 transition active:scale-95">ตรวจสอบและอนุมัติ</button>
                                <button onClick={() => rejectRegistration(req.id).then(loadData)} className="p-2.5 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition active:scale-95"><X size={20}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- Teacher List Table --- */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr><th className="p-6">รายชื่อบุคลากร</th><th className="p-6 text-center">สิทธิ์การใช้งาน</th><th className="p-6 text-center">ชั้นเรียนที่ดูแล</th><th className="p-6 text-right">จัดการ</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {teachers.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">{t.name.charAt(0)}</div>
                                        <div>
                                            <div className="font-black text-slate-800 text-lg leading-tight flex items-center gap-2">{t.name} {String(t.id) === currentAdminId && <span className="bg-emerald-100 text-emerald-700 text-[8px] px-2 py-0.5 rounded-full uppercase font-black">Admin หลัก</span>}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t.position || 'ตำแหน่งครู'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-center">
                                    <div className="flex flex-wrap justify-center gap-1">
                                        {(t.role || 'TEACHER').split(',').map(roleKey => {
                                            const role = ROLES.find(r => r.id === roleKey.trim());
                                            if (!role) return null;
                                            return (
                                                <span key={roleKey} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                    roleKey === 'SCHOOL_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                                    roleKey === 'DIRECTOR' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}>
                                                    {role.label.split(' / ')[0]}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </td>
                                <td className="p-6 text-center font-bold text-slate-600 text-sm">{GRADE_LABELS[t.gradeLevel || ''] || t.gradeLevel}</td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-2 transition-all">
                                        {/* ✅ ปรับให้ icon ปรับบทบาทชัดเจนขึ้นและแสดงตลอดเวลา */}
                                        <button 
                                            onClick={() => { 
                                                setEditingTeacher(t); 
                                                setNewRoles((t.role || 'TEACHER').split(',').map(r => r.trim())); 
                                            }} 
                                            className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90 border border-indigo-100 flex items-center gap-1.5" 
                                            title="ปรับบทบาท/สิทธิ์"
                                        >
                                            <ShieldCheck size={18}/>
                                            <span className="text-[9px] font-black uppercase md:inline hidden">Role</span>
                                        </button>
                                        
                                        {String(t.id) !== currentAdminId && (
                                            <button 
                                                onClick={() => handleDeleteTeacher(t)} 
                                                className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm active:scale-90 border border-rose-100"
                                                title="ลบออกจากระบบ"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- ROLE EDIT MODAL --- */}
        {editingTeacher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-md overflow-hidden border-b-[12px] border-indigo-100">
                    <div className="p-8 bg-slate-900 text-white relative">
                        <h3 className="text-2xl font-black mb-1">เปลี่ยนสิทธิ์การเข้าถึง</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{editingTeacher.name}</p>
                        <button onClick={() => setEditingTeacher(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"><X size={20}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 gap-3">
                            {ROLES.map(role => {
                                const isSelected = newRoles.includes(role.id);
                                return (
                                    <button 
                                        key={role.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                if (newRoles.length > 1) {
                                                    setNewRoles(newRoles.filter(r => r !== role.id));
                                                }
                                            } else {
                                                setNewRoles([...newRoles, role.id]);
                                            }
                                        }}
                                        className={`p-5 rounded-3xl font-black text-sm transition-all flex items-center justify-between border-2 ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-indigo-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-200'}`}>
                                                {role.id === 'DIRECTOR' ? <Award size={18}/> : role.id === 'SCHOOL_ADMIN' ? <Shield size={18}/> : <User size={18}/>}
                                            </div>
                                            {role.label}
                                        </div>
                                        {isSelected ? <CheckCircle size={20}/> : <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>}
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                            disabled={isProcessing}
                            onClick={handleUpdateRole}
                            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border-b-8 border-indigo-900"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <Save size={24}/>} ยืนยันการเปลี่ยนแปลง
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- APPROVAL MODAL --- */}
        {selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-md overflow-hidden border-b-[12px] border-indigo-100">
                    <div className="p-8 bg-slate-900 text-white relative">
                        <h3 className="text-2xl font-black mb-1">อนุมัติและกำหนดบทบาท</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Candidate: {selectedRequest.name} {selectedRequest.surname}</p>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 text-center">1. เลือกบทบาทในโรงเรียน</label>
                            <div className="grid grid-cols-1 gap-2">
                                {ROLES.map(role => {
                                    const isSelected = targetRoles.includes(role.id);
                                    return (
                                        <button 
                                            key={role.id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    if (targetRoles.length > 1) {
                                                        setTargetRoles(targetRoles.filter(r => r !== role.id));
                                                    }
                                                } else {
                                                    setTargetRoles([...targetRoles, role.id]);
                                                }
                                            }}
                                            className={`p-4 rounded-2xl font-black text-sm transition-all flex items-center justify-between border-2 ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-indigo-200'}`}
                                        >
                                            {role.label}
                                            {isSelected ? <CheckCircle size={18}/> : <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 text-center">2. ระดับชั้นที่รับผิดชอบ</label>
                            <select value={targetGrade} onChange={e => setTargetGrade(e.target.value)} className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 font-black text-slate-700 outline-none focus:border-indigo-500">
                                {GRADES.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setSelectedRequest(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition">ยกเลิก</button>
                            <button 
                                disabled={isProcessing}
                                onClick={handleApproveConfirm}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-2 border-b-4 border-indigo-900"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <Check size={24}/>} ยืนยันการอนุมัติ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TeacherManager;
