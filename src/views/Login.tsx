import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { Sparkles, Star, Heart, Loader2, User, AlertCircle, Download, UserPlus, Cloud, PartyPopper, Monitor, Smartphone, X, ShieldAlert } from 'lucide-react';
import { verifyStudentLogin, getAppSettings } from '../services/api';

interface LoginProps {
  student?: Student;
  onLogin: (student: Student) => void;
  onTeacherLoginClick: () => void;
  initialLogo?: string;
  appName?: string;
  onInstall?: () => void;
  isInstallable?: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, onTeacherLoginClick, initialLogo, appName, onInstall, isInstallable }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogo || 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png');
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Check if App is already running in PWA (standalone) mode
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    if (initialLogo) {
      setLogoUrl(initialLogo);
    }
  }, [initialLogo]);

  useEffect(() => {
    // Fetch Settings if not passed
    if (!initialLogo) {
      const loadSettings = async () => {
        const settings = await getAppSettings();
        if (settings.logo_url) {
          setLogoUrl(settings.logo_url);
        }
      };
      loadSettings();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
        setError('กรุณากรอกชื่อผู้ใช้');
        return;
    }
    setLoading(true);
    setError('');
    // For student login, if password is not provided, we might support legacy PIN if username looks like a PIN
    const result = await verifyStudentLogin(username, password || undefined);
    setLoading(false);
    if (result.student) {
        setFoundStudent(result.student);
        setTimeout(() => onLogin(result.student!), 1200);
    } else {
        setError(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden bg-orange-500 font-prompt">
      {/* Background Decor */}
      <div className="absolute top-10 left-10 text-white/30 animate-bounce"><Star size={40} fill="currentColor"/></div>
      <div className="absolute top-20 right-20 text-white/20 animate-pulse"><Cloud size={100} fill="currentColor"/></div>
      <div className="absolute bottom-40 left-20 text-white/20 animate-bounce"><PartyPopper size={60}/></div>
      <div className="absolute bottom-20 right-10 text-white/30 animate-pulse"><Heart size={30} fill="currentColor"/></div>
      <div className="absolute top-1/2 left-4 text-white/10 rotate-12"><Sparkles size={60}/></div>

      <div className="w-full max-w-[380px] z-10 p-6">
        <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-[40px] border-4 border-white p-6 md:p-8 relative animate-pop overflow-hidden">
            {/* Box Pattern Overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 -mr-16 -mt-16 rounded-full opacity-50 z-0"></div>
            
            <div className="text-center mb-6 relative z-10">
                <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto mb-4 shadow-xl shadow-orange-100 rotate-3 group hover:rotate-0 transition-transform bg-white border border-slate-100 flex items-center justify-center">
                    <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain p-2"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <h1 className="text-3xl font-black text-orange-900 tracking-tight leading-none">
                  {appName ? appName.split(' ')[0] : 'Pratom'}
                </h1>
                <h1 className="text-2xl font-black text-orange-800 tracking-tight mb-1">
                  {appName ? appName.split(' ').slice(1).join(' ') : 'Smart Tutor'}
                </h1>
                <p className="text-orange-500 font-bold text-sm tracking-wide">
                  เข้าใช้ระบบนักเรียน
                </p>
            </div>

            <div className="bg-white rounded-3xl p-2 mb-6 h-auto relative z-10">
                {foundStudent ? (
                    <div className="flex flex-col items-center animate-bounce py-8 bg-orange-50 rounded-3xl border-2 border-orange-100">
                        <span className="text-6xl mb-2 drop-shadow-lg">{foundStudent.avatar}</span>
                        <span className="text-xl font-black text-orange-600">ยินดีต้อนรับ!</span>
                        <span className="text-sm font-bold text-slate-500">{foundStudent.name}</span>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ชื่อผู้ใช้งาน (User ID / Username)</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 focus:bg-white transition-all font-black text-slate-700"
                                    placeholder="รหัสประจำตัว หรือ Username"
                                />
                                <User className="absolute left-4 top-4 text-slate-300" size={20}/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">รหัสผ่าน (Password)</label>
                            <div className="relative">
                                <input 
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-400 focus:bg-white transition-all font-black text-slate-700"
                                    placeholder="กรอกรหัสผ่าน..."
                                />
                                <ShieldAlert className="absolute left-4 top-4 text-slate-300" size={20}/>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 ml-1">* หากยังไม่มีรหัสผ่าน ให้เว้นว่างไว้แล้วใส่รหัสประจำตัวช่องด้านบน</p>
                        </div>

                        {error && (
                            <div className="bg-rose-50 text-rose-700 p-3 rounded-2xl text-[11px] font-black flex items-center gap-2 animate-shake border border-rose-100">
                                <AlertCircle size={16}/> {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 transition active:scale-95 flex items-center justify-center gap-2 border-b-4 border-orange-800 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24}/> : "เข้าสู่ระบบ"}
                        </button>
                    </form>
                )}
            </div>

            <div className="pt-4 border-t-2 border-slate-50 flex flex-col gap-3 relative z-10">
                {!isStandalone && (
                  <button 
                      onClick={isInstallable ? onInstall : () => setShowInstallGuide(true)}
                      className="w-full py-3.5 rounded-2xl bg-orange-600 text-white font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-100 border-b-4 border-orange-800 animate-pulse cursor-pointer"
                  >
                      <Download size={18}/> {isInstallable ? 'ติดตั้งโดยอัตโนมัติ' : 'วิธีติดตั้งบน Windows / มือถือ'}
                  </button>
                )}
                
                <div className="flex gap-2">
                  <button 
                      onClick={onTeacherLoginClick}
                      className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                      <User size={14}/> สำหรับคุณครู
                  </button>
                  <button 
                      onClick={onTeacherLoginClick}
                      className="flex-1 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                      <UserPlus size={14}/> สมัครสมาชิก
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center font-medium mt-2">
                    พัฒนาโดย สยาม เชียงเครือ
                </p>
            </div>
        </div>

        {/* --- INSTALL GUIDE MODAL --- */}
        {showInstallGuide && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border-b-[12px] border-orange-500 animate-scale-in">
              <div className="p-8 bg-gradient-to-tr from-orange-600 to-orange-400 text-white relative text-center">
                <button 
                  onClick={() => setShowInstallGuide(false)} 
                  className="absolute top-6 right-6 p-2 bg-white/15 hover:bg-white/30 rounded-full transition cursor-pointer"
                >
                  <X size={20}/>
                </button>
                <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <Download size={28} className="text-orange-600" />
                </div>
                <h3 className="text-2xl font-black mb-1 text-white">คู่มือการติดตั้งแอป</h3>
                <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest">{appName || 'Pratom Smart Tutor'}</p>
              </div>
              
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Windows Check */}
                <div className="bg-sky-50 border border-sky-100 rounded-3xl p-5 relative overflow-hidden text-left">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-sky-500 text-white rounded-xl shrink-0">
                      <Monitor size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-sky-900 text-sm">คอมพิวเตอร์ Windows / macOS</h4>
                      <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">สำหรับห้องเรียนคอมพิวเตอร์โรงเรียน:</p>
                      <ol className="list-decimal list-inside text-slate-600 text-xs space-y-1.5 border-t border-sky-200/50 pt-2 mt-1 font-medium">
                        <li>สังเกต <span className="text-sky-700 font-bold bg-sky-100 px-1.5 py-0.5 rounded">ปุ่มติดตั้ง ⊕</span> หรือไอคอนรูปหน้าจอพร้อมลูกศรลง ที่มุมขวาสุดของแถบกรอกลิงก์เว็บ (Address Bar) ด้านบนสุด</li>
                        <li>คลิกไอคอนนั้น แล้วกดปุ่ม <span className="text-sky-700 font-black">ติดตั้ง (Install)</span></li>
                        <li>ระบบจะสร้างทางลัดเข้าเว็บแอปบนหน้าจอคอมพิวเตอร์ (Desktop) ให้นักเรียนกดเข้าเรียนได้ทันทีโดยไม่ต้องจำลิงก์!</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Mobile Check */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 relative overflow-hidden text-left">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-500 text-white rounded-xl shrink-0">
                      <Smartphone size={20} />
                    </div>
                    <div className="space-y-1 w-full">
                      <h4 className="font-black text-emerald-900 text-sm">โทรศัพท์มือถือ / แท็บเล็ต</h4>
                      <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">สำหรับเรียนบนเครื่องส่วนตัว:</p>
                      <div className="border-t border-emerald-200/50 pt-2 mt-1 space-y-3 font-medium">
                        <div>
                          <span className="font-black text-emerald-800 text-xs">📱 ระบบ iOS (iPhone / iPad):</span>
                          <ul className="list-disc list-inside text-slate-600 text-[11px] mt-0.5 pl-1 space-y-0.5">
                            <li>ต้องเปิดเว็บด้วยแอป <span className="underline">Safari</span> เท่านั้น</li>
                            <li>แตะปุ่ม <span className="font-bold">แชร์ (Share)</span> [🔗 / 📤] ด้านล่าง</li>
                            <li>เลือกเมนู <span className="text-emerald-700 font-black">"เพิ่มไปยังหน้าจอโฮม"</span></li>
                          </ul>
                        </div>
                        <div>
                          <span className="font-black text-emerald-800 text-xs">🤖 ระบบ Android (Chrome):</span>
                          <ul className="list-disc list-inside text-slate-600 text-[11px] mt-0.5 pl-1 space-y-0.5">
                            <li>แตะปุ่มตัวเลือก <span className="font-bold">[⋮] (สามจุด)</span> ที่มุมขวาบน</li>
                            <li>เลือกเมนู <span className="text-emerald-700 font-black">"ติดตั้งแอป"</span> หรือ <span className="font-bold">"เพิ่มลงในหน้าจอหลัก"</span></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-3 bg-orange-500 text-white rounded-2xl font-black text-xs hover:bg-orange-600 transition active:scale-95 cursor-pointer text-center border-b-4 border-orange-700 shadow-md"
                >
                  รับทราบแนวทางแล้ว
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
            <div className="fixed inset-0 bg-orange-600/20 backdrop-blur-sm z-[100] flex flex-col items-center justify-center rounded-[50px]">
                <div className="bg-white p-5 rounded-3xl shadow-2xl flex flex-col items-center">
                  <Loader2 className="animate-spin text-orange-600 mb-2" size={32} />
                  <p className="text-xs font-black text-orange-600 animate-pulse">กำลังตรวจสอบรหัส...</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Login;