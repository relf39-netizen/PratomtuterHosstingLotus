
import React, { useMemo } from 'react';
import { ExamResult, Question } from '../types';
import { 
  TrendingUp, TrendingDown, Target, 
  BarChart3, 
  AlertCircle, CheckCircle2, BookOpen
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface TeacherAnalyticsProps {
  stats: ExamResult[];
  questions: Question[];
}

const TeacherAnalytics: React.FC<TeacherAnalyticsProps> = ({ stats, questions }) => {
  // 📊 สรุปสถิติรายหัวข้อ (Topic/Unit Analysis)
  const topicStats = useMemo(() => {
    const topics: Record<string, { name: string; correct: number; total: number }> = {};
    
    stats.forEach(res => {
      if (res.details && Array.isArray(res.details)) {
        res.details.forEach(det => {
          const topicName = det.topic || 'ทั่วไป';
          if (!topics[topicName]) {
            topics[topicName] = { name: topicName, correct: 0, total: 0 };
          }
          topics[topicName].total += 1;
          if (det.isCorrect) topics[topicName].correct += 1;
        });
      }
    });

    return Object.values(topics).map(t => ({
      ...t,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
    })).sort((a, b) => b.accuracy - a.accuracy);
  }, [stats]);

  // ❌ วิเคราะห์ข้อสอบที่ผิดบ่อยที่สุด
  const missedQuestions = useMemo(() => {
    const questionMissed: Record<string, { id: string; text: string; missedCount: number; totalCount: number }> = {};
    
    stats.forEach(res => {
      if (res.details && Array.isArray(res.details)) {
        res.details.forEach(det => {
          if (!questionMissed[det.questionId]) {
            const q = questions.find(q => String(q.id) === String(det.questionId));
            questionMissed[det.questionId] = { 
              id: det.questionId, 
              text: q ? q.text : 'ไม่พบข้อมูลโจทย์', 
              missedCount: 0, 
              totalCount: 0 
            };
          }
          questionMissed[det.questionId].totalCount += 1;
          if (!det.isCorrect) questionMissed[det.questionId].missedCount += 1;
        });
      }
    });

    return Object.values(questionMissed)
      .filter(q => q.totalCount > 0)
      .map(q => ({
        ...q,
        missRate: Math.round((q.missedCount / q.totalCount) * 100)
      }))
      .sort((a, b) => b.missRate - a.missRate)
      .slice(0, 5);
  }, [stats, questions]);

  const bestTopic = topicStats[0];
  const worstTopic = topicStats[topicStats.length - 1];

  return (
    <div className="space-y-8 animate-fade-in font-prompt pb-20">
      {/* 🎯 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[30px] border-b-8 border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
              <TrendingUp size={24}/>
            </div>
            <div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">หัวข้อที่ทำได้ดีที่สุด</h5>
              <p className="font-black text-slate-800 text-lg truncate w-40">{bestTopic?.name || '-'}</p>
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600">{bestTopic?.accuracy || 0}% <span className="text-xs text-slate-400 font-bold">ความแม่นยำ</span></div>
        </div>

        <div className="bg-white p-6 rounded-[30px] border-b-8 border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
              <TrendingDown size={24}/>
            </div>
            <div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">หัวข้อที่ควรปรับปรุง</h5>
              <p className="font-black text-slate-800 text-lg truncate w-40">{worstTopic?.name || '-'}</p>
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600">{worstTopic?.accuracy || 0}% <span className="text-xs text-slate-400 font-bold">ความแม่นยำ</span></div>
        </div>

        <div className="bg-white p-6 rounded-[30px] border-b-8 border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <Target size={24}/>
            </div>
            <div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำนวนการเข้าสอบทั้งหมด</h5>
              <p className="font-black text-slate-800 text-lg">สถิติรวม</p>
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-600">{stats.length} <span className="text-xs text-slate-400 font-bold">ครั้ง</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 📊 Accuracy by Topic Chart */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-xl text-slate-800 flex items-center gap-3"><BarChart3 className="text-indigo-500"/> ความแม่นยำรายหัวข้อ (%)</h4>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="accuracy" radius={[0, 10, 10, 0]} barSize={30}>
                  {topicStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.accuracy >= 70 ? '#10b981' : entry.accuracy >= 50 ? '#f59e0b' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ⚠️ Most Missed Questions */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-xl text-slate-800 flex items-center gap-3"><AlertCircle className="text-rose-500"/> ข้อสอบที่นักเรียนทำผิดบ่อย</h4>
          </div>
          <div className="space-y-4">
            {missedQuestions.length > 0 ? missedQuestions.map((q, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 group hover:border-rose-200 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center font-black text-rose-500 flex-shrink-0">
                    {q.missRate}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 text-sm line-clamp-2 leading-snug">{q.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${q.missRate}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ทำผิด {q.missedCount} / {q.totalCount} ครั้ง</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center text-slate-300 italic font-black">ยังไม่มีข้อมูลสถิติการทำข้อสอบ</div>
            )}
          </div>
        </div>
      </div>

      {/* 📚 Detailed Topic Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 bg-slate-50 border-b">
            <h4 className="font-black text-xl text-slate-800 flex items-center gap-3"><BookOpen className="text-indigo-500"/> รายละเอียดสถิติรายหน่วยการเรียนรู้</h4>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white text-slate-400 font-black border-b uppercase tracking-widest text-[10px]">
                    <tr>
                        <th className="p-8">หน่วยการเรียนรู้ / หัวข้อ</th>
                        <th className="p-8 text-center">จำนวนข้อที่ตอบ</th>
                        <th className="p-8 text-center">ตอบถูก</th>
                        <th className="p-8 text-center">ความแม่นยำ</th>
                        <th className="p-8 text-right">สถานะการเรียนรู้</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                    {topicStats.map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="p-8 font-black text-lg text-slate-800">{t.name}</td>
                            <td className="p-8 text-center">{t.total}</td>
                            <td className="p-8 text-center text-emerald-600">{t.correct}</td>
                            <td className="p-8 text-center">
                                <span className={`px-4 py-1 rounded-full text-xs font-black border shadow-sm ${t.accuracy >= 70 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : t.accuracy >= 50 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                    {t.accuracy}%
                                </span>
                            </td>
                            <td className="p-8 text-right">
                                {t.accuracy >= 80 ? (
                                    <div className="flex items-center justify-end gap-2 text-emerald-500"><CheckCircle2 size={16}/> ยอดเยี่ยม</div>
                                ) : t.accuracy >= 50 ? (
                                    <div className="flex items-center justify-end gap-2 text-amber-500"><AlertCircle size={16}/> ปานกลาง</div>
                                ) : (
                                    <div className="flex items-center justify-end gap-2 text-rose-500"><AlertCircle size={16}/> ควรทบทวน</div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {topicStats.length === 0 && (
                        <tr><td colSpan={5} className="p-20 text-center text-slate-300 italic font-black">ยังไม่มีข้อมูลสถิติการเรียนรู้</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalytics;
