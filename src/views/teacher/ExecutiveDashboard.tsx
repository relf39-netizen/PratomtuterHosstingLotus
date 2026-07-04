
import React, { useState, useMemo, useEffect } from 'react';
import { Student, ExamResult, Teacher } from '../../types';
import { 
  TrendingUp, Activity, UserCheck, BarChart3, 
  GraduationCap, UserCog, 
  ArrowUpRight, Award, ShieldCheck, Database,
  Medal
} from 'lucide-react';
import { getAllTeachers } from '../../services/api';

interface ExecutiveDashboardProps {
  teacher: Teacher;
  students: Student[];
  stats: ExamResult[];
}

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
};

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ teacher, students, stats }) => {
  const [activeTab, setActiveTab] = useState<'PROGRESS' | 'USAGE'>('PROGRESS');
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
        try {
            const data = await getAllTeachers();
            setAllTeachers(data.filter(t => t.school === teacher.school));
        } catch (e) { console.error(e); }
    };
    fetchTeachers();
  }, [teacher.school]);

  // --- Tab 1: Progress Analytics ---
  const subjectProgress = useMemo(() => {
    const map: Record<string, { totalScore: number, count: number, attempts: number, grades: Set<string> }> = {};
    
    stats.forEach(r => {
        if (!map[r.subject]) map[r.subject] = { totalScore: 0, count: 0, attempts: 0, grades: new Set() };
        map[r.subject].totalScore += (r.score / (r.totalQuestions || 1)) * 100;
        map[r.subject].count++;
        map[r.subject].attempts++; 
        
        const st = students.find(s => String(s.id).trim() === String(r.studentId).trim());
        if (st?.grade) map[r.subject].grades.add(st.grade);
    });

    return Object.entries(map).map(([name, data]) => ({
        name,
        average: Math.round(data.totalScore / data.count),
        attempts: data.attempts,
        grades: Array.from(data.grades).sort()
    })).sort((a, b) => b.average - a.average);
  }, [stats, students]);

  // --- Tab 2: Usage Tracking ---
  const usageStats = useMemo(() => {
      const studentLogins = students.reduce((sum, s) => sum + (Number(s.login_count) || 0), 0);
      const teacherLogins = allTeachers.reduce((sum, t) => sum + (Number(t.login_count) || 0), 0);
      
      const topStudents = [...students]
        .filter(s => (s.login_count || 0) > 0)
        .sort((a, b) => (b.login_count || 0) - (a.login_count || 0))
        .slice(0, 5);

      const topTeachers = [...allTeachers]
        .filter(t => (t.login_count || 0) > 0)
        .sort((a, b) => (b.login_count || 0) - (a.login_count || 0))
        .slice(0, 5);

      return { studentLogins, teacherLogins, topStudents, topTeachers };
  }, [students, allTeachers]);

  return (
    <div className="font-prompt animate-fade-in space-y-8">
        {/* Dashboard Header */}
        <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden border-b-8 border-indigo-500">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck size={150}/></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-indigo-500 p-2 rounded-xl text-white shadow-lg"><Activity size={24}/></div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Executive Dashboard</h3>
                </div>
                <p className="text-slate-400 font-bold text-sm">โรงเรียน: {teacher.school}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                    <HeaderStat label="นร.ทั้งหมด" val={students.length} sub="คน" color="text-blue-400"/>
                    <HeaderStat label="ครูทั้งหมด" val={allTeachers.length} sub="คน" color="text-purple-400"/>
                    <HeaderStat label="จำนวนการสอบ" val={stats.length} sub="ครั้ง" color="text-emerald-400"/>
                    <HeaderStat label="Mastery รวม" val={subjectProgress.length > 0 ? Math.round(subjectProgress.reduce((s,x)=>s+x.average,0)/subjectProgress.length) : 0} sub="%" color="text-yellow-400"/>
                </div>
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-[22px] w-fit shadow-inner">
            <button 
                onClick={() => setActiveTab('PROGRESS')} 
                className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'PROGRESS' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <TrendingUp size={18}/> พัฒนาการนักเรียน
            </button>
            <button 
                onClick={() => setActiveTab('USAGE')} 
                className={`px-8 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${activeTab === 'USAGE' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <UserCheck size={18}/> การเข้าใช้งานระบบ
            </button>
        </div>

        {/* Content Area */}
        {activeTab === 'PROGRESS' ? (
            <div className="animate-slide-up grid grid-cols-1 lg:grid-cols-2 gap-6">
                {subjectProgress.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                        <BarChart3 size={60} className="mx-auto text-slate-100 mb-4"/>
                        <p className="font-black text-slate-300 italic">ยังไม่มีข้อมูลการสอบในระบบ</p>
                    </div>
                ) : (
                    subjectProgress.map(sub => (
                        <div key={sub.name} className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm hover:shadow-lg transition-all group border-l-8 border-l-indigo-500">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                        <Database size={20}/>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-lg">{sub.name}</h4>
                                        <div className="flex gap-1 mt-0.5">
                                            {sub.grades.map(g => (
                                                <span key={g} className="text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">{GRADE_LABELS[g] || g}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-slate-800">{sub.average}%</div>
                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Mastery Rate</div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">
                                        <span>Learning Progress</span>
                                        <span>{sub.attempts} Quiz Attempts</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${sub.average >= 80 ? 'bg-emerald-500' : sub.average >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                                            style={{ width: `${sub.average}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        ) : (
            <div className="animate-slide-up space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[40px] border border-indigo-100 shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                            <div className="bg-indigo-600 text-white p-5 rounded-3xl shadow-xl group-hover:scale-110 transition-transform"><UserCog size={32}/></div>
                            <div>
                                <div className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Teacher Activity</div>
                                <div className="text-4xl font-black text-slate-800">{usageStats.teacherLogins.toLocaleString()}</div>
                                <p className="text-slate-400 text-xs font-bold mt-1">จำนวนการล็อกอินของคุณครูรวม</p>
                            </div>
                        </div>
                        <div className="hidden md:block"><Award size={48} className="text-indigo-200 opacity-50"/></div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-white p-8 rounded-[40px] border border-emerald-100 shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                            <div className="bg-emerald-600 text-white p-5 rounded-3xl shadow-xl group-hover:scale-110 transition-transform"><GraduationCap size={32}/></div>
                            <div>
                                <div className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Student Activity</div>
                                <div className="text-4xl font-black text-slate-800">{usageStats.studentLogins.toLocaleString()}</div>
                                <p className="text-slate-400 text-xs font-bold mt-1">จำนวนการล็อกอินของนักเรียนรวม</p>
                            </div>
                        </div>
                        <div className="hidden md:block"><Medal size={48} className="text-emerald-200 opacity-50"/></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Teachers */}
                    <div className="bg-white rounded-[45px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                            <h4 className="font-black text-slate-700 flex items-center gap-2"><ArrowUpRight className="text-indigo-500" size={20}/> อันดับคุณครูเข้าใช้งานสูงสุด</h4>
                            <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full text-indigo-600 shadow-sm">TOP 5</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {usageStats.topTeachers.map((t, i) => (
                                <div key={t.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{i+1}</div>
                                        <div>
                                            <div className="font-black text-slate-800">{t.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{t.position}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-indigo-600">{t.login_count || 0}</div>
                                        <div className="text-[9px] font-black text-slate-300 uppercase">Logins</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Students */}
                    <div className="bg-white rounded-[45px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                            <h4 className="font-black text-slate-700 flex items-center gap-2"><Medal className="text-emerald-500" size={20}/> อันดับนักเรียนเข้าใช้งานสูงสุด</h4>
                            <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full text-emerald-600 shadow-sm">TOP 5</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {usageStats.topStudents.map((s, i) => (
                                <div key={s.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">{i+1}</div>
                                        <div className="text-2xl">{s.avatar}</div>
                                        <div>
                                            <div className="font-black text-slate-800">{s.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{GRADE_LABELS[s.grade || '']}/{s.classroom}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-emerald-600">{s.login_count || 0}</div>
                                        <div className="text-[9px] font-black text-slate-300 uppercase">Logins</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const HeaderStat = ({ label, val, sub, color }: { label: string, val: number, sub: string, color: string }) => (
    <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className={`text-3xl font-black ${color}`}>{val.toLocaleString()}<span className="text-sm font-bold text-white/40 ml-1">{sub}</span></div>
    </div>
);

export default ExecutiveDashboard;
