
import React, { useEffect, useState } from 'react';
import { Subject, SubjectConfig } from '../types';
import { Calculator, Book, FlaskConical, Languages, ArrowLeft, Gamepad2, Sparkles, ChevronRight, RefreshCw, Landmark, Heart, Music, Star, Globe, GraduationCap } from 'lucide-react';
import { getSubjects } from '../services/api';
import { GRADE_LABELS } from '../constants';

interface SubjectSelectionProps {
  onSelectSubject: (subject: Subject) => void;
  onBack: () => void;
}

const SubjectSelection: React.FC<SubjectSelectionProps> = ({ onSelectSubject, onBack }) => {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const THEMES: Record<string, { gradient: string, shadow: string, accent: string }> = {
      'คณิตศาสตร์': { gradient: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-100', accent: 'text-rose-100' },
      'วิทยาศาสตร์': { gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-teal-100', accent: 'text-teal-100' },
      'ภาษาไทย': { gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-orange-100', accent: 'text-orange-100' },
      'ภาษาอังกฤษ': { gradient: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-100', accent: 'text-sky-100' },
      'สังคมศึกษา': { gradient: 'from-indigo-500 to-violet-600', shadow: 'shadow-violet-100', accent: 'text-violet-100' },
  };

  const getIcon = (iconName: string, size = 28) => {
      switch(iconName) {
          case 'Book': return <Book size={size} />;
          case 'Calculator': return <Calculator size={size} />;
          case 'FlaskConical': return <FlaskConical size={size} />;
          case 'Languages': return <Languages size={size} />;
          case 'Globe': return <Globe size={size} />;
          case 'Computer': return <Gamepad2 size={size} />;
          case 'Landmark': return <Landmark size={size} />;
          case 'Heart': return <Heart size={size} />;
          case 'Music': return <Music size={size} />;
          default: return <Sparkles size={size} />;
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
    <div className="max-w-5xl mx-auto min-h-[80vh] flex flex-col font-prompt animate-fade-in px-4 pb-12">
      <button onClick={onBack} className="text-slate-500 hover:text-blue-600 flex items-center gap-2 mb-6 w-fit font-black transition-all group">
        <div className="bg-white p-2 rounded-xl shadow-sm group-hover:shadow-md transition-all border border-slate-200">
          <ArrowLeft size={18} /> 
        </div>
        กลับไปหน้าแรก
      </button>

      <div className="text-center mb-8 relative">
        <div className="absolute -top-4 left-4 text-amber-300 opacity-30 rotate-12"><Star size={40} fill="currentColor"/></div>
        <div className="absolute -bottom-4 right-4 text-rose-300 opacity-30 -rotate-12"><Heart size={40} fill="currentColor"/></div>
        
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2 tracking-tight">น้องอยากเก่งวิชาไหนเอ่ย? 🚀</h2>
        <p className="text-slate-500 font-bold text-xs sm:text-sm bg-white/80 px-5 py-1.5 rounded-full inline-block backdrop-blur-sm border border-slate-200 shadow-sm">เลือกวิชาที่ชอบ แล้วเริ่มฝึกกันเลยนะ!</p>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-blue-500">
              <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col items-center border border-slate-100">
                <RefreshCw className="animate-spin mb-3 text-blue-600" size={36}/>
                <p className="font-black text-sm animate-pulse text-slate-700">กำลังเตรียมวิชาเรียน...</p>
              </div>
          </div>
      ) : subjects.length === 0 ? (
          <div className="text-center py-16 border-4 border-dashed border-sky-200 rounded-3xl bg-white/60 backdrop-blur-sm">
              <Sparkles size={60} className="mx-auto mb-4 text-sky-300 animate-bounce"/>
              <p className="text-xl font-black text-slate-400 italic mb-1">ยังไม่มีรายวิชาในระบบ</p>
              <p className="text-xs font-bold text-slate-400">รอคุณครูเพิ่มวิชาให้นะจ๊ะคนเก่ง!</p>
          </div>
      ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
            {subjects.map((sub, idx) => {
              const theme = THEMES[sub.name] || { gradient: 'from-slate-500 to-slate-700', shadow: 'shadow-slate-100', accent: 'text-slate-100' };
              const gradeLabel = sub.grade ? (GRADE_LABELS[sub.grade] || sub.grade) : 'ทุกชั้น';
              return (
                <button
                  key={sub.id}
                  onClick={() => onSelectSubject(sub.name as Subject)}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`group relative p-4 rounded-[26px] border-b-[6px] border-black/20 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between h-[180px] bg-gradient-to-br ${theme.gradient} ${theme.shadow} text-white animate-scale-in active:scale-95 active:border-b-0 active:translate-y-0 overflow-hidden text-left`}
                >
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>
                  
                  {/* Card Header: Icon & Grade Badge */}
                  <div className="flex items-center justify-between z-10">
                    <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-white/30 group-hover:rotate-6 transition-transform">
                      {getIcon(sub.icon, 24)}
                    </div>
                    <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-black border border-white/25 flex items-center gap-1 shrink-0">
                      <GraduationCap size={12}/> {gradeLabel}
                    </span>
                  </div>

                  {/* Card Body: Title & Details */}
                  <div className="relative z-10 my-1">
                    <h3 className="text-sm sm:text-base font-black truncate drop-shadow-md">{sub.name}</h3>
                    <p className={`font-bold text-[10px] ${theme.accent} opacity-90 italic truncate`}>"มาสนุกกับความรู้กันเถอะ!"</p>
                    {sub.targetClassrooms && sub.targetClassrooms.length > 0 && (
                      <p className="text-[9px] text-white/80 font-bold truncate mt-0.5">
                        ห้อง: {sub.targetClassrooms.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Action Button */}
                  <div className="relative z-10 w-full bg-black/15 group-hover:bg-black/25 py-1.5 px-3 rounded-xl border border-white/25 flex items-center justify-center gap-1 font-black text-xs transition-colors shadow-inner">
                    กดเริ่มเลย <ChevronRight size={14}/>
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
