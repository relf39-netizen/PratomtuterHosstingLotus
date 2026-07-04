
import React, { useEffect, useState } from 'react';
import { Subject, SubjectConfig } from '../types';
// Fix: Added missing Globe icon import
import { Calculator, Book, FlaskConical, Languages, ArrowLeft, Gamepad2, Sparkles, ChevronRight, RefreshCw, Zap, Landmark, Heart, Music, Star, Globe } from 'lucide-react';
import { getSubjects } from '../services/api';

interface SubjectSelectionProps {
  onSelectSubject: (subject: Subject) => void;
  onBack: () => void;
}

const SubjectSelection: React.FC<SubjectSelectionProps> = ({ onSelectSubject, onBack }) => {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const THEMES: Record<string, { gradient: string, shadow: string, accent: string }> = {
      'คณิตศาสตร์': { gradient: 'from-rose-400 to-rose-600', shadow: 'shadow-rose-200', accent: 'text-rose-100' },
      'วิทยาศาสตร์': { gradient: 'from-emerald-400 to-teal-600', shadow: 'shadow-teal-200', accent: 'text-teal-100' },
      'ภาษาไทย': { gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-orange-200', accent: 'text-orange-100' },
      'ภาษาอังกฤษ': { gradient: 'from-sky-400 to-blue-600', shadow: 'shadow-sky-200', accent: 'text-sky-100' },
      'สังคมศึกษา': { gradient: 'from-indigo-400 to-violet-600', shadow: 'shadow-violet-200', accent: 'text-violet-100' },
  };

  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'Book': return <Book size={48} />;
          case 'Calculator': return <Calculator size={48} />;
          case 'FlaskConical': return <FlaskConical size={48} />;
          case 'Languages': return <Languages size={48} />;
          case 'Globe': return <Globe size={48} />;
          case 'Computer': return <Gamepad2 size={48} />;
          case 'Landmark': return <Landmark size={48} />;
          case 'Heart': return <Heart size={48} />;
          case 'Music': return <Music size={48} />;
          default: return <Sparkles size={48} />;
      }
  };

  useEffect(() => {
      const loadSubjects = async () => {
          const data = await getSubjects(''); 
          setSubjects(data);
          setLoading(false);
      };
      loadSubjects();
  }, []);

  return (
    <div className="max-w-4xl mx-auto min-h-[80vh] flex flex-col font-prompt animate-fade-in px-4 pb-12">
      <button onClick={onBack} className="text-slate-400 hover:text-blue-600 flex items-center gap-2 mb-8 w-fit font-black transition-all group">
        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:shadow-md transition-all">
          <ArrowLeft size={20} /> 
        </div>
        กลับไปหน้าแรก
      </button>

      <div className="text-center mb-10 relative">
        <div className="absolute -top-6 -left-4 text-amber-300 opacity-20 rotate-12"><Star size={60} fill="currentColor"/></div>
        <div className="absolute -bottom-6 -right-4 text-rose-300 opacity-20 -rotate-12"><Heart size={60} fill="currentColor"/></div>
        
        <h2 className="text-4xl font-black text-slate-800 mb-3 tracking-tight">น้องอยากเก่งวิชาไหนเอ่ย? 🚀</h2>
        <p className="text-slate-400 font-bold text-base bg-white/50 px-6 py-2 rounded-full inline-block backdrop-blur-sm border-2 border-white shadow-sm">เลือกวิชาที่ชอบ แล้วเริ่มฝึกกันเลยนะ!</p>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-500">
              <div className="bg-white p-6 rounded-[40px] shadow-2xl flex flex-col items-center">
                <RefreshCw className="animate-spin mb-4" size={48}/>
                <p className="font-black text-lg animate-pulse">กำลังเตรียมวิชาเรียน...</p>
              </div>
          </div>
      ) : subjects.length === 0 ? (
          <div className="text-center py-20 border-8 border-dashed border-sky-100 rounded-[60px] bg-white/50 backdrop-blur-sm">
              <Sparkles size={80} className="mx-auto mb-6 text-sky-200 animate-bounce"/>
              <p className="text-2xl font-black text-slate-300 italic mb-2">ว้าาา... ยังไม่มีวิชาเลยจ้ะ</p>
              <p className="text-sm font-bold text-slate-300">รอคุณครูเพิ่มวิชาให้นะจ๊ะคนเก่ง!</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {subjects.map((sub, idx) => {
              const theme = THEMES[sub.name] || { gradient: 'from-slate-400 to-slate-600', shadow: 'shadow-slate-100', accent: 'text-slate-100' };
              return (
                <button
                  key={sub.id}
                  // Fix: Cast sub.name to Subject to match the expected type
                  onClick={() => onSelectSubject(sub.name as Subject)}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  className={`group relative p-8 rounded-[45px] border-b-[12px] border-black/10 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col items-center gap-6 bg-gradient-to-br ${theme.gradient} ${theme.shadow} text-white animate-scale-in active:scale-95 active:border-b-0 active:translate-y-0`}
                >
                  <div className="absolute top-0 right-0 w-40 h-40 -mr-16 -mt-16 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="bg-white/20 backdrop-blur-md p-6 rounded-[35px] shadow-2xl border-2 border-white/30 group-hover:rotate-12 transition-transform duration-500">
                    {getIcon(sub.icon)}
                  </div>
                  <div className="text-center relative z-10">
                    <h3 className="text-2xl font-black mb-1 drop-shadow-xl tracking-tight">{sub.name}</h3>
                    <p className={`font-bold text-xs ${theme.accent} mb-4 opacity-80 italic`}>"มาสนุกกับความรู้กันเถอะ!"</p>
                    <div className="bg-black/10 hover:bg-black/20 px-6 py-2 rounded-2xl border-2 border-white/20 inline-flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-colors shadow-inner">
                        กดเริ่มเลย <ChevronRight size={14}/>
                    </div>
                  </div>
                  <div className="absolute bottom-6 right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap size={60} fill="currentColor" />
                  </div>
                </button>
              );
            })}
          </div>
      )}
    </div>
  );
};

export default SubjectSelection;
