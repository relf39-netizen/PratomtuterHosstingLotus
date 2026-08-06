
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Question, AssignmentCategory, ExamResultDetail } from '../types';
import { 
  CheckCircle, XCircle, ArrowRight, ArrowLeft, HelpCircle, Send, 
  BookOpen, GraduationCap, Volume2, VolumeX, ShieldCheck, Grid, 
  Check, X, AlertTriangle, FileCheck, Loader2
} from 'lucide-react';
import { speak, stopSpeak } from '../utils/soundUtils';

interface PracticeModeProps {
  onFinish: (score: number, total: number, assignmentId?: string, category?: AssignmentCategory, details?: ExamResultDetail[]) => void;
  onBack: () => void;
  questions: Question[];
  assignmentId?: string; 
  category?: AssignmentCategory;
}

const PracticeMode: React.FC<PracticeModeProps> = ({ onFinish, onBack, questions: allQuestions, assignmentId, category }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [resultDetails, setResultDetails] = useState<ExamResultDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // 🎯 Exam Mode state: stores selected choice per question ID
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const assignmentIdRef = useRef(assignmentId);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  
  const isPractice = !assignmentId; 
  const isExamMode = category === 'MIDTERM' || category === 'FINAL' || category === 'EXAM' || category === 'NT' || category === 'ONET';
  
  // 🎯 ลอจิกการแสดงเฉลยทันที: แสดงเฉพาะเมื่อเป็นโหมดฝึกฝนอิสระ (isPractice) และไม่ใช่ห้องสอบจริง
  const shouldShowFeedback = isPractice && !isExamMode;

  const choiceLabels = ['A', 'B', 'C', 'D']; 

  useEffect(() => {
    if (assignmentId) assignmentIdRef.current = assignmentId;
  }, [assignmentId]);

  useEffect(() => {
    if (allQuestions && allQuestions.length > 0) {
        const finalQuestions = allQuestions.map(q => ({
            ...q,
            choices: [...q.choices].sort(() => 0.5 - Math.random())
        }));
        setQuestions(finalQuestions);
        setLoading(false);
    } else {
        setLoading(false);
    }
  }, [allQuestions]);

  const currentQuestion = questions[currentIndex];

  // In Exam Mode, current choice is derived from userAnswers
  const activeChoiceId = shouldShowFeedback 
    ? selectedChoice 
    : (currentQuestion ? (userAnswers[currentQuestion.id] || null) : null);

  const playAudio = () => {
    if (!currentQuestion) return;
    stopSpeak(); 
    
    if (shouldShowFeedback && isSubmitted) {
        speak("เฉลยคือ.. " + currentQuestion.explanation);
    } else {
        let textToRead = "คำถาม.. " + currentQuestion.text;
        currentQuestion.choices.forEach((c, i) => {
            textToRead += `. ข้อ ${choiceLabels[i]}.. ${c.text}`;
        });
        speak(textToRead);
    }
  };

  useEffect(() => {
    if (isTTSEnabled) playAudio();
    else stopSpeak();
    return () => stopSpeak();
  }, [currentIndex, isSubmitted, isTTSEnabled]);

  const handleChoiceSelect = (choiceId: string) => {
    if (shouldShowFeedback && isSubmitted) return; 
    
    if (shouldShowFeedback) {
      setSelectedChoice(choiceId);
    } else {
      // Exam mode: update answer for current question (can be modified anytime before submit)
      if (currentQuestion) {
        setUserAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: choiceId
        }));
      }
    }
  };

  const handlePracticeSubmit = () => {
    if (!selectedChoice || !currentQuestion) return;
    const isCorrect = String(selectedChoice) === String(currentQuestion.correctChoiceId);
    
    if (isCorrect) {
        setScore(prev => prev + 1);
    }

    setResultDetails(prev => [...prev, {
        questionId: currentQuestion.id,
        selectedChoiceId: String(selectedChoice),
        isCorrect: isCorrect,
        topic: currentQuestion.unit || currentQuestion.subject,
        questionText: currentQuestion.text
    }]);

    setIsSubmitted(true);

    if (isCorrect) {
      speak("ถูกต้องครับ เก่งมาก");
    } else {
      speak("ลองดูเฉลยนะครับ");
    }
  };

  const handlePracticeNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedChoice(null);
      setIsSubmitted(false);
    } else {
      onFinish(score, questions.length, assignmentIdRef.current, category, resultDetails);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);

  const unansweredIndices = questions
    .map((q, idx) => (!userAnswers[q.id] ? idx + 1 : null))
    .filter((val): val is number => val !== null);

  const handleAttemptSubmit = () => {
    if (unansweredIndices.length > 0) {
      setShowUnansweredWarning(true);
    } else {
      handleConfirmFinalSubmit(true);
    }
  };

  // 🎯 Complete Exam Submission
  const handleConfirmFinalSubmit = async (force: boolean = false) => {
    if (unansweredIndices.length > 0 && !force) {
      setShowUnansweredWarning(true);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let finalScore = 0;
      const finalDetails: ExamResultDetail[] = questions.map(q => {
        const selected = userAnswers[q.id];
        const isCorrect = selected ? String(selected) === String(q.correctChoiceId) : false;
        if (isCorrect) finalScore += 1;
        return {
          questionId: q.id,
          selectedChoiceId: selected ? String(selected) : '',
          isCorrect: isCorrect,
          topic: q.unit || q.subject,
          questionText: q.text
        };
      });

      setShowUnansweredWarning(false);
      setShowReviewModal(false);
      await onFinish(finalScore, questions.length, assignmentIdRef.current, category, finalDetails);
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(userAnswers).filter(id => !!userAnswers[id]).length;
  const unansweredCount = questions.length - answeredCount;

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-indigo-500 font-black text-xl animate-pulse">กำลังเตรียมข้อสอบ...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto font-prompt animate-fade-in pb-24 md:pb-10">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4 p-3 md:p-4 rounded-2xl bg-white text-slate-600 shadow-md border-b-4 border-black/5">
        <button onClick={onBack} className="font-bold flex items-center gap-1 hover:opacity-70 transition-opacity text-sm md:text-base text-slate-600">
          <ArrowLeft size={18} /> ออก
        </button>
        
        <div className="flex items-center gap-2 md:gap-3">
            {/* Question Number & Quick Palette Trigger */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                  <div className="font-black text-sm md:text-base leading-none text-slate-800">
                    ข้อ {currentIndex + 1} / {questions.length}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase mt-1 tracking-tighter ${
                    category === 'MIDTERM' ? 'bg-amber-100 text-amber-700' :
                    category === 'FINAL' ? 'bg-rose-100 text-rose-700' :
                    isPractice ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                      {category === 'MIDTERM' ? 'สอบกลางภาค' :
                       category === 'FINAL' ? 'สอบปลายภาค' :
                       isPractice ? 'ฝึกฝนวิชา' : 'แบบทดสอบ'}
                  </div>
              </div>

              {!shouldShowFeedback && (
                <button 
                  onClick={() => setShowReviewModal(true)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-indigo-200/80 transition active:scale-95"
                  title="ดูตารางข้อสอบและตรวจทาน"
                >
                  <Grid size={15}/>
                  <span className="hidden sm:inline">ตรวจทาน</span>
                  <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                    {answeredCount}/{questions.length}
                  </span>
                </button>
              )}
            </div>
            
            <div className="w-12 md:w-20 h-2 bg-black/5 rounded-full overflow-hidden hidden sm:block">
                <div className="h-full transition-all duration-500 bg-indigo-600" style={{ width: `${((currentIndex+1) / questions.length) * 100}%` }}></div>
            </div>

            <button 
                onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                className={`p-2 rounded-xl transition-all shadow-sm active:scale-90 ${isTTSEnabled ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-400'}`}
                title={isTTSEnabled ? "ปิดเสียงอ่าน" : "เปิดเสียงอ่าน"}
            >
                {isTTSEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
        </div>
      </div>

      <div className="bg-white rounded-[35px] shadow-xl p-6 md:p-10 mb-6 border-b-[10px] border-slate-100 relative overflow-hidden">
        {isPractice ? (
            <div className="absolute top-4 right-8 text-emerald-500 opacity-20"><BookOpen size={32}/></div>
        ) : isExamMode ? (
            <div className="absolute top-4 right-8 text-rose-500 opacity-20"><ShieldCheck size={32}/></div>
        ) : (
            <div className="absolute top-4 right-8 text-orange-500 opacity-20"><GraduationCap size={32}/></div>
        )}
        
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {isExamMode ? (
              <div className="flex items-center gap-2">
                <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black border border-rose-200/80 shadow-sm uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12}/> โหมดสอบ (ทบทวน & แก้ไขคำตอบได้ทุกข้อ)
                </span>
              </div>
            ) : null}

            {!shouldShowFeedback && activeChoiceId && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ✓ ตอบข้อนี้แล้ว (สามารถแก้ไขได้)
              </span>
            )}
        </div>

        <h2 className="text-[14pt] font-black text-slate-800 mb-8 leading-tight pr-10">{currentQuestion?.text}</h2>

        <div className="grid gap-3">
          {currentQuestion?.choices.map((choice, index) => {
            const isSelected = activeChoiceId === choice.id;
            const isCorrect = choice.id === currentQuestion.correctChoiceId;
            
            let btnClass = "w-full rounded-[25px] text-left font-bold text-base md:text-lg border-2 transition-all flex items-center gap-4 ";
            
            if (shouldShowFeedback && isSubmitted) {
                if (isCorrect) btnClass += "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md scale-[1.01]";
                else if (isSelected) btnClass += "bg-rose-50 border-rose-500 text-rose-800 animate-shake";
                else btnClass += "bg-slate-50 border-slate-100 text-slate-300 opacity-50 grayscale";
            } else {
                btnClass += isSelected ? "bg-indigo-600 border-indigo-700 text-white shadow-lg scale-[1.01]" : "bg-white border-slate-100 text-slate-600 hover:border-indigo-300 hover:bg-slate-50/50";
            }

            return (
              <div
                key={choice.id}
                role="button"
                onClick={() => handleChoiceSelect(choice.id)}
                className={`w-full p-3 md:p-3.5 rounded-2xl text-left ${btnClass} cursor-pointer active:scale-[0.99]`}
              >
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-base transition-all ${isSelected ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                   {choiceLabels[index]}
                </div>

                <div className="flex-1 min-w-0">
                    <span className="font-bold break-words">{choice.text}</span>
                </div>

                {isSelected && !shouldShowFeedback && (
                  <CheckCircle className="text-white drop-shadow-sm shrink-0" size={22}/>
                )}

                {shouldShowFeedback && isSubmitted && isCorrect && <CheckCircle className="text-emerald-500 drop-shadow-sm" size={24}/>}
                {shouldShowFeedback && isSubmitted && isSelected && !isCorrect && <XCircle className="text-rose-500 drop-shadow-sm" size={24}/>}
              </div>
            );
          })}
        </div>
      </div>

      {shouldShowFeedback && isSubmitted && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[30px] p-6 mb-20 animate-fade-in shadow-inner relative">
              <div className="absolute top-4 right-6 opacity-10"><HelpCircle size={32}/></div>
              <h4 className="font-black text-emerald-800 text-lg mb-2 flex items-center gap-2"><CheckCircle size={18}/> อธิบายคำตอบ</h4>
              <p className="text-emerald-700 text-base leading-relaxed font-bold">{currentQuestion?.explanation}</p>
          </div>
      )}

      {/* 🧭 Bottom Navigation Controller */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-5 bg-white/90 backdrop-blur-xl border-t border-slate-200 md:static md:bg-transparent md:border-0 md:p-0 z-20">
          <div className="max-w-3xl mx-auto">
              {shouldShowFeedback ? (
                /* Immediate feedback mode (casual practice) */
                !isSubmitted ? (
                    <button 
                        onClick={handlePracticeSubmit} 
                        disabled={!selectedChoice} 
                        className={`w-full py-4 rounded-[25px] font-black text-xl text-white shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                            selectedChoice 
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' 
                            : 'bg-slate-300 cursor-not-allowed'
                        }`}
                    >
                        ส่งคำตอบเพื่อดูเฉลย
                    </button>
                ) : (
                    <button onClick={handlePracticeNext} className="w-full py-4 rounded-[25px] font-black text-xl text-white shadow-2xl transition-all bg-emerald-600 flex items-center justify-center gap-3 active:scale-95 shadow-emerald-200">
                        {currentIndex < questions.length - 1 ? 'ไปทำข้อต่อไป' : 'ดูสรุปผลลัพธ์'} <ArrowRight/>
                    </button>
                )
              ) : (
                /* 🎯 Exam Navigation Mode (Back/Next/Grid/Submit) */
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className={`px-4 sm:px-6 py-3.5 rounded-2xl font-black text-sm sm:text-base flex items-center gap-2 transition active:scale-95 ${
                      currentIndex === 0 
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ArrowLeft size={18}/> <span className="hidden sm:inline">ข้อก่อนหน้า</span>
                  </button>

                  <button 
                    onClick={() => setShowReviewModal(true)}
                    className="px-4 sm:px-5 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs sm:text-sm rounded-2xl flex items-center gap-2 border border-indigo-200 transition active:scale-95 shrink-0"
                  >
                    <Grid size={18}/>
                    <span>ตารางข้อสอบ ({answeredCount}/{questions.length})</span>
                  </button>

                  {currentIndex < questions.length - 1 ? (
                    <button 
                      onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                      className="px-5 sm:px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm sm:text-base rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition active:scale-95"
                    >
                      <span>ข้อถัดไป</span> <ArrowRight size={18}/>
                    </button>
                  ) : (
                    <button 
                      onClick={handleAttemptSubmit}
                      className="px-5 sm:px-7 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm sm:text-base rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-200 transition active:scale-95 animate-pulse"
                    >
                      <FileCheck size={18}/> <span>ส่งข้อสอบ</span>
                    </button>
                  )}
                </div>
              )}
          </div>
      </div>

      {/* 🖨️ Exam Question Palette & Review Modal */}
      {showReviewModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-3 sm:p-5 font-prompt animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border-t-8 border-indigo-600 my-auto">
            <button 
              onClick={() => setShowReviewModal(false)}
              className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
            >
              <X size={20}/>
            </button>

            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Grid className="text-indigo-600"/> ตารางคำตอบและการตรวจทานข้อสอบ
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                คุณสามารถเลือกคลิกที่เลขข้อเพื่อย้อนกลับไปแก้ไขคำตอบได้ก่อนกดส่งข้อสอบ
              </p>
            </div>

            {/* Completion Status Bar */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              unansweredCount === 0 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-2">
                {unansweredCount === 0 ? <CheckCircle className="text-emerald-600 shrink-0" size={22}/> : <AlertTriangle className="text-amber-600 shrink-0" size={22}/>}
                <div>
                  <h4 className="font-black text-sm">
                    {unansweredCount === 0 ? 'ตอบครบทุกข้อแล้ว!' : `ยังไม่ได้ตอบอีก ${unansweredCount} ข้อ`}
                  </h4>
                  <p className="text-xs font-semibold opacity-90">
                    {unansweredCount === 0 
                    ? 'พร้อมส่งข้อสอบเพื่อประเมินผลคะแนนได้ทันที' 
                    : 'คลิกเลือกข้อที่ยังไม่ได้ทำจากตารางด้านล่างเพื่อกลับไปทำต่อ'}
                  </p>
                </div>
              </div>
              <div className="font-black text-lg shrink-0">
                {answeredCount}/{questions.length}
              </div>
            </div>

            {/* Question Numbers Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>สัญลักษณ์ข้อสอบ:</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span> ตอบแล้ว</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block"></span> ยังไม่ตอบ</span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200/80 custom-scrollbar">
                {questions.map((q, idx) => {
                  const isAnswered = !!userAnswers[q.id];
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={q.id || idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowReviewModal(false);
                      }}
                      className={`h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center transition-all relative ${
                        isCurrent ? 'ring-4 ring-orange-400 z-10 scale-105' : ''
                      } ${
                        isAnswered 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {idx + 1}
                      {isAnswered && (
                        <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5">
                          <Check size={10}/>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                กลับไปทำต่อ / แก้ไข
              </button>

              <button
                onClick={handleAttemptSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 transition"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>}
                {isSubmitting ? 'กำลังส่งข้อสอบ...' : 'ยืนยันส่งข้อสอบ'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ⚠️ Unanswered Questions Warning Modal */}
      {showUnansweredWarning && createPortal(
        <div className="fixed inset-0 bg-slate-900/85 z-[110] flex items-center justify-center p-4 font-prompt animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border-t-8 border-amber-500 my-auto text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800">
                คุณยังไม่ได้ทำข้อสอบครบถ้วน!
              </h3>
              <p className="text-xs font-bold text-slate-500">
                ยังมีข้อสอบอีก <span className="text-amber-600 font-black text-sm">{unansweredIndices.length} ข้อ</span> ที่น้องยังไม่ได้เลือกคำตอบ
              </p>
            </div>

            {/* List of unanswered question numbers */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-left space-y-2">
              <span className="text-xs font-black text-amber-900 block">
                📋 ข้อสอบที่ยังไม่ได้ทำ:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pt-1">
                {unansweredIndices.map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setCurrentIndex(num - 1);
                      setShowUnansweredWarning(false);
                      setShowReviewModal(false);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-amber-500 hover:text-white text-amber-800 font-black text-xs rounded-lg border border-amber-300 shadow-2xs transition active:scale-95"
                    title={`คลิกเพื่อย้อนกลับไปทำข้อที่ ${num}`}
                  >
                    ข้อ {num}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] font-bold text-slate-400 italic">
              * แนะนำให้คลิกที่เลขข้อเพื่อย้อนกลับไปทำข้อสอบให้ครบเพื่อคะแนนสูงสุดนะคะ
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (unansweredIndices.length > 0) {
                    setCurrentIndex(unansweredIndices[0] - 1);
                  }
                  setShowUnansweredWarning(false);
                  setShowReviewModal(false);
                }}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition active:scale-95 flex items-center justify-center gap-2"
              >
                ✏️ กลับไปทำข้อที่ยังไม่ได้ทำ (ข้อ {unansweredIndices[0]})
              </button>

              <button
                onClick={() => handleConfirmFinalSubmit(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition shrink-0"
              >
                {isSubmitting ? 'กำลังส่ง...' : 'ยืนยันส่งข้อสอบแม้ทำไม่ครบ'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PracticeMode;

