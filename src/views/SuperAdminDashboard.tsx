import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Teacher, School, RegistrationRequest, ExamResult, Student } from '../types';
import { 
  Building2, LogOut, Search, CheckCircle, Shield, XCircle, 
  ShieldCheck, BarChart3, Activity, 
  Trash2, Users, Bell, X, TrendingUp, 
  ExternalLink, UserCog, Filter, Check, Eye, RefreshCw,
  Star, Zap, Target, Medal, ArrowUpRight, Trophy, ImageIcon, Upload, Save, Loader2, Settings, Info,
  Sparkles, ShieldAlert
} from 'lucide-react';
import { 
  getSchools, manageSchool, getAllTeachers, getAllPendingRegistrations, 
  approveRegistration, rejectRegistration, getSuperAdminStats,
  getAppSettings, updateAppSettings, uploadLogo, AppSettings
} from '../services/api';

interface SuperAdminDashboardProps {
  onLogout: () => void;
  onSettingsUpdate?: (settings: AppSettings) => void;
}

const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3', 'ALL': 'ทุกชั้น' 
};

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout, onSettingsUpdate }) => {
  const [activeView, setActiveView] = useState<'OVERVIEW' | 'SCHOOLS' | 'REGISTRATIONS' | 'SETTINGS'>('OVERVIEW');
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings>({ logo_url: '' });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [migrationUrl, setMigrationUrl] = useState('');
  const [migrationKey, setMigrationKey] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationReport, setMigrationReport] = useState<any>(null);
  const [migrationError, setMigrationError] = useState('');

  // School Detail Modal
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [insightTab, setInsightTab] = useState<'OVERVIEW' | 'TEACHERS' | 'STUDENTS'>('OVERVIEW');

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await getAppSettings();
    setAppSettings(s);
  };

  const loadData = async () => {
    setLoading(true);
    try {
        const [s, t, r, allData] = await Promise.all([
            getSchools(),
            getAllTeachers(),
            getAllPendingRegistrations(),
            getSuperAdminStats()
        ]);
        
        if (allData) {
            setStudents(allData.students);
            setResults(allData.results);
            setTeachers(allData.teachers || t);
        }

        setSchools(s);
        setPendingRequests(r);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // --- District Intelligence Calculations ---
  const districtRankings = useMemo(() => {
      const rankings = schools.map(school => {
          const schoolStudents = students.filter(s => s.school === school.name);
          const schoolTeachers = teachers.filter(t => t.school === school.name);
          const schoolResults = results.filter(r => r.school === school.name);

          const studentLogins = schoolStudents.reduce((sum, s) => sum + (Number(s.login_count) || 0), 0);
          const teacherLogins = schoolTeachers.reduce((sum, t) => sum + (Number(t.login_count) || 0), 0);
          const totalLogins = studentLogins + teacherLogins;

          const avgScore = schoolResults.length > 0
              ? Math.round(schoolResults.reduce((sum, r) => sum + (r.score / (r.totalQuestions || 1)) * 100, 0) / schoolResults.length)
              : 0;

          return { ...school, totalLogins, avgScore, studentCount: schoolStudents.length };
      });

      const mostActive = [...rankings].sort((a, b) => b.totalLogins - a.totalLogins).slice(0, 5);
      const topAcademic = [...rankings].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

      return { mostActive, topAcademic };
  }, [schools, students, teachers, results]);

  const districtSubjectRankings = useMemo(() => {
      const map: Record<string, { totalScore: number, count: number }> = {};
      results.forEach(r => {
          if (!map[r.subject]) map[r.subject] = { totalScore: 0, count: 0 };
          map[r.subject].totalScore += (r.score / (r.totalQuestions || 1)) * 100;
          map[r.subject].count++;
      });
      return Object.entries(map).map(([name, data]) => ({
          name,
          average: Math.round(data.totalScore / data.count)
      })).sort((a, b) => b.average - a.average);
  }, [results]);

  const handleApproveSchool = async (req: RegistrationRequest) => {
      if (!confirm(`ยืนยันการเปิดโรงเรียนใหม่: ${req.schoolName} และแต่งตั้ง ${req.name} เป็นแอดมินโรงเรียน?`)) return;
      setProcessingId(req.id);
      const success = await approveRegistration(req, 'SCHOOL_ADMIN', 'ALL', req.schoolName || '');
      if (success) {
          alert("อนุมัติโรงเรียนใหม่สำเร็จแล้ว");
          await loadData();
      } else {
          alert("เกิดข้อผิดพลาดในการอนุมัติ");
      }
      setProcessingId(null);
  };

  const handleReject = async (reqId: string) => {
      if (!confirm("ต้องการปฏิเสธคำขอนี้ใช่หรือไม่?")) return;
      setProcessingId(reqId);
      const success = await rejectRegistration(reqId);
      if (success) await loadData();
      setProcessingId(null);
  };

  const handleToggleSchoolStatus = async (school: School) => {
      const newStatus = school.status === 'active' ? 'inactive' : 'active';
      const actionLabel = newStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน';
      if (!confirm(`คุณต้องการ ${actionLabel} โรงเรียน "${school.name}" ใช่หรือไม่?`)) return;
      setProcessingId(school.id);
      const res = await manageSchool('update_status', { id: school.id, status: newStatus });
      if (res.success) await loadData();
      else alert("เกิดข้อผิดพลาด: " + res.message);
      setProcessingId(null);
  };

  const handleDeleteSchool = async (school: School) => {
      if (!confirm(`⚠️ คำเตือน: คุณกำลังลบโรงเรียน "${school.name}" ออกจากระบบถาวร\nข้อมูลทั้งหมดจะถูกลบถาวร\n\nยืนยันการลบ?`)) return;
      const pin = prompt(`กรุณากรอกรหัส Smiss (${school.schoolCode}) เพื่อยืนยันการลบ:`);
      if (pin !== school.schoolCode) return alert("รหัสไม่ถูกต้อง การลบถูกยกเลิก");
      setProcessingId(school.id);
      const res = await manageSchool('delete', { id: school.id });
      if (res.success) { alert("ลบโรงเรียนเรียบร้อยแล้ว"); await loadData(); }
      else { alert("เกิดข้อผิดพลาด: " + res.message); }
      setProcessingId(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      try {
          const url = await uploadLogo(file);
          if (url) {
              setAppSettings(prev => ({ ...prev, logo_url: url }));
              await updateAppSettings({ logo_url: url });
              if (onSettingsUpdate) onSettingsUpdate({ ...appSettings, logo_url: url });
              alert("อัพโหลดโลโก้สำเร็จ เรียบร้อยแล้วครับ");
          } else {
              alert("เกิดข้อผิดพลาดในการอัพโหลด หรือคุณอาจจะยังไม่ได้สร้าง Bucket 'assets' ใน Supabase");
              // Fallback: manually input URL
              const manualUrl = prompt("ไม่สามารถอัพโหลดโดยตรงได้ (อาจจะเป็นเรื่องสิทธิ์) กรุณาวาง URL ของรูปภาพโลโก้แทนที่นี่:");
              if (manualUrl) {
                setAppSettings(prev => ({ ...prev, logo_url: manualUrl }));
                await updateAppSettings({ logo_url: manualUrl });
              }
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsUploading(false);
      }
  };

  const handleManualLogoUrl = async () => {
    const url = prompt("ระบุ URL ของรูปภาพโลโก้โดยตรง (เช่น https://example.com/logo.png):");
    if (url && url.trim()) {
      setIsSaving(true);
      const res = await updateAppSettings({ logo_url: url });
      if (res.success) {
        setAppSettings(prev => ({ ...prev, logo_url: url }));
        if (onSettingsUpdate) onSettingsUpdate({ ...appSettings, logo_url: url });
        alert("บันทึกโลโก้สำเร็จ เรียบร้อยแล้วครับ");
      } else {
        alert("บันทึกไม่สำเร็จ: " + res.message);
      }
      setIsSaving(false);
    }
  };

  const handleSaveAppName = async () => {
    if (!appSettings.app_name || appSettings.app_name.trim() === "") {
        alert("กรุณาระบุชื่อแอปพลิเคชัน");
        return;
    }
    setIsSaving(true);
    const res = await updateAppSettings({ app_name: appSettings.app_name });
    if (res.success) {
      if (onSettingsUpdate) onSettingsUpdate(appSettings);
      alert("บันทึกชื่อแอปสำเร็จ เรียบร้อยแล้วครับ");
    } else {
      alert("บันทึกไม่สำเร็จ: " + res.message);
    }
    setIsSaving(false);
  };

  const handleMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migrationUrl || !migrationKey) {
      alert("กรุณากรอกข้อมูล URL และ Key ให้ครบถ้วน");
      return;
    }
    
    setMigrationLoading(true);
    setMigrationError('');
    
    const TABLES_TO_IMPORT = [
      { key: 'app_settings', label: 'ข้อมูลโลโก้และชื่อระบบ (app_settings)' },
      { key: 'schools', label: 'รายชื่อโรงเรียน (schools)' },
      { key: 'classrooms', label: 'ห้องเรียนทั้งหมด (classrooms)' },
      { key: 'students', label: 'บัญชีรายชื่อนักเรียน (students)' },
      { key: 'teachers', label: 'บัญชีรายชื่อคุณครู (teachers)' },
      { key: 'subjects', label: 'กลุ่มวิชาเรียน (subjects)' },
      { key: 'assignments', label: 'แบบฝึกหัด/การบ้าน (assignments)' },
      { key: 'questions', label: 'ธนาคารข้อสอบ (questions)' },
      { key: 'exam_results', label: 'คะแนนการทำแบบทดสอบ (exam_results)' },
      { key: 'registration_requests', label: 'คำร้องสมัครสมาชิกคุณครู (registration_requests)' },
      { key: 'finance_accounts', label: 'บัญชีการเงินของโรงเรียน (finance_accounts)' },
      { key: 'finance_transactions', label: 'รายการธุรกรรมทางการเงิน (finance_transactions)' },
      { key: 'tpat_tgat_questions', label: 'คลังข้อสอบ TPAT/TGAT (tpat_tgat_questions)' }
    ];

    // Initialize report
    const initialReport: any = {};
    for (const item of TABLES_TO_IMPORT) {
      initialReport[item.key] = { status: 'pending', label: item.label };
    }
    setMigrationReport(initialReport);

    let successCount = 0;
    let failedCount = 0;

    for (const item of TABLES_TO_IMPORT) {
      // Set current table status to running
      setMigrationReport((prev: any) => ({
        ...prev,
        [item.key]: { ...prev[item.key], status: 'running' }
      }));

      try {
        const response = await fetch('/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'importSingleTableFromSupabase',
            table: item.key,
            supabaseUrl: migrationUrl,
            supabaseKey: migrationKey
          })
        });
        
        const res = await response.json();
        if (res.success) {
          successCount++;
          setMigrationReport((prev: any) => ({
            ...prev,
            [item.key]: { ...prev[item.key], status: 'success', count: res.count }
          }));
        } else {
          failedCount++;
          setMigrationReport((prev: any) => ({
            ...prev,
            [item.key]: { ...prev[item.key], status: 'error', error: res.error || 'ดึงข้อมูลไม่สำเร็จ' }
          }));
        }
      } catch (err: any) {
        failedCount++;
        setMigrationReport((prev: any) => ({
          ...prev,
          [item.key]: { ...prev[item.key], status: 'error', error: err.message || String(err) }
        }));
      }
      
      // Short delay for visual tracking of the migration
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setMigrationLoading(false);
    
    // Final completion alert
    if (failedCount === 0) {
      alert(`ดึงและย้ายข้อมูลจาก Supabase ย้ายมายังฐานข้อมูล MySQL ทั้งหมด ${successCount} ตารางเสร็จสิ้นอย่างสมบูรณ์แบบเรียบร้อยแล้วครับ! 🎉`);
    } else {
      alert(`ดึงข้อมูลเสร็จสิ้นแล้ว: สำเร็จ ${successCount} ตาราง, ล้มเหลว ${failedCount} ตาราง ⚠️ กรุณาดูรายละเอียดข้อผิดพลาดของแต่ละตารางในตารางรายงานผลครับ`);
    }

    // Refresh statistics dashboard
    loadData();
  };

  const filteredSchools = useMemo(() => {
    return schools.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.schoolCode.includes(searchQuery)
    );
  }, [schools, searchQuery]);

  const districtStats = useMemo(() => {
      return {
          totalSchools: schools.length,
          activeSchools: schools.filter(s => s.status === 'active').length,
          totalStudents: students.length,
          totalTeachers: teachers.length
      };
  }, [schools, students, teachers]);

  const schoolInsightData = useMemo(() => {
    if (!selectedSchool) return null;
    const sInSchool = students.filter(s => s.school === selectedSchool.name);
    const tInSchool = teachers.filter(t => t.school === selectedSchool.name);
    const rInSchool = results.filter(r => r.school === selectedSchool.name);

    const gradeSummaryMap: Record<string, { count: number, logins: number, stars: number, scoreTotal: number, scoreCount: number }> = {};
    ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3'].forEach(g => {
        gradeSummaryMap[g] = { count: 0, logins: 0, stars: 0, scoreTotal: 0, scoreCount: 0 };
    });

    sInSchool.forEach(s => {
        const g = s.grade || 'P1';
        if (gradeSummaryMap[g]) {
            gradeSummaryMap[g].count++;
            gradeSummaryMap[g].logins += (Number(s.login_count) || 0);
            gradeSummaryMap[g].stars += (Number(s.stars) || 0);
        }
    });

    rInSchool.forEach(r => {
        const st = sInSchool.find(s => String(s.id).trim() === String(r.studentId).trim());
        const g = st?.grade || 'P1';
        if (gradeSummaryMap[g]) {
            gradeSummaryMap[g].scoreTotal += (r.score / (r.totalQuestions || 1)) * 100;
            gradeSummaryMap[g].scoreCount++;
        }
    });

    const gradeStats = Object.entries(gradeSummaryMap).map(([grade, data]) => ({
        grade, count: data.count, logins: data.logins, stars: data.stars,
        avgScore: data.scoreCount > 0 ? Math.round(data.scoreTotal / data.scoreCount) : 0
    })).filter(g => g.count > 0);

    return {
      students: sInSchool, teachers: tInSchool, results: rInSchool, gradeStats,
      stats: {
        studentLogins: sInSchool.reduce((sum, s) => sum + (Number(s.login_count) || 0), 0),
        teacherLogins: tInSchool.reduce((sum, t) => sum + (Number(t.login_count) || 0), 0),
        avgScore: rInSchool.length > 0 ? Math.round(rInSchool.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) / rInSchool.length) : 0
      }
    };
  }, [selectedSchool, students, teachers, results]);

  const schoolRequests = pendingRequests.filter(r => r.type === 'SCHOOL');

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 font-prompt">
        {/* DISTRICT HEADER */}
        <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl mb-8 relative overflow-hidden border-b-8 border-indigo-500">
            <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck size={180}/></div>
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                <div className="text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                        <div className="bg-indigo-500 p-2.5 rounded-2xl text-white shadow-lg"><Shield size={28}/></div>
                        <h1 className="text-3xl font-black tracking-tight">ระบบบริหารจัดการเขตพื้นที่การศึกษา</h1>
                    </div>
                    <p className="text-slate-400 font-bold text-base uppercase tracking-widest">Educational Service Area Administration</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <HeaderStat label="โรงเรียนทั้งหมด" val={districtStats.totalSchools} sub="แห่ง" />
                    <HeaderStat label="เปิดใช้งานอยู่" val={districtStats.activeSchools} sub="แห่ง" color="text-emerald-400" />
                    <HeaderStat label="นักเรียนรวม" val={districtStats.totalStudents} sub="คน" />
                    <HeaderStat label="คุณครูรวม" val={districtStats.totalTeachers} sub="คน" />
                </div>

                <div className="flex gap-2">
                    <NavBtn active={activeView === 'OVERVIEW'} onClick={() => setActiveView('OVERVIEW')} icon={<TrendingUp size={18}/>} label="สรุปภาพรวม"/>
                    <NavBtn active={activeView === 'SCHOOLS'} onClick={() => setActiveView('SCHOOLS')} icon={<Building2 size={18}/>} label="โรงเรียนในสังกัด"/>
                    <NavBtn active={activeView === 'REGISTRATIONS'} onClick={() => setActiveView('REGISTRATIONS')} icon={<Bell size={18}/>} label={`คำขอ (${schoolRequests.length})`}/>
                    <NavBtn active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} icon={<Settings size={18}/>} label="ตั้งค่า App"/>
                    <button onClick={onLogout} className="p-4 bg-red-500/20 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition shadow-sm"><LogOut size={24}/></button>
                </div>
            </div>
        </div>

        {activeView === 'OVERVIEW' && (
            <div className="animate-fade-in space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Ranking 1: Most Active Schools */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-full border-b-[10px] border-indigo-500">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-inner"><Zap size={24}/></div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">โรงเรียนที่ใช้งานสูงสุด</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Top Digital Adoption</p>
                            </div>
                        </div>
                        <div className="space-y-4 flex-1">
                            {districtRankings.mostActive.map((s, idx) => (
                                <RankingItem 
                                    key={s.id} 
                                    rank={idx+1} 
                                    name={s.name} 
                                    val={s.totalLogins} 
                                    unit="Logins" 
                                    color="indigo" 
                                    sub={`นร. ${s.studentCount} คน`}
                                />
                            ))}
                            {districtRankings.mostActive.length === 0 && <p className="text-center py-10 text-slate-300 italic">ไม่มีข้อมูลการใช้งาน</p>}
                        </div>
                    </div>

                    {/* Ranking 2: Top Academic Achievement */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-full border-b-[10px] border-emerald-500">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 shadow-inner"><Trophy size={24}/></div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">คะแนนความแม่นยำสูงสุด</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Academic Excellence</p>
                            </div>
                        </div>
                        <div className="space-y-4 flex-1">
                            {districtRankings.topAcademic.map((s, idx) => (
                                <RankingItem 
                                    key={s.id} 
                                    rank={idx+1} 
                                    name={s.name} 
                                    val={`${s.avgScore}%`} 
                                    unit="Mastery" 
                                    color="emerald" 
                                    sub={`รหัส: ${s.schoolCode}`}
                                />
                            ))}
                            {districtRankings.topAcademic.length === 0 && <p className="text-center py-10 text-slate-300 italic">ไม่มีข้อมูลคะแนนสอบ</p>}
                        </div>
                    </div>

                    {/* Ranking 3: Subject Mastery Ranking Across District */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-full border-b-[10px] border-orange-500">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-orange-50 p-3 rounded-2xl text-orange-600 shadow-inner"><Target size={24}/></div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">ความโดดเด่นรายวิชา (เขต)</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">District Subject Proficiency</p>
                            </div>
                        </div>
                        <div className="space-y-4 flex-1">
                            {districtSubjectRankings.map((sub, idx) => (
                                <div key={sub.name} className="p-4 rounded-3xl bg-slate-50 border border-slate-100 relative group overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400"></div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-black text-slate-700 text-sm flex items-center gap-2">
                                            {idx < 3 && <Medal size={14} className={idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : 'text-orange-400'}/>}
                                            {sub.name}
                                        </div>
                                        <div className="text-lg font-black text-orange-600">{sub.average}%</div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${sub.average}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {districtSubjectRankings.length === 0 && <p className="text-center py-10 text-slate-300 italic">ยังไม่มีข้อมูลวิชาเรียน</p>}
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-900 p-8 rounded-[45px] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden border-b-8 border-black/20">
                    <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                        <Activity className="absolute -bottom-10 -right-10" size={300}/>
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="bg-white/20 p-5 rounded-[30px] backdrop-blur-md border border-white/30 shadow-inner"><BarChart3 size={48}/></div>
                        <div>
                            <h3 className="text-3xl font-black mb-1">District Digital Pulse</h3>
                            <p className="text-indigo-200 font-bold text-sm uppercase tracking-[0.2em]">สรุปความเคลื่อนไหวผ่านแพลตฟอร์ม</p>
                        </div>
                    </div>
                    <div className="flex gap-12 relative z-10">
                        <div className="text-center"><div className="text-4xl font-black">{results.length.toLocaleString()}</div><div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1">แบบทดสอบที่ทำแล้ว</div></div>
                        <div className="text-center"><div className="text-4xl font-black text-yellow-300">{students.filter(s => (s.stars||0) > 100).length}</div><div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1">นักเรียนระดับ Platinum</div></div>
                    </div>
                    <button onClick={() => setActiveView('SCHOOLS')} className="px-8 py-4 bg-white text-indigo-900 rounded-[25px] font-black shadow-xl hover:bg-indigo-50 transition active:scale-95 flex items-center gap-2 z-10 group">
                        เจาะลึกรายโรงเรียน <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={18}/>
                    </button>
                </div>
            </div>
        )}

        {activeView === 'SCHOOLS' && (
            <div className="animate-fade-in space-y-6">
                {/* SEARCH BAR */}
                <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-3.5 text-slate-300" size={20}/>
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อโรงเรียน หรือรหัส Smiss 8 หลัก..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-400 focus:bg-white transition-all font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-black uppercase tracking-widest px-4">
                        <Filter size={16}/> แสดงผล {filteredSchools.length} โรงเรียน
                    </div>
                </div>

                {/* COMPACT TABLE LIST */}
                <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 font-black text-[11px] uppercase tracking-widest border-b">
                                <tr>
                                    <th className="p-6">ชื่อโรงเรียน / รหัส Smiss</th>
                                    <th className="p-6 text-center">สถานะ</th>
                                    <th className="p-6 text-center">นักเรียน</th>
                                    <th className="p-6 text-center">คุณครู</th>
                                    <th className="p-6 text-center">ผลสอบ</th>
                                    <th className="p-6 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredSchools.map(school => (
                                    <tr key={school.id} className="hover:bg-slate-50/80 transition group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setSelectedSchool(school); setInsightTab('OVERVIEW'); }}>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${school.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-400'}`}>
                                                    <Building2 size={24}/>
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-800 text-lg leading-tight flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                                                        {school.name}
                                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-400 mt-1 uppercase">Smiss ID: {school.schoolCode}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                school.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                                {school.status === 'active' ? 'ใช้งานอยู่' : 'ระงับการใช้งาน'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center font-black text-slate-700">{students.filter(s => s.school === school.name).length}</td>
                                        <td className="p-6 text-center font-black text-slate-700">{teachers.filter(t => t.school === school.name).length}</td>
                                        <td className="p-6 text-center font-black text-indigo-600 bg-indigo-50/30">{results.filter(r => r.school === school.name).length}</td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setSelectedSchool(school); setInsightTab('OVERVIEW'); }} className="p-2.5 bg-white text-indigo-600 rounded-xl border border-slate-200 hover:bg-indigo-600 hover:text-white transition shadow-sm" title="ดูรายละเอียด"><Eye size={18}/></button>
                                                <button onClick={() => handleToggleSchoolStatus(school)} className={`p-2.5 rounded-xl border transition shadow-sm ${school.status === 'active' ? 'bg-white text-orange-500 border-slate-200 hover:bg-orange-500 hover:text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`} title={school.status === 'active' ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}>
                                                    {school.status === 'active' ? <XCircle size={18}/> : <CheckCircle size={18}/>}
                                                </button>
                                                <button onClick={() => handleDeleteSchool(school)} className="p-2.5 bg-white text-red-500 rounded-xl border border-slate-200 hover:bg-red-500 hover:text-white transition shadow-sm" title="ลบถาวร"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSchools.length === 0 && (
                                    <tr><td colSpan={6} className="p-24 text-center text-slate-300 font-black italic">ไม่พบข้อมูลโรงเรียนที่ค้นหา</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {activeView === 'REGISTRATIONS' && (
            <div className="animate-fade-in space-y-6">
                <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3"><Bell className="text-indigo-600"/> คำขอเปิดใช้งานโรงเรียนใหม่</h3>
                {schoolRequests.length === 0 ? (
                    <div className="py-24 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100 text-slate-300 font-black italic">ไม่มีคำขอเปิดโรงเรียนใหม่ในขณะนี้</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {schoolRequests.map(req => (
                            <div key={req.id} className="bg-white p-8 rounded-[40px] border-2 border-indigo-50 shadow-sm hover:shadow-xl transition-all flex flex-col gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white px-6 py-2 rounded-bl-3xl font-black text-[10px] uppercase tracking-widest">โรงเรียนใหม่</div>
                                <div className="flex items-start gap-5">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0"><Building2 size={32}/></div>
                                    <div>
                                        <div className="font-black text-2xl text-slate-800 leading-tight mb-1">{req.schoolName}</div>
                                        <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black w-fit border border-indigo-100 uppercase tracking-widest">Smiss: {req.schoolCode}</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">ผู้ยื่นคำขอ:</span><span className="font-black text-slate-700">{req.name} {req.surname}</span></div>
                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">ตำแหน่ง:</span><span className="font-bold text-indigo-600">{req.position}</span></div>
                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-slate-400 uppercase">เลขบัตรประชาชน:</span><span className="font-bold text-slate-600">{req.citizenId}</span></div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        disabled={processingId === req.id}
                                        onClick={() => handleApproveSchool(req)}
                                        className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border-b-4 border-green-800"
                                    >
                                        {processingId === req.id ? <RefreshCw className="animate-spin" size={24}/> : <Check size={24}/>} อนุมัติการเข้าถึง
                                    </button>
                                    <button 
                                        disabled={processingId === req.id}
                                        onClick={() => handleReject(req.id)}
                                        className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black hover:bg-red-500 hover:text-white transition active:scale-95 border-2 border-transparent hover:border-red-600"
                                    >
                                        ปฏิเสธ
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- SCHOOL INSIGHT MODAL --- */}
        {selectedSchool && schoolInsightData && createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in font-prompt">
                <div className="bg-white rounded-[50px] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-8 bg-slate-900 text-white relative flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 size={120}/></div>
                        <div className="relative z-10 text-center md:text-left">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-500 rounded-3xl text-white shadow-xl"><Building2 size={40}/></div>
                                <div>
                                    <h3 className="text-3xl font-black leading-tight">{selectedSchool.name}</h3>
                                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">ข้อมูลเชิงลึกรายโรงเรียน • รหัส Smiss: {selectedSchool.schoolCode}</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSelectedSchool(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition relative z-10"><X size={28}/></button>
                    </div>

                    <div className="flex bg-slate-100 p-1.5 mx-8 mt-8 rounded-3xl w-fit shadow-inner">
                        <button onClick={() => setInsightTab('OVERVIEW')} className={`px-8 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${insightTab === 'OVERVIEW' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-50'}`}><Activity size={18}/> ภาพรวม</button>
                        <button onClick={() => setInsightTab('TEACHERS')} className={`px-8 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${insightTab === 'TEACHERS' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}><UserCog size={18}/> คุณครู ({schoolInsightData.teachers.length})</button>
                        <button onClick={() => setInsightTab('STUDENTS')} className={`px-8 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${insightTab === 'STUDENTS' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}><Users size={18}/> สรุปนักเรียน ({schoolInsightData.students.length})</button>
                    </div>

                    <div className="p-8 flex-1 overflow-auto custom-scrollbar bg-white">
                        {insightTab === 'OVERVIEW' && (
                            <div className="animate-slide-up space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <InsightStatCard label="ล็อกอินของนักเรียนรวม" val={schoolInsightData.stats.studentLogins} icon={<Users size={24}/>} color="bg-blue-50 text-blue-600"/>
                                    <InsightStatCard label="ล็อกอินของคุณครูรวม" val={schoolInsightData.stats.teacherLogins} icon={<UserCog size={24}/>} color="bg-indigo-50 text-indigo-600"/>
                                    <InsightStatCard label="คะแนนความแม่นยำเฉลี่ย" val={`${schoolInsightData.stats.avgScore}%`} icon={<TrendingUp size={24}/>} color="bg-emerald-50 text-emerald-600"/>
                                </div>
                                <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 shadow-inner">
                                    <h4 className="font-black text-lg text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-indigo-500"/> Engagement Summary</h4>
                                    <p className="text-slate-500 font-medium leading-relaxed">โรงเรียน {selectedSchool.name} มีการใช้งานระบบอย่างต่อเนื่อง โดยมีบุคลากรครูเข้าใช้งานรวม {schoolInsightData.stats.teacherLogins} ครั้ง และนักเรียนเข้าฝึกฝนทำข้อสอบรวม {schoolInsightData.results.length} รายการ ส่งผลให้มีคะแนนความแม่นยำเฉลี่ยอยู่ที่ {schoolInsightData.stats.avgScore}% ของคลังข้อสอบทั้งหมดในโรงเรียน</p>
                                </div>
                            </div>
                        )}

                        {insightTab === 'TEACHERS' && (
                            <div className="animate-slide-up">
                                <div className="bg-white rounded-[35px] border border-slate-100 overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b">
                                            <tr><th className="p-6">รายชื่อคุณครู</th><th className="p-6 text-center">ตำแหน่ง</th><th className="p-6 text-center">ล็อกอินสะสม</th><th className="p-6 text-right">ใช้งานล่าสุด</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {schoolInsightData.teachers.sort((a,b) => (b.login_count||0) - (a.login_count||0)).map(t => (
                                                <tr key={t.id} className="hover:bg-slate-50 transition">
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black shadow-inner">{t.name.charAt(0)}</div>
                                                            <div className="font-black text-slate-800">{t.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{t.position || 'คุณครู'}</span>
                                                    </td>
                                                    <td className="p-6 text-center font-black text-indigo-600">{t.login_count || 0} ครั้ง</td>
                                                    <td className="p-6 text-right font-bold text-slate-400 text-sm">
                                                        {t.last_login ? new Date(t.last_login).toLocaleDateString('th-TH') : 'ไม่เคยเข้าใช้งาน'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {insightTab === 'STUDENTS' && (
                            <div className="animate-slide-up space-y-6">
                                <div className="bg-indigo-50 p-6 rounded-[35px] border border-indigo-100 flex items-center justify-between shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-3 rounded-2xl text-indigo-600 shadow-sm"><Activity size={24}/></div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-lg">สรุปภาพรวมรายระดับชั้น</h4>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Student Statistics by Grade Level</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-indigo-600">{schoolInsightData.students.length}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total Students</div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[35px] border border-slate-100 overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b">
                                            <tr>
                                                <th className="p-6">ระดับชั้น</th>
                                                <th className="p-6 text-center">จำนวนนักเรียน</th>
                                                <th className="p-6 text-center">การเข้าใช้งานรวม</th>
                                                <th className="p-6 text-center">ดาวสะสมรวม</th>
                                                <th className="p-6 text-right">ความแม่นยำเฉลี่ย</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {schoolInsightData.gradeStats.sort((a,b) => a.grade.localeCompare(b.grade)).map(g => (
                                                <tr key={g.grade} className="hover:bg-slate-50 transition group">
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:rotate-6 ${g.grade.startsWith('M') ? 'bg-violet-500' : 'bg-indigo-500'}`}>
                                                                {GRADE_LABELS[g.grade] || g.grade}
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-slate-800 text-lg">ระดับชั้น {GRADE_LABELS[g.grade] || g.grade}</div>
                                                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{g.grade.startsWith('M') ? 'Secondary' : 'Primary'} Level</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className="text-2xl font-black text-slate-700">{g.count.toLocaleString()}</div>
                                                        <div className="text-[9px] text-slate-400 font-black uppercase">Persons</div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="text-lg font-black text-blue-600">{g.logins.toLocaleString()}</div>
                                                            <div className="text-[9px] text-slate-400 font-black uppercase">Total Logins</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className="flex items-center justify-center gap-1 font-black text-amber-500">
                                                            <Star size={14} fill="currentColor"/> {g.stars.toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <div className="text-2xl font-black text-emerald-600">{g.avgScore}%</div>
                                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${g.avgScore}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>, document.body
        )}

        {activeView === 'SETTINGS' && (
            <div className="animate-fade-in space-y-6">
                <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
                        <Settings size={48}/>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 mb-2">ตั้งค่าแอปพลิเคชัน</h3>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-10">Application Settings & Customization</p>

                    <div className="w-full max-w-2xl bg-slate-50 p-8 rounded-[40px] border-4 border-white shadow-inner space-y-8">
                        <div>
                            <label className="block text-slate-500 font-black text-xs uppercase tracking-widest mb-4">โลโก้แอปพลิเคชัน (PWA & Login Page)</label>
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="w-48 h-48 bg-white rounded-3xl border-4 border-slate-100 shadow-xl overflow-hidden flex items-center justify-center p-4">
                                    {appSettings.logo_url ? (
                                        <img src={appSettings.logo_url} alt="App Logo Preview" className="max-w-full max-h-full object-contain p-2" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="text-slate-200 flex flex-col items-center">
                                            <ImageIcon size={64}/>
                                            <span className="text-[10px] font-black uppercase mt-2">No Logo</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4 w-full">
                                    <p className="text-slate-500 text-sm font-bold leading-relaxed">
                                        รูปภาพที่อัพโหลดที่นี่จะถูกใช้เป็นโลโก้หลักในหน้า Login และไอคอนแอปบนมือถือสำหรับนักเรียน
                                    </p>
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4 px-6 py-4">
                                        <p className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <Shield size={14}/> การจัดเก็บข้อมูลโลโก้และไฟล์แนบ
                                        </p>
                                        <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                            รูปภาพจะถูกจัดเก็บเข้าสู่โฟลเดอร์มีเดียหลักของระบบโดยอัตโนมัติ โดยเชื่อมโยงและบันทึกข้อมูลแบบเรียลไทม์ลงในฐานข้อมูลแบบ MySQL
                                        </p>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        ref={logoInputRef} 
                                        onChange={handleLogoUpload} 
                                        className="hidden"
                                    />
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => logoInputRef.current?.click()}
                                            disabled={isUploading || isSaving}
                                            className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50"
                                        >
                                            {isUploading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20}/>}
                                            อัพโหลดรูปใหม่
                                        </button>
                                        <button 
                                            onClick={handleManualLogoUrl}
                                            disabled={isUploading || isSaving}
                                            className="px-6 py-4 bg-slate-200 text-slate-700 rounded-2xl font-black hover:bg-slate-300 transition disabled:opacity-50"
                                        >
                                            ใส่ URL
                                        </button>
                                    </div>
                                    <button 
                                      onClick={() => setShowSetupGuide(true)}
                                      className="w-full py-3 bg-white border-2 border-dashed border-indigo-200 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 transition shadow"
                                    >
                                      <RefreshCw size={16}/> ระบบดึงข้อมูลจาก Supabase เดิมเข้า MySQL
                                    </button>
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <Info size={12}/> ข้อแนะนำ
                                        </p>
                                        <p className="text-xs text-amber-600 font-bold leading-tight">
                                            รูปภาพควรมีขนาด 512x512 พิกเซล (PNG จัตุรัส) เพื่อผลลัพธ์ที่ดีที่สุดบนไอคอนมือถือ
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-200 space-y-4">
                            <label className="block text-slate-500 font-black text-xs uppercase tracking-widest mb-2">ชื่อแอปพลิเคชัน</label>
                            <div className="flex gap-3">
                                <input 
                                    type="text"
                                    value={appSettings.app_name || 'Pratom Smart Tutor'}
                                    onChange={(e) => setAppSettings(prev => ({ ...prev, app_name: e.target.value }))}
                                    className="flex-1 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-400 font-bold"
                                    placeholder="ใส่ชื่อแอปของคุณที่นี่..."
                                />
                                <button 
                                    onClick={handleSaveAppName}
                                    disabled={isSaving}
                                    className="px-8 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                    บันทึก
                                </button>
                            </div>
                        </div>

                        {/* 🛡️ Auto-Healing Database Status Panel */}
                        <div className="pt-8 border-t border-slate-200">
                            <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-6 rounded-[30px] text-white shadow-xl relative overflow-hidden border-b-8 border-indigo-950/40 text-left">
                                <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4"><ShieldAlert size={100}/></div>
                                <div className="relative z-10 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-500/20 p-2.5 rounded-2xl border border-indigo-400/30 text-indigo-400">
                                            <Sparkles size={24}/>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-base text-slate-100">ระบบตรวจจับและปรับปรุงโครงสร้างอัตโนมัติ</h4>
                                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-0.5">Auto-Healing Database Engine</p>
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                        ระบบ Pratom Smart Tutor ได้รับการติดตั้ง **Auto-Healing MySQL Query Engine** ซึ่งจะช่วยดูแลโครงสร้างข้อมูลในฐานข้อมูล MySQL ให้สามารถทำงานได้อย่างไร้รอยต่อ แม้ว่าตารางจะยังไม่สมบูรณ์ (เช่น คอลัมน์ <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-white text-[11px]">avatar</code> ในตารางครู, คอลัมน์ <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-white text-[11px]">username / password</code> ในตารางนักเรียน หรือ <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-white text-[11px]">unit</code> ในตารางข้อสอบ) ระบบจะคัดกรองข้อมูลและบันทึกส่วนที่เหลือให้โดยไม่เกิดหน้าจอล้มเหลว
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-2.5">
                                            <span className="flex h-2.5 w-2.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                            </span>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-emerald-400 leading-none">Auto-Heal Engine</p>
                                                <p className="text-[9px] text-slate-400 mt-1">ทำงานอัตโนมัติ (Active) 🟢</p>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center gap-2.5">
                                            <span className="flex h-2.5 w-2.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                            </span>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-emerald-400 leading-none">Gemini Key Sanitizer</p>
                                                <p className="text-[9px] text-slate-400 mt-1">รองรับคีย์แบบใหม่ (AQ.) 🟢</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-slate-300 text-xs flex flex-col gap-2">
                                        <p className="font-black text-indigo-300 text-[11px] uppercase tracking-wider">💡 แนะนำเกี่ยวกับการย้ายข้อมูล (Migration):</p>
                                        <p className="leading-relaxed text-[11px] opacity-90">
                                            หากคุณต้องการดึงข้อมูลเดิมจากโครงการ Supabase ตัวเก่าเข้ามาใช้งานในระบบฐานข้อมูลแบบ MySQL นี้ คุณสามารถคลิกปุ่ม **ระบบดึงข้อมูลจาก Supabase เดิมเข้า MySQL** ด้านบนเพื่อย้ายข้อมูลทั้งหมดโดยอัตโนมัติได้อย่างสมบูรณ์แบบครับ!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showSetupGuide && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-fade-in font-prompt">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl"><RefreshCw size={24} className={migrationLoading ? "animate-spin" : ""}/></div>
                  <h3 className="text-2xl font-black text-white">ระบบดึงและย้ายข้อมูลจาก Supabase เดิม</h3>
                </div>
                <button onClick={() => { if (!migrationLoading) { setShowSetupGuide(false); setMigrationReport(null); setMigrationError(''); } }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white">
                  <X size={24}/>
                </button>
              </div>
              <div className="p-8 overflow-auto space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl text-left">
                  <h4 className="font-black text-indigo-900 text-base mb-1">คำอธิบายระบบ</h4>
                  <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                    เครื่องมือนี้จะทำการดึงข้อมูลโครงสร้างหลักทั้งหมดจาก Supabase Database เดิม (ผ่าน REST API) นำมาเขียนลงในฐานข้อมูลแบบ MySQL ปัจจุบันของท่านโดยตรงอย่างปลอดภัย ระบบจะทำการล้างข้อมูลตารางเดิมเฉพาะตารางที่มีการนำเข้าสำเร็จเพื่อไม่ให้เกิดข้อมูลซ้ำซ้อน
                  </p>
                </div>

                <form onSubmit={handleMigration} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">1. Supabase Project URL</label>
                    <input 
                      type="text" 
                      required
                      value={migrationUrl}
                      onChange={(e) => setMigrationUrl(e.target.value)}
                      placeholder="เช่น https://xxxxxx.supabase.co" 
                      disabled={migrationLoading}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-400 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">2. Supabase Anon Key (หรือ Service Role Key)</label>
                    <input 
                      type="password" 
                      required
                      value={migrationKey}
                      onChange={(e) => setMigrationKey(e.target.value)}
                      placeholder="กรอก Anon Key ของ Supabase..." 
                      disabled={migrationLoading}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-400 font-mono text-sm"
                    />
                  </div>

                  {migrationError && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-xs font-bold leading-relaxed flex items-start gap-2">
                      <span className="text-red-500 font-black">⚠️</span>
                      <span>{migrationError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={migrationLoading}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {migrationLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={24}/>
                        <span>กำลังเชื่อมต่อและดึงตารางข้อมูลทั้งหมด...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={20}/>
                        <span>เริ่มดึงข้อมูลทั้งหมดเข้า MySQL</span>
                      </>
                    )}
                  </button>
                </form>

                {migrationReport && (
                  <div className="border-t border-slate-100 pt-6 text-left">
                    <h4 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                      <CheckCircle className="text-emerald-500" size={20}/> ผลการดึงข้อมูลรายตาราง
                    </h4>
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden shadow-inner max-h-80 overflow-y-auto">
                      <table className="w-full text-xs text-slate-600 table-auto">
                        <thead className="bg-slate-100 font-black text-[10px] uppercase tracking-wider text-slate-500 border-b">
                          <tr>
                            <th className="p-3 text-left">ตารางข้อมูล (Table)</th>
                            <th className="p-3 text-center">สถานะ (Status)</th>
                            <th className="p-3 text-right">จำนวนแถว (Rows)</th>
                            <th className="p-3 text-left">รายละเอียด / ข้อผิดพลาด</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60">
                          {Object.entries(migrationReport).map(([table, detail]: [string, any]) => (
                            <tr key={table} className="hover:bg-slate-100/50">
                              <td className="p-3 text-left">
                                <div className="font-bold text-slate-800">{detail.label || table}</div>
                                <div className="font-mono text-[10px] text-slate-400">{table}</div>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {detail.status === 'success' ? (
                                  <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide border border-emerald-100">สำเร็จ 🟢</span>
                                ) : detail.status === 'running' ? (
                                  <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide border border-indigo-100 inline-flex items-center gap-1 animate-pulse">
                                    <Loader2 className="animate-spin" size={10}/> กำลังดึงข้อมูล...
                                  </span>
                                ) : detail.status === 'pending' ? (
                                  <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide border border-slate-200">รอดึงข้อมูล ⚪</span>
                                ) : detail.status === 'skipped' ? (
                                  <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide border border-amber-100" title={detail.reason}>ข้าม 🟡</span>
                                ) : (
                                  <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide border border-red-100" title={detail.error || detail.reason}>ล้มเหลว 🔴</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-black font-mono text-slate-700">
                                {detail.count !== undefined ? detail.count.toLocaleString() : '-'}
                              </td>
                              <td className="p-3 text-left">
                                {detail.status === 'error' ? (
                                  <span className="text-rose-600 font-bold text-[11px] leading-normal block max-w-xs break-words">{detail.error || detail.reason || 'ดึงข้อมูลไม่สำเร็จ'}</span>
                                ) : detail.status === 'skipped' ? (
                                  <span className="text-amber-600 font-medium text-[11px] block max-w-xs break-words">{detail.reason || 'ข้ามการนำเข้า'}</span>
                                ) : detail.status === 'success' ? (
                                  <span className="text-emerald-600 font-medium text-[11px]">บันทึกข้อมูลเรียบร้อย</span>
                                ) : detail.status === 'running' ? (
                                  <span className="text-indigo-500 font-medium text-[11px] animate-pulse">กำลังดึงข้อมูล...</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => { if (!migrationLoading) { setShowSetupGuide(false); setMigrationReport(null); setMigrationError(''); } }}
                  disabled={migrationLoading}
                  className="px-10 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black transition disabled:opacity-50"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {loading && (
            <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-indigo-600 font-prompt">
                <RefreshCw className="animate-spin mb-4" size={56}/>
                <p className="font-black text-xl animate-pulse">กำลังดึงข้อมูลระดับเขตพื้นที่...</p>
            </div>
        )}
    </div>
  );
};

// Fix: Converting RankingItem into a functional component using React.FC to correctly handle 'key' and prop types
interface RankingItemProps {
  rank: number;
  name: string;
  val: any;
  unit: string;
  color: string;
  sub: string;
}

const RankingItem: React.FC<RankingItemProps> = ({ rank, name, val, unit, color, sub }) => {
    const isTop3 = rank <= 3;
    const colorMap: Record<string, string> = {
        indigo: "text-indigo-600 bg-indigo-50",
        emerald: "text-emerald-600 bg-emerald-50"
    };

    return (
        <div className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${isTop3 ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                    {rank}
                </div>
                <div className="min-w-0">
                    <div className="font-black text-slate-700 text-sm truncate">{name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{sub}</div>
                </div>
            </div>
            <div className="text-right shrink-0">
                <div className={`font-black text-base ${colorMap[color].split(' ')[0]}`}>{val}</div>
                <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{unit}</div>
            </div>
        </div>
    );
};

// Fix: Converting HeaderStat into a functional component using React.FC for consistent typing
interface HeaderStatProps {
  label: string;
  val: number;
  sub: string;
  color?: string;
}

const HeaderStat: React.FC<HeaderStatProps> = ({ label, val, sub, color = "text-white" }) => (
    <div className="flex flex-col">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className={`text-2xl font-black ${color}`}>{val.toLocaleString()} <span className="text-xs font-bold text-slate-400 ml-0.5">{sub}</span></div>
    </div>
);

// Fix: Converting InsightStatCard into a functional component using React.FC for consistent typing
interface InsightStatCardProps {
  label: string;
  val: any;
  icon: React.ReactNode;
  color: string;
}

const InsightStatCard: React.FC<InsightStatCardProps> = ({ label, val, icon, color }) => (
    <div className={`p-6 rounded-[35px] border-2 border-slate-50 shadow-sm flex items-center gap-5 bg-white group hover:border-indigo-200 transition-all`}>
        <div className={`p-4 rounded-2xl shadow-inner group-hover:scale-110 transition-transform ${color}`}>{icon}</div>
        <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{val}</div>
        </div>
    </div>
);

const NavBtn: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${active ? 'bg-white text-slate-900 shadow-xl' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{icon} {label}</button>
);

export default SuperAdminDashboard;
