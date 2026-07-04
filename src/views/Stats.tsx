
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  ArrowLeft, Trophy, Activity, Target, 
  BookOpen, Zap, 
  ClipboardList, ClipboardCheck,
  Calculator, Microscope, Languages, Landmark, FileText
} from 'lucide-react';
import { ExamResult, Assignment } from '../types';

interface StatsProps {
  examResults: ExamResult[];
  assignments: Assignment[];
  studentId: string;
  onBack: () => void;
}

const Stats: React.FC<StatsProps> = ({ examResults, assignments, studentId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'homework' | 'practice'>('homework');

  const THEMES: Record<string, { main: string, gradient: string[], lightBg: string, icon: any, color: string }> = {
      'คณิตศาสตร์': { main: '#ef4444', gradient: ['#fca5a5', '#ef4444'], lightBg: 'bg-rose-50', icon: Calculator, color: '#ef4444' },
      'วิทยาศาสตร์': { main: '#10b981', gradient: ['#6ee7b7', '#10b981'], lightBg: 'bg-emerald-50', icon: Microscope, color: '#10b981' },
      'ภาษาไทย': { main: '#f59e0b', gradient: ['#fcd34d', '#f59e0b'], lightBg: 'bg-amber-50', icon: BookOpen, color: '#f59e0b' },
      'ภาษาอังกฤษ': { main: '#3b82f6', gradient: ['#93c5fd', '#3b82f6'], lightBg: 'bg-blue-50', icon: Languages, color: '#3b82f6' },
      'สังคมศึกษา': { main: '#8b5cf6', gradient: ['#c4b5fd', '#8b5cf6'], lightBg: 'bg-violet-50', icon: Landmark, color: '#8b5cf6' },
  };

  const getSubjectTheme = (subjectName: string) => THEMES[subjectName] || { main: '#6366f1', gradient: ['#a5b4fc', '#6366f1'], lightBg: 'bg-indigo-50', icon: FileText, color: '#6366f1' };

  const myAllResults = useMemo(() => examResults.filter(r => String(r.studentId).trim() === String(studentId).trim()), [examResults, studentId]);
  const homeworkResults = useMemo(() => myAllResults.filter(r => r.assignmentId && r.assignmentId !== '-' && r.assignmentId !== ''), [myAllResults]);
  const practiceResults = useMemo(() => myAllResults.filter(r => !r.assignmentId || r.assignmentId === '-' || r.assignmentId === ''), [myAllResults]);

  const homeworkList = useMemo(() => {
      return homeworkResults.map(res => {
          const assignment = assignments.find(a => String(a.id).trim() === String(res.assignmentId).trim());
          return { ...res, assignmentTitle: assignment?.title || assignment?.subject || res.subject || 'ภารกิจพิเศษ', percentage: Math.round((res.score / res.totalQuestions) * 100) };
      }).sort((a, b) => b.timestamp - a.timestamp);
  }, [homeworkResults, assignments]);

  const statsSummary = useMemo(() => {
    const data = (activeTab === 'homework' ? homeworkResults : practiceResults);
    const uniqueSubjects = Array.from(new Set(data.map(r => r.subject)));
    const chartData = uniqueSubjects.map(subject => {
        const subjectResults = data.filter(r => r.subject === subject);
        let avgScore = subjectResults.length > 0 ? Math.round(subjectResults.reduce((sum, r) => sum + ((r.score / r.totalQuestions) * 100), 0) / subjectResults.length) : 0;
        const theme = getSubjectTheme(subject as string);
        return { name: subject, score: avgScore, gradient: theme.gradient, lightBg: theme.lightBg };
    });
    const playedSubjects = chartData.sort((a,b) => b.score - a.score);
    return { chartData, bestSubject: playedSubjects[0], weakSubject: playedSubjects[playedSubjects.length - 1], total: data.length };
  }, [homeworkResults, practiceResults, activeTab]);

  return (
    <div className="space-y-4 pb-20 font-prompt animate-fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><ArrowLeft size={18} /></button>
            <h2 className="text-base font-black text-slate-800">สรุปการเรียนรู้</h2>
          </div>
          <div className="bg-slate-100 p-0.5 rounded-xl flex">
             <button onClick={() => setActiveTab('homework')} className={`px-4 py-1.5 rounded-lg font-black text-[10px] transition-all flex items-center gap-1 ${activeTab === 'homework' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><ClipboardList size={12}/> การบ้าน</button>
             <button onClick={() => setActiveTab('practice')} className={`px-4 py-1.5 rounded-lg font-black text-[10px] transition-all flex items-center gap-1 ${activeTab === 'practice' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Zap size={12}/> ฝึกฝน</button>
          </div>
      </div>

      <div className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
        <h3 className="font-black text-[10px] text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Activity size={12} className="text-indigo-500" /> คะแนนเฉลี่ย (%)
        </h3>
        {statsSummary.total > 0 ? (
            <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsSummary.chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <defs>{statsSummary.chartData.map((entry, index) => (<linearGradient key={index} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={entry.gradient[0]}/><stop offset="100%" stopColor={entry.gradient[1]}/></linearGradient>))}</defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip cursor={{fill: '#f8fafc', radius: 10}} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: 'bold', fontSize: '11px' }} />
                        <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={30}>{statsSummary.chartData.map((_, index) => (<Cell key={index} fill={`url(#grad-${index})`} />))}</Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        ) : (
            <div className="h-[180px] flex flex-col items-center justify-center text-slate-300"><p className="font-black text-xs">ไม่มีข้อมูล</p></div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
          {statsSummary.bestSubject ? (
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm"><Trophy size={20}/></div>
                  <div>
                      <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">จุดแข็ง</div>
                      <div className="font-black text-slate-800 text-xs truncate max-w-[100px]">{statsSummary.bestSubject.name}</div>
                  </div>
              </div>
          ) : null}
          {statsSummary.weakSubject ? (
              <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm"><Target size={20}/></div>
                  <div>
                      <div className="text-[8px] font-black text-rose-600 uppercase tracking-widest">ควรฝึกเพิ่ม</div>
                      <div className="font-black text-slate-800 text-xs truncate max-w-[100px]">{statsSummary.weakSubject.name}</div>
                  </div>
              </div>
          ) : null}
      </div>

      <div className="animate-slide-up space-y-3 pt-2">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><ClipboardCheck className="text-emerald-500" size={18}/> ประวัติทั้งหมด</h3>
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-black border border-slate-200">COUNT: {(activeTab === 'homework' ? homeworkList : practiceResults).length}</span>
          </div>
          <div className="bg-white rounded-[25px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
              {(activeTab === 'homework' ? homeworkList : practiceResults.map(r => ({...r, assignmentTitle: 'ฝึกฝนทั่วไป', percentage: Math.round((r.score/r.totalQuestions)*100)}))).map((res, idx) => {
                  const theme = getSubjectTheme(res.subject);
                  const Icon = theme.icon;
                  return (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.lightBg}`} style={{ color: theme.color }}><Icon size={18}/></div>
                              <div className="min-w-0">
                                  <h4 className="font-black text-slate-700 text-xs truncate leading-tight">{(res as any).assignmentTitle}</h4>
                                  <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">{res.subject} • {new Date(res.timestamp).toLocaleDateString('th-TH')}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                              <div className={`text-xs font-black ${(res as any).percentage >= 80 ? 'text-emerald-500' : (res as any).percentage >= 50 ? 'text-orange-500' : 'text-rose-500'}`}>{(res as any).percentage}%</div>
                              <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-center min-w-[50px]">
                                  <div className="text-xs font-black text-slate-800 leading-none">{res.score}<span className="text-[8px] text-slate-300 ml-0.5">/{res.totalQuestions}</span></div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
};

export default Stats;
