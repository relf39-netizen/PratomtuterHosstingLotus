
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Login from './views/Login';
import TeacherLogin from './views/TeacherLogin';
import TeacherDashboard from './views/TeacherDashboard';
import SuperAdminDashboard from './views/SuperAdminDashboard'; 
import Dashboard from './views/Dashboard';
import PracticeMode from './views/PracticeMode';
import Results from './views/Results';
import Stats from './views/Stats';
import { Student, Question, Teacher, ExamResult, Assignment, SubjectConfig, AssignmentCategory } from './types';
import { fetchAppData, saveScore, getDataForStudent, getTeacherById, getAppSettings } from './services/api';
import { Database, Download } from 'lucide-react';
import { isConfigured, supabase } from './services/firebaseConfig';

const App: React.FC = () => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentPage, setCurrentPage] = useState('login'); 
  const DEFAULT_LOGO = '/logo.svg';
  const [appLogo, setAppLogo] = useState(DEFAULT_LOGO);
  const [appName, setAppName] = useState('Pratom Smart Tutor');
  
  const [selectedSubject, setSelectedSubject] = useState<SubjectConfig | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const currentAssignmentRef = useRef<Assignment | null>(null);

  const [isMusicOn, setIsMusicOn] = useState(true);
  const [lastScore, setLastScore] = useState<{score: number, total: number, earnedStars: number, isExam?: boolean, isHomework?: boolean} | null>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            // Check for updates
            reg.onupdatefound = () => {
              const installingWorker = reg.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      // New content is available; please refresh.
                      console.log('New content is available; please refresh.');
                    }
                  }
                };
              }
            };
          })
          .catch(err => console.error('SW Registration Error', err));
      });
    }

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    
    // Detect standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(standalone);
  }, []);

  // Handle Dynamic Branding & Manifest
  useEffect(() => {
    if (!appName || !appLogo) return;

    let manifestURL = '';
    
    const applyBranding = () => {
      document.title = appName;
      
      const appleTitle = document.querySelector("meta[name='apple-mobile-web-app-title']");
      if (appleTitle) (appleTitle as any).content = appName;

      const icons = document.querySelectorAll("link[rel*='icon']");
      icons.forEach(icon => { (icon as any).href = appLogo; });

      const appleIcon = document.querySelector("link[rel='apple-touch-icon']") || document.createElement('link');
      (appleIcon as any).rel = 'apple-touch-icon';
      (appleIcon as any).href = appLogo;
      if (!appleIcon.parentElement) document.head.appendChild(appleIcon);

      try {
        const manifest = {
          "short_name": appName.split(' ')[0] || "PST",
          "name": appName,
          "start_url": "/",
          "display": "standalone",
          "background_color": "#ffffff",
          "theme_color": "#4f46e5",
          "icons": [
            { "src": appLogo, "sizes": "512x512", "type": "image/png", "purpose": "any maskable" },
            { "src": appLogo, "sizes": "192x192", "type": "image/png", "purpose": "any maskable" }
          ]
        };
        const blob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
        manifestURL = URL.createObjectURL(blob);
        const manifestLink = document.querySelector("link[rel='manifest']") || document.createElement('link');
        (manifestLink as any).rel = 'manifest';
        (manifestLink as any).href = manifestURL;
        if (!manifestLink.parentElement) document.head.appendChild(manifestLink);
      } catch (e) {
        console.error("Dynamic manifest failed", e);
      }
    };

    applyBranding();

    return () => {
      if (manifestURL) URL.revokeObjectURL(manifestURL);
    };
  }, [appName, appLogo]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('MST_INSTALL_PROMPT_DISMISSED')) {
        setShowInstallPrompt(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const initData = async () => {
      try {
        if (isConfigured) {
          const settings = await getAppSettings();
          if (settings) {
            setAppLogo(settings.logo_url || DEFAULT_LOGO);
            setAppName(settings.app_name || 'Pratom Smart Tutor');
          }

          const data = await fetchAppData();
          setQuestions(data.questions || []);
          setExamResults(data.results || []);
          setAssignments(data.assignments || []);
          setSubjects(data.subjects || []); 
          
          const savedTeacherId = localStorage.getItem('MST_TEACHER_ID');
          if (savedTeacherId) {
            const freshTeacher = await getTeacherById(savedTeacherId);
            if (freshTeacher) {
              setCurrentTeacher(freshTeacher);
              const roles = (freshTeacher.role || '').split(',');
              if (roles.includes('SUPER_ADMIN')) setCurrentPage('super-admin-dashboard');
              else setCurrentPage('teacher-dashboard');
            }
          }
          
          const savedStudentId = localStorage.getItem('MST_STUDENT_ID');
          if (savedStudentId && !savedTeacherId) {
            const { data: st, error } = await supabase.from('students').select('*').eq('id', savedStudentId).maybeSingle();
            if (st && !error) {
              const studentObj = { ...st, inventory: typeof st.inventory === 'string' ? JSON.parse(st.inventory) : st.inventory };
              const specificData = await getDataForStudent(studentObj);
              setExamResults(specificData.results || []);
              setAssignments(specificData.assignments || []);
              setSubjects(specificData.subjects || []);
              setQuestions(specificData.questions || []);
              setCurrentUser(studentObj);
              setCurrentPage('dashboard');
            }
          }
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setIsLoading(false);
      }
    };
    initData();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);


  const refreshStudentData = async () => {
      if (currentUser) {
          const specificData = await getDataForStudent(currentUser);
          setExamResults(specificData.results);
          setAssignments(specificData.assignments);
          setSubjects(specificData.subjects);
          setQuestions(prev => {
              // รวมข้อสอบเก่ากับใหม่เข้าด้วยกัน โดยไม่ให้ซ้ำ ID
              const existingIds = new Set(prev.map(q => q.id));
              const newQuestions = (specificData as any).questions?.filter((q: any) => !existingIds.has(q.id)) || [];
              return [...prev, ...newQuestions];
          });
          
          const { data } = await supabase.from('students').select('*').eq('id', currentUser.id).single();
          if (data) {
              setCurrentUser(prev => prev ? { 
                ...prev, 
                stars: Number(data.stars), 
                inventory: typeof data.inventory === 'string' ? JSON.parse(data.inventory) : data.inventory 
              } : null);
          }
      }
  };

  const handleLogin = async (student: Student) => { 
      setIsLoading(true);
      setCurrentUser(student);
      localStorage.setItem('MST_STUDENT_ID', student.id);
      try {
          const specificData = await getDataForStudent(student);
          setExamResults(specificData.results);
          setAssignments(specificData.assignments);
          setSubjects(specificData.subjects);
          if ((specificData as any).questions) {
              setQuestions((specificData as any).questions);
          }
      } catch (e) { console.error(e); }
      setIsLoading(false);
      setCurrentPage('dashboard'); 
  };

  const handleTeacherLoginSuccess = (teacher: Teacher) => { 
      setCurrentTeacher(teacher); 
      if (teacher.id) localStorage.setItem('MST_TEACHER_ID', String(teacher.id));
      const roles = (teacher.role || '').split(',');
      if (roles.includes('SUPER_ADMIN')) setCurrentPage('super-admin-dashboard');
      else setCurrentPage('teacher-dashboard');
  };

  const handleLogout = () => { 
      localStorage.removeItem('MST_TEACHER_ID');
      localStorage.removeItem('MST_STUDENT_ID');
      setCurrentUser(null); 
      setCurrentTeacher(null); 
      setCurrentPage('login'); 
      setSelectedSubject(null); 
      setCurrentAssignment(null); 
  };

  const handleFinishExam = async (score: number, total: number, returnedAssignmentId?: string, category?: AssignmentCategory, details?: any[]) => {
    const activeCategory = category || currentAssignmentRef.current?.category || (selectedSubject?.name.includes('NT') ? 'NT' : selectedSubject?.name.includes('O-NET') ? 'ONET' : 'GENERAL');
    const isExam = activeCategory === 'EXAM' || activeCategory === 'NT' || activeCategory === 'ONET' || activeCategory === 'MIDTERM' || activeCategory === 'FINAL';
    
    let starsEarned = 0;
    if (total > 0) {
        const percentage = (score / total) * 100;
        if (percentage === 100) starsEarned = 3;
        else if (percentage >= 70) starsEarned = 2;
        else if (percentage >= 50) starsEarned = 1;
    }
    
    const activeAssignmentId = returnedAssignmentId ? String(returnedAssignmentId) : (currentAssignmentRef.current?.id ? String(currentAssignmentRef.current.id) : undefined);
    
    const matchedAssignment = assignments.find(a => String(a.id) === String(activeAssignmentId));
    const subjectToSave = matchedAssignment ? matchedAssignment.subject : (selectedSubject?.name || 'ทั่วไป');

    if (currentUser) {
        const success = await saveScore(
          currentUser.id, 
          currentUser.name, 
          currentUser.school || '-', 
          score, 
          total, 
          subjectToSave, 
          activeAssignmentId, 
          activeCategory as AssignmentCategory, 
          starsEarned,
          details
        );

        if (success) {
            await refreshStudentData();
        }
    }

    setLastScore({ score, total, earnedStars: starsEarned, isExam, isHomework: !!activeAssignmentId, category: activeCategory as AssignmentCategory } as any);
    setCurrentPage('results');
    setCurrentAssignment(null); 
  };

  if (!isConfigured) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border-b-4 border-red-500">
                  <Database size={48} className="text-red-500 mx-auto mb-4"/>
                  <h1 className="text-2xl font-bold text-slate-800">ยังไม่ได้เชื่อมต่อฐานข้อมูล</h1>
                  <p className="text-slate-500 mt-2 mb-6">กรุณาตั้งค่าการเชื่อมต่อในหน้าล็อคอินคุณครู</p>
              </div>
          </div>
      );
  }

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h2 className="text-2xl font-black text-slate-800 animate-pulse">กำลังโหลดระบบ...</h2>
      <p className="text-slate-400 font-bold mt-2">{appName}</p>
    </div>
  );

  if (currentPage === 'teacher-login') return <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setCurrentPage('login')} initialLogo={appLogo} />;
  
  if (currentPage === 'super-admin-dashboard' && currentTeacher?.role?.split(',').includes('SUPER_ADMIN')) {
      return <SuperAdminDashboard 
        onLogout={handleLogout} 
        onSettingsUpdate={(s) => {
          setAppLogo(s.logo_url || DEFAULT_LOGO);
          setAppName(s.app_name || 'Pratom Smart Tutor');
        }}
      />;
  }

  if (currentPage === 'teacher-dashboard' && currentTeacher) {
      return <TeacherDashboard teacher={currentTeacher} onLogout={handleLogout} initialLogo={appLogo} appName={appName} onTeacherUpdate={(t) => setCurrentTeacher(t)} />;
  }

  if (currentPage === 'login' && !currentUser) return (
    <Login 
      onLogin={handleLogin} 
      onTeacherLoginClick={() => setCurrentPage('teacher-login')} 
      initialLogo={appLogo}
      appName={appName}
      onInstall={() => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the install prompt');
            }
            setDeferredPrompt(null);
          });
        }
      }}
      isInstallable={!!deferredPrompt}
    />
  );

  return (
    <>
      <Layout studentName={currentUser?.name} onLogout={handleLogout} isMusicOn={isMusicOn} toggleMusic={() => setIsMusicOn(!isMusicOn)} currentPage={currentPage} onNavigate={setCurrentPage} initialLogo={appLogo} appName={appName}>
        {(() => {
          switch (currentPage) {
            case 'dashboard':
              return <Dashboard 
                  student={currentUser!} 
                  assignments={assignments} 
                  examResults={examResults} 
                  subjects={subjects}
                  questions={questions}
                  onNavigate={setCurrentPage} 
                  onStartAssignment={(a) => { setCurrentAssignment(a); setSelectedSubject(null); setCurrentPage('practice'); }}
                  onSelectSubject={(subConfig) => { setSelectedSubject(subConfig); setCurrentAssignment(null); setCurrentPage('practice'); }}
                  onRefreshSubjects={refreshStudentData}
                  onUpdateStudent={refreshStudentData}
              />;
            case 'practice':
              let qList: Question[] = [];
              let derivedCategory: AssignmentCategory = 'GENERAL';
              
              if (currentAssignment) {
                  // กรองข้อสอบที่ตรงกับ assignment_id
                  qList = questions.filter(q => String(q.assignment_id).trim() === String(currentAssignment.id).trim());
                  derivedCategory = currentAssignment.category || 'GENERAL';
                  // ถ้ามีจำนวนข้อที่ระบุใน assignment ให้ตัดตามนั้น
                  if (currentAssignment.questionCount > 0 && currentAssignment.questionCount < qList.length) {
                      qList = qList.slice(0, currentAssignment.questionCount);
                  }
              } else if (selectedSubject) {
                  const isNational = selectedSubject.name.includes('O-NET') || selectedSubject.name.includes('NT');
                  
                  if (isNational) {
                      const doneAssignmentIds = new Set(examResults.filter(r => r.assignmentId).map(r => String(r.assignmentId).trim()));
                      const completedNationalAssignments = assignments.filter(a => 
                          (a.category === 'ONET' || a.category === 'NT') && 
                          a.subject === selectedSubject.name &&
                          doneAssignmentIds.has(String(a.id).trim())
                      );
                      const completedIds = completedNationalAssignments.map(a => String(a.id).trim());
                      
                      // ดึงข้อสอบของหัวข้อ O-NET/NT จาก Assignment ที่ทำเสร็จแล้ว
                      const completedAssignQuestions = questions.filter(q => q.assignment_id && completedIds.includes(String(q.assignment_id).trim()));
                      
                      // และรวมกับข้อสอบ O-NET/NT อิสระในคลังที่ไม่ได้ผูกกับ assignment_id ใดๆ หรือ assignment_id เป็นเงื่อนไขอิสระเพื่อให้พร้อมทำทันที
                      const freeNationalQuestions = questions.filter(q => {
                          const subNameClean = String(selectedSubject.name || '').trim().toLowerCase();
                          const cleanSubName = subNameClean.replace('nt ', '').replace('o-net ', '').replace('onet ', '').trim();
                          const qSubjectClean = String(q.subject || '').trim().toLowerCase();
                          
                          const nameMatch = qSubjectClean === subNameClean || 
                                           qSubjectClean === cleanSubName || 
                                           subNameClean.includes(qSubjectClean) || 
                                           qSubjectClean.includes(cleanSubName);
                                           
                          const qGradeClean = String(q.grade || '').trim().toUpperCase();
                          const subGradeClean = String(selectedSubject.grade || '').trim().toUpperCase();
                          const userGradeClean = String(currentUser?.grade || '').trim().toUpperCase();
                          
                          const gradeMatch = qGradeClean === subGradeClean || qGradeClean === userGradeClean || qGradeClean === 'ALL' || subGradeClean === 'ALL';
                          const isFree = !q.assignment_id || q.assignment_id === '-' || q.assignment_id === '';
                          return nameMatch && gradeMatch && isFree;
                      });
                      
                      qList = [...completedAssignQuestions, ...freeNationalQuestions];
                      derivedCategory = selectedSubject.name.includes('NT') ? 'NT' : 'ONET';
                      qList = qList.sort(() => 0.5 - Math.random());
                  } else {
                      derivedCategory = 'GENERAL';
                      let pool = questions.filter(q => {
                          const subNameClean = String(selectedSubject.name || '').trim().toLowerCase();
                          const cleanSubName = subNameClean.replace('nt ', '').replace('o-net ', '').replace('onet ', '').trim();
                          const qSubjectClean = String(q.subject || '').trim().toLowerCase();
                          
                          const nameMatch = qSubjectClean === subNameClean || 
                                           qSubjectClean === cleanSubName || 
                                           subNameClean.includes(qSubjectClean) || 
                                           qSubjectClean.includes(cleanSubName);
                                           
                          const qGradeClean = String(q.grade || '').trim().toUpperCase();
                          const subGradeClean = String(selectedSubject.grade || '').trim().toUpperCase();
                          const userGradeClean = String(currentUser?.grade || '').trim().toUpperCase();
                          
                          const gradeMatch = qGradeClean === subGradeClean || qGradeClean === userGradeClean || qGradeClean === 'ALL' || subGradeClean === 'ALL';
                          
                          // ลบข้อจำกัดเรื่อง assignment_id เพื่อให้แสดงโจทย์ทบทวนทั้งหมดที่ครูใส่ไว้ในวิชานี้ แม้จะผูกกับแบบฝึกหัดอยู่ก็ตาม
                          return nameMatch && gradeMatch;
                      });
                      
                      if (pool.length > 0) {
                          const seenKey = `seen_q_${currentUser?.id}_${selectedSubject.name}`;
                          const seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]');
                          const unseen = pool.filter(q => !seenIds.includes(q.id));
                          const seen = pool.filter(q => seenIds.includes(q.id));
                          let combinedPool = [...unseen.sort(() => 0.5 - Math.random()), ...seen.sort(() => 0.5 - Math.random())];
                          qList = combinedPool.slice(0, 10);
                          const newSeenIds = Array.from(new Set([...qList.map(q => q.id), ...seenIds])).slice(0, 50);
                          localStorage.setItem(seenKey, JSON.stringify(newSeenIds));
                      }
                  }
              }
              return <PracticeMode questions={qList} onFinish={handleFinishExam} onBack={() => setCurrentPage('dashboard')} assignmentId={currentAssignment ? String(currentAssignment.id) : undefined} category={derivedCategory} />;
            case 'results': return lastScore ? <Results {...lastScore} onRetry={() => setCurrentPage('dashboard')} onHome={() => setCurrentPage('dashboard')} /> : null;
            case 'stats': return <Stats examResults={examResults} assignments={assignments} studentId={currentUser!.id} onBack={() => setCurrentPage('dashboard')} />;
            default: return <Dashboard student={currentUser!} assignments={assignments} examResults={examResults} subjects={subjects} questions={questions} onNavigate={setCurrentPage} onStartAssignment={(a) => { setCurrentAssignment(a); setSelectedSubject(null); setCurrentPage('practice'); }} onSelectSubject={(subConfig) => { setSelectedSubject(subConfig); setCurrentAssignment(null); setCurrentPage('practice'); }} onRefreshSubjects={refreshStudentData} onUpdateStudent={refreshStudentData} />;
          }
        })()}
      </Layout>

      {showInstallPrompt && deferredPrompt && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-6 backdrop-blur-md animate-fade-in font-prompt">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden border-b-[12px] border-orange-500 animate-scale-in">
            <div className="p-8 bg-gradient-to-tr from-orange-600 to-orange-400 text-white relative text-center">
              <div className="w-20 h-20 bg-white rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl border border-orange-100 animate-bounce">
                <img src={appLogo} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" referrerPolicy="no-referrer" />
              </div>
              <h3 className="text-2xl font-black mb-1 text-white">ติดตั้งแอปบนมือถือ</h3>
              <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mt-1">{appName}</p>
            </div>
            <div className="p-8 space-y-6 text-center">
              <p className="text-slate-600 text-sm font-semibold leading-relaxed">
                เพื่อความสะดวก รวดเร็ว และประหยัดอินเทอร์เน็ตในการใช้งาน <span className="text-orange-600 font-black">กรุณาติดตั้งแอปลงบนหน้าจอโทรศัพท์มือถือ</span> ของคุณทันที!
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult: any) => {
                      if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                      }
                      setDeferredPrompt(null);
                      setShowInstallPrompt(false);
                    });
                  }}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-[2rem] font-black text-base shadow-xl hover:shadow-orange-200 transition duration-300 flex items-center justify-center gap-2 border-b-4 border-orange-800 cursor-pointer animate-pulse"
                >
                  <Download size={20}/> 🎯 ติดตั้งลงบนหน้าจอเลย
                </button>
                <button 
                  onClick={() => {
                    setShowInstallPrompt(false);
                    sessionStorage.setItem('MST_INSTALL_PROMPT_DISMISSED', 'true');
                  }}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-xs transition duration-200 cursor-pointer"
                >
                  ไว้ทีหลัง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isIOS && !isStandalone && !sessionStorage.getItem('MST_IOS_PROMPT_DISMISSED') && (
        <div className="fixed bottom-6 left-6 right-6 z-[9999] animate-fade-in font-prompt" id="ios-install-hint">
          <div className="bg-white rounded-3xl shadow-2xl p-6 border-2 border-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <img src={appLogo} className="w-8 h-8 object-contain" alt="logo" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-slate-800 mb-1">ติดตั้งแอปบน iPhone/iPad</h4>
                <p className="text-[11px] text-slate-500 font-bold leading-tight mb-3">
                  กดปุ่ม <span className="inline-block p-1 bg-slate-100 rounded text-[10px]">แชร์ (Share)</span> แล้วเลือก <span className="text-indigo-600 font-black">"เพิ่มไปยังหน้าจอโฮม"</span> เพื่อใช้งานแบบแอปพลิเคชัน
                </p>
                <button 
                  onClick={() => {
                    sessionStorage.setItem('MST_IOS_PROMPT_DISMISSED', 'true');
                    const el = document.getElementById('ios-install-hint');
                    if (el) el.style.display = 'none';
                  }}
                  className="text-[10px] font-black text-indigo-500 uppercase tracking-wider cursor-pointer"
                >
                  รับทราบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
