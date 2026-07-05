
import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, Classroom } from '../../types';
import { User, Lock, Save, CheckCircle, RefreshCw, 
  Sparkles, Building2, Eye, EyeOff, ClipboardPaste, 
  ShieldCheck, GraduationCap, LayoutGrid,
  UserCircle, KeyRound, Info, ExternalLink, Camera, Trash2
} from 'lucide-react';
import { manageTeacher, getClassrooms, uploadAsset } from '../../services/api';

declare const window: any;

interface ProfileManagerProps {
  teacher: Teacher;
  onUpdate: () => void;
}

const POSITIONS = [
    'ครูอัตราจ้าง', 'พนักงานราชการ', 'ครูผู้ช่วย', 'ตำแหน่งครู', 
    'ครูชำนาญการ', 'ครูชำนาญการพิเศษ', 'ครูเชี่ยวชาญ', 'ครูเชี่ยวชาญพิเศษ', 
    'รองผู้อำนวยการ', 'ผู้อำนวยการโรงเรียน'
];

const GRADE_ORDER = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3'];
const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3' 
};

const ProfileManager: React.FC<ProfileManagerProps> = ({ teacher, onUpdate }) => {
  const [name, setName] = useState(teacher.name);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [position, setPosition] = useState(teacher.position || 'ตำแหน่งครู');
  const [avatar, setAvatar] = useState(teacher.avatar || '👨‍🏫');
  
  const [isUploading, setIsUploading] = useState(false);
  
  const [manualApiKey, setManualApiKey] = useState(localStorage.getItem('MST_CUSTOM_GEMINI_KEY') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(!!localStorage.getItem('MST_CUSTOM_GEMINI_KEY'));

  const [schoolClassrooms, setSchoolClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
      loadSchoolClassrooms();
  }, [teacher.school]);

  useEffect(() => {
      setName(teacher.name);
      setPosition(teacher.position || 'ตำแหน่งครู');
      setAvatar(teacher.avatar || '👨‍🏫');
      if (teacher.teachingClassroomIds) {
          setSelectedClassroomIds(teacher.teachingClassroomIds);
      } else {
          setSelectedClassroomIds([]);
      }
  }, [teacher]);

  const loadSchoolClassrooms = async () => {
      setLoadingClassrooms(true);
      const data = await getClassrooms(teacher.school);
      setSchoolClassrooms(data);
      if (teacher.teachingClassroomIds) setSelectedClassroomIds(teacher.teachingClassroomIds);
      setLoadingClassrooms(false);
  };

  const toggleTeachingClass = (classId: string) => {
      setSelectedClassroomIds(prev => 
          prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
      );
  };

  const handleSave = async () => {
      if (!name) return alert("กรุณาระบุชื่อ");
      setIsSaving(true);
      
      const selectedRooms = schoolClassrooms.filter(c => selectedClassroomIds.includes(c.id));
      const selectedNames = selectedRooms.map(c => c.name);
      const distinctGrades = Array.from(new Set(selectedRooms.map(c => c.gradeLevel))).join(',');

      const payload: any = {
          id: teacher.id,
          name: name,
          position: position,
          avatar: avatar,
          teachingClasses: selectedNames, 
          teachingClassroomIds: selectedClassroomIds,
          gradeLevel: distinctGrades || teacher.gradeLevel
      };
      
      if (password) payload.password = password;

      const result = await manageTeacher('edit', payload);
      setIsSaving(false);
      
      if (result.success) {
          alert("✅ บันทึกข้อมูลสำเร็จแล้ว");
          setPassword('');
          onUpdate();
      } else {
          alert(`❌ ไม่สามารถบันทึกข้อมูลได้: ${result.message || 'กรุณาลองใหม่อีกครั้ง'}`);
      }
  };

  const handleSaveManualKey = () => {
      const trimmedKey = manualApiKey.trim();
      if (!trimmedKey) return alert("กรุณาระบุ API Key");
      
      // Auto-sanitize the key to fix copy-paste issues like em-dash or whitespaces
      let cleanedKey = trimmedKey
          .replace(/[\u2014\u2015\u2500]/g, '--') // Replace em-dash, horizontal bar with "--"
          .replace(/[\u2013\u2212]/g, '-');      // Replace en-dash, minus with "-"

      // Strip common trailing dividers like multiple hyphens/dashes (e.g. "—----------------")
      cleanedKey = cleanedKey.replace(/[-─—]{3,}$/, '');

      // Remove all whitespaces and other invalid characters (keeping only letters, digits, underscores, periods, and hyphens)
      cleanedKey = cleanedKey.replace(/\s+/g, '').replace(/[^\w\.\-]/g, '');

      if (!cleanedKey.startsWith('AIza') && !cleanedKey.startsWith('AQ')) {
          return alert("⚠️ รูปแบบ API Key ไม่ถูกต้อง (ปกติจะขึ้นต้นด้วย AIza... หรือ AQ...) กรุณาตรวจสอบอีกครั้งครับ");
      }

      localStorage.setItem('MST_CUSTOM_GEMINI_KEY', cleanedKey);
      setManualApiKey(cleanedKey);
      setIsKeySaved(true);
      alert("✅ บันทึก API Key ส่วนตัวเรียบร้อยแล้ว\n\nหากใช้งานแล้วขึ้นว่า 'Quota Exceeded' อาจเป็นเพราะคีย์ฟรีมีจำกัดการใช้งานต่อนาที (15 RPM) กรุณารอสักครู่แล้วลองใหม่ครับ");
  };

  const groupedClassrooms = useMemo(() => {
      const groups: Record<string, Classroom[]> = {};
      schoolClassrooms.forEach(c => {
          if (!groups[c.gradeLevel]) groups[c.gradeLevel] = [];
          groups[c.gradeLevel].push(c);
      });
      return groups;
  }, [schoolClassrooms]);

  const currentlySelectedList = useMemo(() => {
    return schoolClassrooms
      .filter(c => selectedClassroomIds.includes(c.id))
      .sort((a, b) => {
          const gradeA = GRADE_ORDER.indexOf(a.gradeLevel);
          const gradeB = GRADE_ORDER.indexOf(b.gradeLevel);
          if (gradeA !== gradeB) return gradeA - gradeB;
          return Number(a.roomNumber) - Number(b.roomNumber);
      });
  }, [schoolClassrooms, selectedClassroomIds]);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) return alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
    if (file.size > 2 * 1024 * 1024) return alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB");

    setIsUploading(true);
    try {
        const url = await uploadAsset(file, 'avatars');
        if (url) {
            setAvatar(url);
        } else {
            alert("⚠️ อัปโหลดไม่สำเร็จ กรุณาตรวจสอบไฟล์อัปโหลดหรือการตั้งค่าโฟลเดอร์เก็บข้อมูล");
        }
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
        setIsUploading(false);
    }
  };

  const isAvatarUrl = avatar.startsWith('http');

  return (
    <div className="max-w-6xl mx-auto animate-fade-in font-prompt px-2 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <UserCircle className="text-indigo-600" size={32}/> ตั้งค่าโปรไฟล์และข้อมูลส่วนตัว
                </h3>
                <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest ml-11">Profile & Security Management</p>
            </div>
            <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95 border-b-4 border-indigo-900"
            >
                {isSaving ? <RefreshCw className="animate-spin" size={24}/> : <Save size={24}/>} 
                บันทึกการเปลี่ยนแปลง
            </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Personal Info & Security */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Personal Card */}
                <div className="bg-white p-8 rounded-[35px] shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
                    
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-[40px] bg-slate-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
                                {isAvatarUrl ? (
                                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-6xl">{avatar}</span>
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-sm flex items-center justify-center">
                                        <RefreshCw size={24} className="text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-3 rounded-2xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 border-2 border-white">
                                <Camera size={20} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={isUploading} />
                            </label>
                            {isAvatarUrl && (
                                <button 
                                    onClick={() => setAvatar('👨‍🏫')}
                                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-md hover:bg-rose-600 transition-all opacity-0 group-hover:opacity-100 border-2 border-white"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Profile Picture</p>
                    </div>

                    <h5 className="font-black text-slate-800 mb-5 flex items-center gap-2">
                        <User size={18} className="text-indigo-600"/> ข้อมูลพื้นฐาน
                    </h5>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ชื่อ-นามสกุล</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none transition font-bold text-slate-700 shadow-inner" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ตำแหน่งทางวิชาการ</label>
                            <select value={position} onChange={e => setPosition(e.target.value)} className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-400 outline-none font-bold text-slate-700 shadow-inner">
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Password Card */}
                <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>
                    <h5 className="font-black text-slate-800 mb-5 flex items-center gap-2">
                        <Lock size={18} className="text-rose-500"/> เปลี่ยนรหัสผ่านใหม่
                    </h5>
                    <div className="space-y-3">
                        <div className="relative">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full p-3.5 pr-12 border-2 border-slate-50 rounded-2xl bg-slate-50 focus:bg-white focus:border-rose-400 outline-none transition font-bold text-slate-700 shadow-inner"
                                placeholder="ว่างไว้หากไม่เปลี่ยน"
                            />
                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 bottom-3.5 text-slate-500 hover:text-rose-500 transition">
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Config Card with Instructions */}
                <div className="bg-slate-900 p-6 rounded-[35px] text-white shadow-2xl relative overflow-hidden border-b-[8px] border-indigo-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Sparkles size={80}/></div>
                    <h5 className="font-black text-base mb-4 flex items-center gap-2 relative z-10">
                        <KeyRound size={20} className="text-yellow-400"/> Gemini AI สำหรับออกข้อสอบ
                    </h5>
                    
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 space-y-3 relative z-10">
                        <div className="flex items-start gap-2">
                            <Info size={16} className="text-indigo-400 mt-0.5 flex-shrink-0"/>
                            <div className="text-[11px] text-indigo-100 leading-relaxed">
                                <p className="font-black mb-1 text-white">วิธีขอรับ API Key ฟรี:</p>
                                <ol className="list-decimal list-inside space-y-1 opacity-80">
                                    <li>ไปที่ <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-400 underline inline-flex items-center gap-0.5">Google AI Studio <ExternalLink size={10}/></a></li>
                                    <li>กด <b>"Create API key"</b></li>
                                    <li>ก๊อปปี้รหัสคีย์มาวางด้านล่างนี้</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="relative">
                            <input 
                                type={showApiKey ? "text" : "password"} 
                                value={manualApiKey} 
                                onChange={e => setManualApiKey(e.target.value)} 
                                className="w-full p-3.5 pr-12 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-400 outline-none transition font-mono text-xs text-indigo-200" 
                                placeholder="วาง API Key (AIza...)" 
                            />
                            <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-3.5 text-white/30 hover:text-white transition">
                                {showApiKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                        <button onClick={handleSaveManualKey} className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${isKeySaved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {isKeySaved ? <><CheckCircle size={16}/> บันทึกคีย์สำเร็จ</> : <><ClipboardPaste size={16}/> บันทึก API Key</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Classroom Selection (Compact & 2 Columns) */}
            <div className="lg:col-span-7 space-y-6">
                
                {/* Selected Classes Summary Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[35px] text-white shadow-lg relative overflow-hidden border-b-8 border-black/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4"><LayoutGrid size={100}/></div>
                    <div className="relative z-10">
                        <h4 className="font-black text-base mb-3 flex items-center gap-2">
                            <ShieldCheck size={20}/> ห้องเรียนที่คุณรับผิดชอบ ({currentlySelectedList.length})
                        </h4>
                        {currentlySelectedList.length === 0 ? (
                            <div className="bg-black/10 p-4 rounded-2xl border border-white/10 text-center italic font-bold text-indigo-100 text-xs">
                                ยังไม่ได้เลือกห้องเรียนที่สอน
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {currentlySelectedList.map(c => (
                                    <div key={c.id} className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 shadow-sm text-xs font-black">
                                        <GraduationCap size={12}/>
                                        {GRADE_LABELS[c.gradeLevel] || c.gradeLevel}/{c.roomNumber}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Compact Interactive Classroom Selector - Divided into 2 columns for grades */}
                <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 relative min-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                        <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
                            <Building2 size={22} className="text-indigo-600"/> เลือกห้องเรียนที่สอน (ป.1 - ม.3)
                        </h4>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                            {GRADE_ORDER.map(grade => {
                                const rooms = groupedClassrooms[grade];
                                if (!rooms || rooms.length === 0) return null;
                                const thaiLabel = GRADE_LABELS[grade] || grade;
                                const isHighSchool = grade.startsWith('M');

                                return (
                                    <div key={grade} className="animate-slide-up">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md ${isHighSchool ? 'bg-violet-600' : 'bg-indigo-600'} rotate-3`}>
                                                {thaiLabel}
                                            </div>
                                            <h5 className="font-black text-slate-700 text-sm">ระดับชั้น {thaiLabel}</h5>
                                            <div className="h-px bg-slate-100 flex-1 ml-1"></div>
                                        </div>

                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                            {rooms.sort((a,b) => Number(a.roomNumber) - Number(b.roomNumber)).map(room => {
                                                const isSelected = selectedClassroomIds.includes(room.id);
                                                return (
                                                    <button 
                                                        key={room.id} 
                                                        onClick={() => toggleTeachingClass(room.id)} 
                                                        className={`group relative py-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center active:scale-95 ${isSelected 
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-300'
                                                        }`}
                                                    >
                                                        <div className="text-sm font-black">{room.roomNumber}</div>
                                                        {isSelected && <div className="absolute -top-1 -right-1 bg-white text-indigo-600 rounded-full shadow-md p-0.5 animate-scale-in"><CheckCircle size={10}/></div>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {loadingClassrooms && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[35px] z-20">
                            <RefreshCw className="animate-spin text-indigo-600 mb-2" size={24}/>
                            <p className="font-black text-xs text-slate-500">กำลังโหลด...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ProfileManager;
