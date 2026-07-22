import React, { useState, useEffect } from 'react';
import { Teacher, School } from '../types';
import { ArrowLeft, Lock, UserPlus, X, User, AlertCircle, Building2, Search, GraduationCap, Settings, Database, Save, LogOut, Briefcase, RefreshCw } from 'lucide-react';
import { teacherLogin, requestRegistration, findSchoolByCode, getAppSettings } from '../services/api';
import { saveConfig, clearConfig } from '../services/firebaseConfig';

interface TeacherLoginProps {
  onLoginSuccess: (teacher: Teacher) => void;
  onBack: () => void;
  initialLogo?: string;
}

const TeacherLogin: React.FC<TeacherLoginProps> = ({ onLoginSuccess, onBack, initialLogo }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState(initialLogo || 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getAppSettings();
      if (settings && settings.logo_url) {
        setLogo(settings.logo_url);
      }
    };
    if (!initialLogo) {
      loadSettings();
    }
  }, [initialLogo]);
  
  const [showRegister, setShowRegister] = useState(false);
  const [regType, setRegType] = useState<'SELECT' | 'SCHOOL' | 'TEACHER'>('SELECT');
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [foundSchool, setFoundSchool] = useState<School | null>(null);
  const [isSchoolVerified, setIsSchoolVerified] = useState(false);
  
  const [regCitizenId, setRegCitizenId] = useState('');
  const [regName, setRegName] = useState('');
  const [regSurname, setRegSurname] = useState('');
  const [regPosition, setRegPosition] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState(localStorage.getItem('MST_SUPABASE_URL') || '');
  const [configKey, setConfigKey] = useState(localStorage.getItem('MST_SUPABASE_KEY') || '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await teacherLogin(username, password);
      if (result.success && result.teacher) {
        onLoginSuccess(result.teacher);
      } else {
        setError(result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setPassword('');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSchool = async () => {
      if (schoolCode.length !== 8) return alert("รหัส Smiss โรงเรียนต้องมี 8 หลัก");
      setRegLoading(true);
      try {
          const school = await findSchoolByCode(schoolCode);
          setRegLoading(false);
          if (school) {
              setFoundSchool(school);
              setIsSchoolVerified(true);
          } else {
              setIsSchoolVerified(false);
              setFoundSchool(null);
              alert("ไม่พบรหัสโรงเรียนนี้ในระบบ\nกรุณาติดต่อ Admin โรงเรียนเพื่อขอรหัส Smiss ที่ถูกต้อง หรือเลือก 'ลงทะเบียนโรงเรียนใหม่'");
          }
      } catch (err) {
          setRegLoading(false);
          alert("เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
      }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!regCitizenId || !regName || !regSurname || !regPosition) return alert('กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน');
      if (regCitizenId.length !== 13) return alert('เลขบัตรประชาชนต้องมี 13 หลัก');
      
      if (regType === 'TEACHER' && !foundSchool) return alert('กรุณาตรวจสอบรหัสโรงเรียนก่อน');
      if (regType === 'SCHOOL' && (!schoolName || schoolCode.length !== 8)) return alert('กรุณาระบุรหัส Smiss และชื่อโรงเรียน');

      setRegLoading(true);
      try {
          const res = await requestRegistration({
              citizenId: regCitizenId,
              name: regName,
              surname: regSurname,
              schoolId: foundSchool?.id || 'NEW_SCHOOL',
              schoolName: schoolName || foundSchool?.name,
              schoolCode: schoolCode,
              position: regPosition,
              type: regType as 'SCHOOL' | 'TEACHER'
          });
          setRegLoading(false);

          if (res.success) {
              alert(res.message);
              setShowRegister(false);
              resetRegForm();
          } else {
              alert(res.message);
          }
      } catch (err: any) {
          setRegLoading(false);
          alert("เกิดข้อผิดพลาดในการส่งข้อมูลสมัครสมาชิก: " + (err.message || "Unknown Error"));
      }
  };

  const resetRegForm = () => {
      setRegType('SELECT'); setSchoolCode(''); setSchoolName(''); setFoundSchool(null); 
      setRegCitizenId(''); setRegName(''); setRegSurname(''); setRegPosition('');
      setIsSchoolVerified(false);
  };

  const handleSaveConfig = () => {
      if (!configUrl) return alert("กรุณากรอกข้อมูล URL โฮสต์ข้อมูลการเชื่อมต่อ");
      saveConfig(configUrl);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 relative p-4 font-prompt">
      
      {/* CONFIG MODAL */}
      {showConfig && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                  <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                      <h3 className="font-bold flex items-center gap-2 text-white"><Database size={20} className="text-green-400"/> ตั้งค่าฐานข้อมูล</h3>
                      <button onClick={() => setShowConfig(false)}><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">Project URL</label>
                          <input type="text" value={configUrl} onChange={e => setConfigUrl(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg bg-slate-50 font-mono text-sm text-slate-900" placeholder="https://..." />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">Anon Key</label>
                          <input type="password" value={configKey} onChange={e => setConfigKey(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-lg bg-slate-50 font-mono text-sm text-slate-900" placeholder="eyJ..." />
                      </div>
                      <div className="pt-2 flex gap-2">
                          <button onClick={clearConfig} className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 flex items-center gap-2"><LogOut size={16}/> ล้างค่า</button>
                          <button onClick={handleSaveConfig} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg"><Save size={18}/> บันทึกค่าใหม่</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* REGISTER MODAL */}
      {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-slate-900 p-6 md:p-8 flex justify-between items-center text-white shrink-0 border-b border-white/10">
                      <h3 className="font-black text-xl flex items-center gap-3 text-white"><UserPlus size={24} className="text-indigo-400"/> สมัครสมาชิกใหม่</h3>
                      <button onClick={() => setShowRegister(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                      {regType === 'SELECT' ? (
                          <div className="space-y-6">
                              <h4 className="font-black text-slate-900 text-center mb-4 text-xl">เลือกประเภทการสมัคร</h4>
                              <button onClick={() => setRegType('TEACHER')} className="w-full p-6 bg-white border-4 border-slate-100 rounded-3xl text-left hover:border-indigo-600 hover:bg-indigo-50 transition-all group shadow-sm active:scale-95">
                                  <div className="flex items-center gap-5">
                                      <div className="p-4 bg-indigo-600 text-white rounded-2xl group-hover:rotate-6 transition-transform shadow-lg"><GraduationCap size={32}/></div>
                                      <div>
                                          <div className="font-black text-slate-950 text-xl">สมัครเป็นครูในโรงเรียนเดิม</div>
                                          <div className="text-sm text-indigo-800 font-bold">ใช้รหัส Smiss 8 หลัก เพื่อเข้าเป็นสมาชิกในโรงเรียน</div>
                                      </div>
                                  </div>
                              </button>
                              <button onClick={() => setRegType('SCHOOL')} className="w-full p-6 bg-white border-4 border-slate-100 rounded-3xl text-left hover:border-emerald-600 hover:bg-emerald-50 transition-all group shadow-sm active:scale-95">
                                  <div className="flex items-center gap-5">
                                      <div className="p-4 bg-emerald-600 text-white rounded-2xl group-hover:rotate-6 transition-transform shadow-lg"><Building2 size={32}/></div>
                                      <div>
                                          <div className="font-black text-slate-950 text-xl">ลงทะเบียนโรงเรียนใหม่</div>
                                          <div className="text-sm text-emerald-800 font-bold">สำหรับครูที่จะทำหน้าที่เป็น Admin โรงเรียน</div>
                                      </div>
                                  </div>
                              </button>
                          </div>
                      ) : (
                          <div className="animate-fade-in">
                              {regType === 'TEACHER' && !isSchoolVerified ? (
                                  /* Teacher Verification Step */
                                  <div className="space-y-8 py-4">
                                      <div className="text-center mb-8">
                                          <div className="bg-indigo-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-700 shadow-inner">
                                              <Search size={48}/>
                                          </div>
                                          <h4 className="font-black text-slate-900 text-2xl">ค้นหาโรงเรียนของคุณ</h4>
                                          <p className="text-slate-800 font-bold text-base mt-2">กรุณาใส่รหัส Smiss 8 หลักเพื่อระบุโรงเรียน</p>
                                      </div>
                                      
                                      <div className="space-y-5">
                                          <div>
                                              <label className="block text-sm font-black text-slate-900 uppercase tracking-widest mb-3 ml-1">รหัส Smiss โรงเรียน (8 หลัก)</label>
                                              <input 
                                                type="text" 
                                                maxLength={8} 
                                                value={schoolCode} 
                                                onChange={e => setSchoolCode(e.target.value.replace(/[^0-9]/g, ''))} 
                                                className="w-full p-6 rounded-2xl border-4 border-slate-200 outline-none font-black text-center text-4xl tracking-[0.5em] focus:border-indigo-600 bg-slate-50 text-slate-950 shadow-inner transition-all" 
                                                placeholder="00000000" 
                                              />
                                          </div>
                                          <button 
                                            type="button" 
                                            disabled={regLoading || schoolCode.length !== 8}
                                            onClick={handleSearchSchool} 
                                            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border-b-8 border-indigo-900"
                                          >
                                              {regLoading ? <RefreshCw className="animate-spin" size={24}/> : <Search size={24}/>} ตรวจสอบรหัสโรงเรียน
                                          </button>
                                          <button onClick={() => setRegType('SELECT')} className="w-full py-3 text-slate-800 font-black text-sm hover:underline hover:text-indigo-600 transition-colors uppercase tracking-widest">ย้อนกลับไปหน้าเลือกประเภท</button>
                                      </div>
                                  </div>
                              ) : (
                                  /* Data Entry Form (Teacher verified or New School) */
                                  <form onSubmit={handleRegisterSubmit} className="space-y-6">
                                      <div className="bg-slate-50 p-6 rounded-[30px] border-2 border-slate-200 shadow-inner">
                                          <div className="flex items-center gap-2 text-indigo-950 font-black text-sm uppercase mb-4 tracking-widest border-b-2 border-indigo-100 pb-2">
                                              <Building2 size={18}/> {regType === 'SCHOOL' ? 'ลงทะเบียนโรงเรียนใหม่' : 'ข้อมูลโรงเรียนที่สังกัด'}
                                          </div>
                                          
                                          {regType === 'SCHOOL' ? (
                                              <div className="space-y-4">
                                                  <div>
                                                      <label className="block text-[11px] font-black text-slate-900 uppercase mb-2">รหัส Smiss (8 หลัก)</label>
                                                      <input type="text" maxLength={8} value={schoolCode} onChange={e => setSchoolCode(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-4 rounded-xl border-2 border-slate-300 outline-none font-black text-center text-3xl tracking-widest focus:border-indigo-600 text-slate-950 bg-white shadow-sm" placeholder="00000000" />
                                                  </div>
                                                  <div>
                                                      <label className="block text-[11px] font-black text-slate-900 uppercase mb-2">ชื่อโรงเรียน</label>
                                                      {/* Fixed: changed setSourceSchoolName to setSchoolName */}
                                                      <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full p-4 rounded-xl border-2 border-slate-300 outline-none font-black focus:border-indigo-600 text-slate-950 bg-white shadow-sm" placeholder="ระบุชื่อเต็มโรงเรียน" />
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="flex items-center gap-4 py-2">
                                                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-md border-2 border-indigo-50"><Building2 size={28}/></div>
                                                  <div>
                                                      <div className="font-black text-slate-950 text-lg leading-tight">{foundSchool?.name}</div>
                                                      <div className="text-sm font-black text-indigo-700 uppercase tracking-widest">Smiss ID: {schoolCode}</div>
                                                  </div>
                                              </div>
                                          )}
                                      </div>

                                      <div className="space-y-4 pt-2">
                                          <div className="flex items-center gap-2 text-slate-900 font-black text-sm uppercase tracking-widest mb-2 border-b-2 border-slate-200 pb-2">
                                              <User size={18}/> ข้อมูลส่วนตัวของคุณครู
                                          </div>
                                          
                                          <div>
                                              <label className="block text-[11px] font-black text-slate-900 uppercase mb-2 ml-1">เลขประจำตัวประชาชน (13 หลัก)</label>
                                              <input type="text" maxLength={13} value={regCitizenId} onChange={e => setRegCitizenId(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-4 rounded-xl border-2 border-slate-300 outline-none font-black focus:border-indigo-600 text-slate-950 bg-slate-50 shadow-inner" placeholder="กรอกเลข 13 หลักเพื่อใช้เข้าระบบ" />
                                          </div>
                                          
                                          <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                  <label className="block text-[11px] font-black text-slate-900 uppercase mb-2 ml-1">ชื่อ</label>
                                                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full p-4 rounded-xl border-2 border-slate-300 outline-none font-black focus:border-indigo-600 text-slate-950 bg-slate-50 shadow-inner" />
                                              </div>
                                              <div>
                                                  <label className="block text-[11px] font-black text-slate-900 uppercase mb-2 ml-1">นามสกุล</label>
                                                  <input type="text" value={regSurname} onChange={e => setRegSurname(e.target.value)} className="w-full p-4 rounded-xl border-2 border-slate-300 outline-none font-black focus:border-indigo-600 text-slate-950 bg-slate-50 shadow-inner" />
                                              </div>
                                          </div>
                                          
                                          <div>
                                              <label className="block text-[11px] font-black text-slate-900 uppercase mb-2 ml-1">ตำแหน่ง</label>
                                              <div className="relative">
                                                  <input type="text" value={regPosition} onChange={e => setRegPosition(e.target.value)} className="w-full p-4 pl-12 rounded-xl border-2 border-slate-300 outline-none font-black focus:border-indigo-600 text-slate-950 bg-slate-50 shadow-inner" placeholder="เช่น ครูชำนาญการ, ครูผู้ช่วย" />
                                                  <Briefcase className="absolute left-4 top-4.5 text-slate-500" size={20}/>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="flex gap-3 pt-6 shrink-0">
                                          <button type="button" onClick={() => { setIsSchoolVerified(false); if(regType === 'SCHOOL') setRegType('SELECT'); }} className="px-8 py-5 border-4 border-slate-200 text-slate-900 rounded-3xl font-black transition hover:bg-slate-100 active:scale-95">ย้อนกลับ</button>
                                          <button disabled={regLoading} type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border-b-8 border-indigo-900">
                                              {regLoading ? <RefreshCw className="animate-spin" size={24}/> : <Save size={24}/>} ยืนยันข้อมูล
                                          </button>
                                      </div>
                                  </form>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* LOGIN CARD */}
      <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl w-full max-w-md border-b-[16px] border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-600 to-purple-700"></div>
        
        <div className="flex justify-between items-center mb-10">
            <button onClick={onBack} className="text-slate-900 hover:text-indigo-800 flex items-center gap-2 text-sm font-black transition-all group">
                <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-slate-200 transition-colors"><ArrowLeft size={18} /></div>
                กลับหน้าหลัก
            </button>
            <button onClick={() => setShowConfig(true)} className="text-slate-400 hover:text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-50 transition-all">
                <Settings size={24} />
            </button>
        </div>

        <div className="text-center mb-10">
          <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden flex items-center justify-center mx-auto mb-6 bg-white shadow-2xl rotate-3 border-4 border-slate-100 group hover:rotate-0 transition-transform">
            <img 
              src={logo} 
              alt="PST Logo" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const fallback = 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png';
                if (target.src !== fallback) target.src = fallback;
              }}
            />
          </div>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight">เข้าสู่ระบบคุณครู</h2>
          <p className="text-slate-800 font-bold text-base mt-2">จัดการชั้นเรียน Smart Tutor</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs md:text-sm font-black text-slate-900 mb-2.5 ml-1 uppercase tracking-wider">เลขประจำตัวประชาชน (Username)</label>
            <div className="relative">
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className={`w-full p-5 pl-14 border-2 rounded-[1.5rem] bg-white outline-none transition font-bold text-slate-950 text-lg shadow-sm ${error ? 'is-error border-rose-500 bg-rose-50/50' : 'border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100'}`} placeholder="13 หลัก" required aria-invalid={!!error} />
                <User className="absolute left-5 top-5 text-slate-600" size={24} />
            </div>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-black text-slate-900 mb-2.5 ml-1 uppercase tracking-wider">รหัสผ่าน (Password)</label>
            <div className="relative">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`w-full p-5 pl-14 border-2 rounded-[1.5rem] bg-white outline-none transition font-bold text-slate-950 text-lg shadow-sm ${error ? 'is-error border-rose-500 bg-rose-50/50' : 'border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100'}`} placeholder="••••••" required aria-invalid={!!error} />
              <Lock className="absolute left-5 top-5 text-slate-600" size={24} />
            </div>
          </div>

          {error && <div className="text-rose-900 text-xs md:text-sm font-black bg-rose-50 p-5 rounded-2xl border-2 border-rose-400 flex items-center gap-3 animate-shake shadow-sm"><AlertCircle size={22} className="text-rose-600 shrink-0"/> {error}</div>}

          <button type="submit" disabled={loading} className="w-full py-5 rounded-[1.8rem] font-black text-2xl text-white shadow-2xl transition-all transform active:scale-95 bg-gradient-to-br from-indigo-600 to-violet-700 hover:shadow-indigo-300 disabled:opacity-50 border-b-8 border-indigo-900">
            {loading ? 'กำลังตรวจสอบ...' : 'ลงชื่อเข้าใช้'}
          </button>
        </form>
        
        <div className="mt-12 pt-8 border-t-4 border-slate-100 text-center">
           <button onClick={() => { setShowRegister(true); resetRegForm(); }} className="text-indigo-700 font-black text-base hover:underline transition-all flex items-center justify-center gap-3 mx-auto group">
               <div className="bg-indigo-50 p-2.5 rounded-2xl group-hover:scale-110 transition-transform"><UserPlus size={22} className="text-indigo-800"/></div>
               ขอลงทะเบียนสมัครใช้งานใหม่
           </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin;