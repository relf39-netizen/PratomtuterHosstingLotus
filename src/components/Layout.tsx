import React from 'react';
import { LogOut, Volume2, VolumeX, Sparkles, Trophy, BarChart, BookOpen } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  studentName?: string;
  onLogout: () => void;
  isMusicOn: boolean;
  toggleMusic: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  initialLogo?: string;
  appName?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  studentName, 
  onLogout, 
  isMusicOn, 
  toggleMusic,
  currentPage,
  onNavigate,
  initialLogo,
  appName
}) => {
  const logo = initialLogo || "https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png";
  const finalAppName = appName || 'Pratom Smart Tutor';

  return (
    <div className="min-h-screen bg-[#f0f9ff] pb-24 md:pb-0 font-prompt">
      <header className="bg-white/95 backdrop-blur-md border-b-4 border-sky-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('dashboard')}>
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-sky-200 group-hover:rotate-6 transition-transform border-2 border-white bg-white">
               <img 
                src={logo} 
                alt="PST Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
               />
            </div>
            <div>
                <h1 className="text-xl font-black text-blue-600 leading-tight hidden md:block">{finalAppName}</h1>
                <h1 className="text-xl font-black text-blue-600 leading-tight md:hidden">{finalAppName}</h1>
                <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-400 fill-amber-400"/> ระบบเตรียมสอบอัจฉริยะ
                </p>
            </div>
          </div>
          {studentName && (
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={toggleMusic} className={`p-2.5 rounded-full transition-all active:scale-90 ${isMusicOn ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                {isMusicOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <div className="bg-blue-50 px-4 py-2 rounded-2xl border-2 border-blue-100 shadow-sm hidden sm:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-black text-blue-700">{studentName}</span>
              </div>
              <button onClick={() => { if(confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) onLogout(); }} className="text-rose-400 hover:text-rose-600 p-2.5 bg-rose-50 rounded-2xl hover:bg-rose-100 transition-colors shadow-sm"><LogOut size={20} /></button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      {studentName && (
        <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border-4 border-sky-100 py-3 px-6 rounded-[30px] shadow-2xl z-40">
          <div className="flex justify-around items-center">
            <NavItem icon={<BookOpen size={24} />} label="ฝึกฝน" isActive={currentPage === 'practice' || currentPage === 'dashboard'} onClick={() => onNavigate('dashboard')} color="text-blue-500" />
            <NavItem icon={<Trophy size={24} />} label="แข่งขัน" isActive={currentPage === 'game'} onClick={() => onNavigate('game')} color="text-amber-500" />
            <NavItem icon={<BarChart size={24} />} label="สถิติ" isActive={currentPage === 'stats'} onClick={() => onNavigate('stats')} color="text-emerald-500" />
          </div>
        </nav>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void, color: string }> = ({ icon, label, isActive, onClick, color }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? `${color} scale-110 -translate-y-1` : 'text-slate-300'}`}>
    <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white shadow-lg' : ''}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

export default Layout;