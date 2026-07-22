
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Student, ExamResult, SubjectConfig, Teacher, Classroom, Question } from '../../types';
import { 
  BarChart2, GraduationCap, 
  X, Users, ChevronRight, Trophy, Target, 
  BookOpen, Calculator, Atom, Languages, Globe, 
  Award, Medal, Zap, 
  LayoutGrid, Search, Building2, LineChart
} from 'lucide-react';
import { getClassrooms, getQuestionsBySubjectAndGrade } from '../../services/api';
import TeacherAnalytics from '../../components/TeacherAnalytics';

interface StatsViewerProps {
  students: Student[];
  stats: ExamResult[];
  availableSubjects: SubjectConfig[];
  canManageAll: boolean;
  myGrades: string[];
  teacher: Teacher; 
  onRefresh: () => void;
  questions?: Question[]; // Added questions prop
}

const GRADES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3'];
const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
};

const StatsViewer: React.FC<StatsViewerProps> = ({ students, stats, canManageAll, myGrades, teacher, questions = [] }) => {
  const [statsSubTab, setStatsSubTab] = useState<'INDIVIDUAL' | 'TOPIC'>('INDIVIDUAL');
  const [viewLevel, setViewLevel] = useState<'GRADE' | 'ROOM' | 'LIST'>('GRADE');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedStudentForStats, setSelectedStudentForStats] = useState<Student | null>(null);
  
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [allQuestions, setAllQuestions] = useState<Question[]>(questions);

  useEffect(() => {
    if (questions && questions.length > 0) {
        setAllQuestions(questions);
    } else {
        // Fetch questions if not provided
        const fetchAllQs = async () => {
            const data = await getQuestionsBySubjectAndGrade('ALL', 'ALL', teacher.school);
            setAllQuestions(data);
        };
        fetchAllQs();
    }
  }, [questions, teacher.school]);

  useEffect(() => {
      const fetchRooms = async () => {
          const data = await getClassrooms(teacher.school);
          setAllClassrooms(data);
      };
      fetchRooms();
  }, [teacher.school]);

  const myVisibleGrades = useMemo(() => {
      if (canManageAll) return GRADES;
      return GRADES.filter(g => myGrades.includes(g));
  }, [canManageAll, myGrades]);

  const getIndividualStats = (student: Student) => {
      const studentId = String(student.id).trim();
      const studentResults = stats.filter(r => String(r.studentId).trim() === studentId);
      
      const subjectMap: Record<string, { attempts: number, totalScore: number }> = {};
      let nationalTotalScore = 0;
      let nationalCount = 0;

      studentResults.forEach(r => {
          if (!subjectMap[r.subject]) subjectMap[r.subject] = { attempts: 0, totalScore: 0 };
          subjectMap[r.subject].attempts++;
          subjectMap[r.subject].totalScore += (r.score / (r.totalQuestions || 1)) * 100;

          const isNational = r.category === 'ONET' || r.category === 'NT' || (r.subject && (r.subject.includes('O-NET') || r.subject.includes('NT')));
          if (isNational) {
              nationalCount++;
              nationalTotalScore += (r.score / (r.totalQuestions || 1)) * 100;
          }
      });

      const subjects = Object.entries(subjectMap).map(([name, data]) => ({
          name,
          attempts: data.attempts,
          average: Math.round(data.totalScore / data.attempts)
      })).sort((a,b) => b.average - a.average);

      const national = nationalCount > 0 ? {
          attempts: nationalCount,
          average: Math.round(nationalTotalScore / nationalCount)
      } : null;

      const overallAverage = subjects.length > 0 
          ? Math.round(subjects.reduce((sum, s) => sum + s.average, 0) / subjects.length)
          : 0;

      return { subjects, national, overallAverage, totalAttempts: studentResults.length };
  };

  const filteredStudents = useMemo(() => {
      return students.filter(s => 
          s.grade === selectedGrade && 
          (selectedRoom === 'ALL' || s.classroom === selectedRoom) &&
          (s.name.includes(searchTerm) || s.id.includes(searchTerm))
      );
  }, [students, selectedGrade, selectedRoom, searchTerm]);

  const getRoomsForGrade = (grade: string) => {
      return allClassrooms
          .filter(c => c.gradeLevel === grade)
          .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
  };

  const getSubjectIcon = (name: string) => {
      if (name.includes('คณิต')) return <Calculator size={14}/>;
      if (name.includes('วิทย์')) return <Atom size={14}/>;
      if (name.includes('ไทย')) return <BookOpen size={14}/>;
      if (name.includes('อังกฤษ')) return <Languages size={14}/>;
      if (name.includes('สังคม')) return <Globe size={14}/>;
      return <Award size={14}/>;
  };

  return (
    <div className="font-prompt animate-fade-in pb-10">
        <div className="flex bg-slate-100 p-1.5 rounded-[22px] mb-8 w-fit shadow-inner">
            <button 
                onClick={() => setStatsSubTab('INDIVIDUAL')} 
                className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${statsSubTab === 'INDIVIDUAL' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
            >
                <Users size={18}/> รายบุคคล/ห้องเรียน
            </button>
            <button 
                onClick={() => setStatsSubTab('TOPIC')} 
                className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${statsSubTab === 'TOPIC' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-600 hover:text-slate-800'}`}
            >
                <LineChart size={18}/> สถิติรายหัวข้อ/หน่วย
            </button>
        </div>

        {statsSubTab === 'TOPIC' ? (
            <TeacherAnalytics stats={stats} questions={allQuestions} />
        ) : (
            <>
                <div className="flex items-center gap-2 mb-8 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-fit">
            <button 
                onClick={() => { setViewLevel('GRADE'); setSelectedGrade(null); setSelectedRoom(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all ${viewLevel === 'GRADE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
            >
                <LayoutGrid size={14}/> ระดับชั้น
            </button>
            {selectedGrade && (
                <>
                    <ChevronRight size={14} className="text-slate-400"/>
                    <button 
                        onClick={() => { setViewLevel('ROOM'); setSelectedRoom(null); }}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${viewLevel === 'ROOM' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        ชั้น {GRADE_LABELS[selectedGrade]}
                    </button>
                </>
            )}
            {selectedRoom && (
                <>
                    <ChevronRight size={14} className="text-slate-300"/>
                    <span className="px-3 py-1.5 rounded-xl font-black text-xs bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {selectedRoom === 'ALL' ? 'นักเรียนทุกคน' : `ห้อง ${selectedRoom}`}
                    </span>
                </>
            )}
        </div>

        {viewLevel === 'GRADE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myVisibleGrades.map(g => {
                    const studentCount = students.filter(s => s.grade === g).length;
                    return (
                        <button 
                            key={g}
                            onClick={() => { setSelectedGrade(g); setViewLevel('ROOM'); }}
                            className="bg-white p-8 rounded-[40px] border-b-[8px] border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition duration-500 transform group-hover:scale-110"><GraduationCap size={120}/></div>
                            <div className="bg-indigo-50 text-indigo-600 w-16 h-16 rounded-[22px] flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all duration-300 shadow-inner">
                                <GraduationCap size={36}/>
                            </div>
                            <h4 className="text-2xl font-black text-slate-800 tracking-tight">ระดับชั้น {GRADE_LABELS[g]}</h4>
                            <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Students: {studentCount} Members</p>
                            <div className="mt-8 flex items-center justify-between">
                                <span className="text-indigo-600 font-black text-xs bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">เลือกชั้นเรียน</span>
                                <ChevronRight className="text-slate-200 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all"/>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}

        {viewLevel === 'ROOM' && selectedGrade && (
            <div className="space-y-8 animate-slide-up">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-[45px] text-white shadow-xl relative overflow-hidden border-b-8 border-indigo-500">
                    <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-10 -translate-y-10"><Users size={150}/></div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black mb-2">ชั้น {GRADE_LABELS[selectedGrade]}</h3>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                           <Target size={16} className="text-indigo-400"/> เลือกห้องเรียนที่ต้องการตรวจสอบสถิติ
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                        onClick={() => { setSelectedRoom('ALL'); setViewLevel('LIST'); }}
                        className="bg-white p-8 rounded-[35px] shadow-sm border-2 border-slate-100 hover:border-indigo-400 hover:shadow-xl transition-all text-left relative overflow-hidden group"
                    >
                        <div className="bg-slate-100 text-slate-400 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-slate-800 group-hover:text-white transition-all">
                            <LayoutGrid size={24}/>
                        </div>
                        <div className="font-black text-xl text-slate-800">นักเรียนทุกคน</div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Total {students.filter(s=>s.grade===selectedGrade).length} persons</p>
                    </button>

                    {getRoomsForGrade(selectedGrade).map(room => {
                        const count = students.filter(s => s.grade === selectedGrade && s.classroom === room.roomNumber).length;
                        return (
                            <button 
                                key={room.id}
                                onClick={() => { setSelectedRoom(room.roomNumber); setViewLevel('LIST'); }}
                                className="bg-white p-8 rounded-[35px] border-2 border-slate-100 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all text-left group"
                            >
                                <div className="text-[10px] text-indigo-500 font-black uppercase mb-1 tracking-widest flex items-center gap-1"><Zap size={10} fill="currentColor"/> Room No.</div>
                                <div className="text-3xl font-black text-slate-800 group-hover:text-indigo-600 transition">ห้อง {room.roomNumber}</div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-xs font-black text-slate-500">{count} นักเรียน</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )}

        {viewLevel === 'LIST' && selectedGrade && (
            <div className="space-y-6 animate-slide-up">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
                    <div>
                        <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-2xl text-indigo-600"><Users size={24}/></div>
                            {selectedRoom === 'ALL' ? `ชั้น ${GRADE_LABELS[selectedGrade]}` : `ห้อง ${GRADE_LABELS[selectedGrade]}/${selectedRoom}`}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 ml-11">ค้นพบนักเรียน {filteredStudents.length} รายการ</p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาชื่อ หรือ รหัส..."
                            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-300 outline-none transition font-bold text-sm"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" size={18}/>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                            <Users size={60} className="mx-auto text-slate-100 mb-4"/>
                            <p className="font-black text-slate-300 italic">ไม่พบข้อมูลนักเรียนในเงื่อนไขนี้</p>
                        </div>
                    ) : (
                        filteredStudents.map(s => {
                            const pData = getIndividualStats(s);
                            const label = (s.grade === 'P3') ? 'NT' : 'O-NET';
                            const isNationalGrade = ['P3', 'P6', 'M3'].includes(s.grade || '');
                            
                            return (
                                <div 
                                    key={s.id} 
                                    onClick={() => setSelectedStudentForStats(s)}
                                    className="bg-white rounded-[35px] p-6 shadow-sm border-2 border-slate-50 hover:border-indigo-300 hover:shadow-xl transition-all cursor-pointer group relative flex flex-col h-full border-b-[8px]"
                                >
                                    {isNationalGrade && pData.national && (
                                        <div className="absolute -top-3 -right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg border border-white z-10 animate-bounce">
                                            {label}: {pData.national.average}%
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="text-5xl bg-slate-50 p-2.5 rounded-[25px] border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                            {s.avatar}
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="font-black text-slate-800 text-lg leading-tight truncate">{s.name}</h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black border border-indigo-100">ID: {s.id}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">{GRADE_LABELS[s.grade || '']}/{s.classroom}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 mb-6">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Mastery</span>
                                            <span className="text-sm font-black text-slate-700">{pData.overallAverage}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${pData.overallAverage >= 80 ? 'bg-emerald-500' : pData.overallAverage >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                                                style={{ width: `${pData.overallAverage}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-50">
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Achievement</div>
                                        <div className="flex flex-wrap gap-2">
                                            {pData.subjects.slice(0, 3).map(sub => (
                                                <div key={sub.name} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                                                    <span className="text-indigo-500">{getSubjectIcon(sub.name)}</span>
                                                    <span className="text-[10px] font-black text-slate-600">{sub.average}%</span>
                                                </div>
                                            ))}
                                            {pData.subjects.length === 0 && <span className="text-[10px] text-slate-300 font-bold italic">ยังไม่มีข้อมูลการสอบ</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="absolute bottom-4 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <ChevronRight size={20} className="text-indigo-400"/>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}
    </>
)}

        {selectedStudentForStats && createPortal(
            <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in font-prompt">
                <div className="bg-white rounded-[45px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative border-b-[12px] border-slate-100">
                    <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy size={120}/></div>
                        <button 
                            onClick={() => setSelectedStudentForStats(null)}
                            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
                        >
                            <X size={24}/>
                        </button>
                        
                        <div className="flex items-center gap-6">
                            <div className="text-6xl bg-white/20 p-5 rounded-[30px] backdrop-blur-md border border-white/30 shadow-2xl transform -rotate-3">
                                {selectedStudentForStats.avatar}
                            </div>
                            <div>
                                <h3 className="text-3xl font-black leading-tight tracking-tight">{selectedStudentForStats.name}</h3>
                                <p className="text-indigo-200 font-bold text-xs uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <Building2 size={14}/> ชั้น {GRADE_LABELS[selectedStudentForStats.grade || '']}/{selectedStudentForStats.classroom} • ID: {selectedStudentForStats.id}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
                        {(() => {
                            const pData = getIndividualStats(selectedStudentForStats);
                            const label = (selectedStudentForStats.grade === 'P3') ? 'NT' : 'O-NET';
                            const isNationalGrade = ['P3', 'P6', 'M3'].includes(selectedStudentForStats.grade || '');

                            return (
                                <div className="space-y-8">
                                    {isNationalGrade && (
                                        <div className="animate-slide-up">
                                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[35px] p-8 text-white shadow-xl relative overflow-hidden border-b-4 border-black/10">
                                                <div className="absolute top-0 right-0 p-4 opacity-20"><Medal size={80}/></div>
                                                <h4 className="font-black text-xl flex items-center gap-2 mb-6 drop-shadow-sm">
                                                    <Trophy size={26}/> สถิติวิเคราะห์เป้าหมาย {label}
                                                </h4>
                                                
                                                {pData.national ? (
                                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                                        <div className="bg-black/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 shadow-inner">
                                                            <div className="text-[10px] font-black uppercase text-yellow-100 tracking-widest mb-1">ความแม่นยำ {label}</div>
                                                            <div className="text-4xl font-black mt-1 flex items-baseline gap-1">
                                                                {pData.national.average}<span className="text-sm font-bold text-yellow-100">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-black/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 shadow-inner">
                                                            <div className="text-[10px] font-black uppercase text-yellow-100 tracking-widest mb-1">จำนวนชุดที่ทดสอบ</div>
                                                            <div className="text-4xl font-black mt-1 flex items-baseline gap-1">
                                                                {pData.national.attempts}<span className="text-sm font-bold text-yellow-100">ชุด</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-3xl border border-dashed border-white/30 text-center italic font-bold">
                                                        นักเรียนยังไม่ได้ทำชุดข้อสอบเตรียมสอบ {label}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center px-2">
                                            <h4 className="font-black text-slate-800 text-xl flex items-center gap-2">
                                                <BarChart2 className="text-indigo-600" size={24}/> คะแนนเฉลี่ยสะสมรายวิชา
                                            </h4>
                                            <span className="text-[10px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">Total Attempts: {pData.totalAttempts}</span>
                                        </div>
                                        
                                        {pData.subjects.length === 0 ? (
                                            <div className="p-16 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                                                <Zap size={48} className="mx-auto text-slate-100 mb-4"/>
                                                <p className="text-slate-300 font-black italic">ยังไม่มีข้อมูลการเข้าทำข้อสอบ</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {pData.subjects.map(sub => (
                                                    <div key={sub.name} className="bg-white p-6 rounded-[35px] border-2 border-slate-50 shadow-sm group hover:shadow-md transition-all relative overflow-hidden">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="p-3 bg-slate-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                                {getSubjectIcon(sub.name)}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-3xl font-black text-slate-800 leading-none">{sub.average}%</div>
                                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Mastery Level</div>
                                                            </div>
                                                        </div>
                                                        <h5 className="font-black text-slate-700 text-sm mb-4 truncate">{sub.name}</h5>
                                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3 p-0.5 shadow-inner">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 shadow-sm ${sub.average >= 80 ? 'bg-emerald-500' : sub.average >= 50 ? 'bg-orange-500' : 'bg-rose-500'}`} 
                                                                style={{ width: `${sub.average}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
                        <button 
                            onClick={() => setSelectedStudentForStats(null)}
                            className="flex-1 py-4 bg-slate-800 text-white rounded-[25px] font-black text-lg shadow-xl hover:bg-slate-700 transition active:scale-95 border-b-4 border-slate-900"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            </div>, document.body
        )}
    </div>
  );
};

export default StatsViewer;
