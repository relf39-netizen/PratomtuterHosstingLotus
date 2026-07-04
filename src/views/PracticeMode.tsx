
import React, { useState, useEffect, useRef } from 'react';
import { Question, AssignmentCategory, ExamResultDetail } from '../types';
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, HelpCircle, Send, BookOpen, GraduationCap, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
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
  
  const assignmentIdRef = useRef(assignmentId);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  
  const isPractice = !assignmentId; 
  const isExamMode = category === 'MIDTERM' || category === 'FINAL' || category === 'EXAM';
  
  // 🎯 ลอจิกการแสดงเฉลย: แสดงเมื่อเป็นโหมดฝึกฝน (isPractice) และไม่ใช่ห้องสอบจริง (isExamMode) เท่านั้น
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
    if (isSubmitted) return; 
    setSelectedChoice(choiceId);
  };

  const handleSubmit = () => {
    if (!selectedChoice) return;
    const isCorrect = String(selectedChoice) === String(currentQuestion.correctChoiceId);
    
    if (isCorrect) {
        setScore(prev => prev + 1);
    }

    setResultDetails(prev => [...prev, {
        questionId: currentQuestion.id,
        selectedChoiceId: String(selectedChoice),
        isCorrect: isCorrect,
        topic: currentQuestion.unit || currentQuestion.subject
    }]);

    setIsSubmitted(true);

    if (shouldShowFeedback) {
        if (isCorrect) {
          speak("ถูกต้องครับ เก่งมาก");
        } else {
          speak("ลองดูเฉลยนะครับ");
        }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedChoice(null);
      setIsSubmitted(false);
    } else {
      onFinish(score, questions.length, assignmentIdRef.current, category, resultDetails);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-indigo-500 font-black text-xl animate-pulse">กำลังเตรียมข้อสอบ...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto font-prompt animate-fade-in pb-10">
      {/* Header Info */}
      <div className={`flex items-center justify-between mb-4 p-3 md:p-4 rounded-2xl bg-white text-slate-600 shadow-md border-b-4 border-black/5`}>
        <button onClick={onBack} className="font-bold flex items-center gap-1 hover:opacity-70 transition-opacity text-sm md:text-base"><ArrowLeft size={18} /> ออก</button>
        
        <div className="flex items-center gap-2 md:gap-4">
            <div className="flex flex-col items-center">
                <div className="font-black text-sm md:text-base leading-none">{currentIndex + 1} / {questions.length}</div>
                <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase mt-1 tracking-tighter ${isPractice ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                    {isPractice ? 'Practice' : 'Homework Task'}
                </div>
            </div>
            
            <div className="w-12 md:w-20 h-2 bg-black/5 rounded-full overflow-hidden hidden sm:block">
                <div className={`h-full transition-all duration-500 bg-indigo-600`} style={{ width: `${((currentIndex+1) / questions.length) * 100}%` }}></div>
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
            <div className="absolute top-4 right-8 text-red-500 opacity-20"><ShieldCheck size={32}/></div>
        ) : (
            <div className="absolute top-4 right-8 text-orange-500 opacity-20"><GraduationCap size={32}/></div>
        )}
        
        <div className="mb-2">
            {isExamMode && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black border border-red-100 shadow-sm uppercase tracking-widest">Exam Mode: No Feedback</span>}
        </div>
        <h2 className="text-[14pt] font-black text-slate-800 mb-8 leading-tight pr-10">{currentQuestion?.text}</h2>

        <div className="grid gap-3">
          {currentQuestion?.choices.map((choice, index) => {
            const isSelected = selectedChoice === choice.id;
            const isCorrect = choice.id === currentQuestion.correctChoiceId;
            
            let btnClass = "w-full rounded-[25px] text-left font-bold text-base md:text-lg border-2 transition-all flex items-center gap-4 ";
            
            if (shouldShowFeedback && isSubmitted) {
                if (isCorrect) btnClass += "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md scale-[1.01]";
                else if (isSelected) btnClass += "bg-rose-50 border-rose-500 text-rose-800 animate-shake";
                else btnClass += "bg-slate-50 border-slate-100 text-slate-300 opacity-50 grayscale";
            } else {
                btnClass += isSelected ? "bg-indigo-600 border-indigo-700 text-white shadow-lg scale-[1.01]" : "bg-white border-slate-100 text-slate-600 hover:border-indigo-300";
            }

            return (
              <div
                key={choice.id}
                role="button"
                onClick={() => !isSubmitted && handleChoiceSelect(choice.id)}
                className={`w-full p-2.5 md:p-3 rounded-2xl text-left ${btnClass} ${!isSubmitted ? 'cursor-pointer' : ''}`}
              >
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-base transition-all ${isSelected ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                   {choiceLabels[index]}
                </div>

                <div className="flex-1 min-w-0">
                    <span className="font-bold break-words">{choice.text}</span>
                </div>

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

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-slate-200 md:static md:bg-transparent md:border-0 md:p-0 z-20">
          <div className="max-w-3xl auto mx-auto">
              {!isSubmitted ? (
                  <button 
                      onClick={handleSubmit} 
                      disabled={!selectedChoice} 
                      className={`w-full py-4 rounded-[25px] font-black text-xl text-white shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                          selectedChoice 
                          ? (isPractice ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : isExamMode ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200') 
                          : 'bg-slate-300 cursor-not-allowed'
                      }`}
                  >
                      {isPractice ? 'ส่งคำตอบเพื่อดูเฉลย' : isExamMode ? 'ยืนยันและถัดไป' : <><Send size={20}/> ยืนยันคำตอบนี้</>}
                  </button>
              ) : (
                  <button onClick={handleNext} className="w-full py-4 rounded-[25px] font-black text-xl text-white shadow-2xl transition-all bg-emerald-600 flex items-center justify-center gap-3 active:scale-95 shadow-emerald-200">
                      {currentIndex < questions.length - 1 ? 'ไปทำข้อต่อไป' : isExamMode ? 'ส่งข้อสอบ' : 'ดูสรุปผลลัพธ์'} <ArrowRight/>
                  </button>
              )}
          </div>
      </div>
    </div>
  );
};

export default PracticeMode;
