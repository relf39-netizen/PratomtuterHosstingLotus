import React, { useEffect, useState } from 'react';
import { Star, RefreshCw, Home, Sparkles, Trophy, CheckCircle2 } from 'lucide-react';
import { speak } from '../utils/soundUtils';
import { AssignmentCategory } from '../types';

interface ResultsProps {
  score: number;
  total: number;
  earnedStars: number; 
  isHomework?: boolean;
  isExam?: boolean;
  category?: AssignmentCategory;
  onRetry: () => void;
  onHome: () => void;
}

const Results: React.FC<ResultsProps> = ({ score, total, earnedStars, isHomework = false, isExam = false, category, onRetry, onHome }) => {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const [countdown, setCountdown] = useState(10);
  const isHiddenScore = category === 'MIDTERM' || category === 'FINAL' || category === 'EXAM';

  useEffect(() => {
    let speechText = "";
    
    if (isHiddenScore) {
        speechText = `ส่งข้อสอบเรียบร้อยแล้วจ้า! คุณครูได้รับคะแนนของหนูแล้วนะ เก่งมากครับ`;
    } else if (isExam) {
        speechText = `เสร็จสิ้นการทำข้อสอบแล้วจ้า! ได้คะแนน ${score} จาก ${total} ข้อ`;
    } else if (isHomework) {
        speechText = `ส่งการบ้านเรียบร้อยแล้วนะ! ได้ ${score} คะแนน เยี่ยมมาก!`;
    } else {
        if (earnedStars === 3) speechText = `สุดยอด! ได้ ${score} เต็ม ${total} รับ 3 ดาวไปเลย!`;
        else if (earnedStars === 2) speechText = `เก่งมาก! ได้ ${score} คะแนน รับ 2 ดาวนะ`;
        else if (earnedStars === 1) speechText = `ผ่านแล้วจ้า! ได้ ${score} คะแนน รับ 1 ดาวไปสะสมนะ`;
        else speechText = `พยายามได้ดีครับ ได้ ${score} คะแนน ลองใหม่อีกครั้งนะ สู้ๆ!`;
    }

    speak(speechText);

    let timer: any;
    if (isHomework || isExam) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onHome();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => { if (timer) clearInterval(timer); };
  }, [score, total, percentage, isHomework, isExam, onHome, earnedStars]);

  return (
    <div className="flex flex-col items-center text-center py-10 min-h-[80vh] justify-center relative overflow-hidden font-prompt">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
        <Sparkles className="absolute top-10 left-10 text-amber-400" size={80}/>
        <Trophy className="absolute bottom-20 right-10 text-indigo-400" size={100}/>
      </div>

      <div className="relative mb-10">
         <div className={`bg-white rounded-[60px] p-12 shadow-2xl relative z-10 border-8 ${earnedStars > 0 ? 'border-sky-100' : 'border-slate-100'}`}>
            <div className="flex gap-2 justify-center items-end">
                {[1, 2, 3].map(i => (
                    <Star 
                        key={i} 
                        size={i === 2 ? 100 : 70} 
                        fill={i <= earnedStars ? "currentColor" : "none"}
                        className={`transition-all duration-700 ${i <= earnedStars ? "text-amber-400 scale-110" : "text-slate-100"}`} 
                        style={{ marginBottom: i === 2 ? '10px' : '0px' }}
                    />
                ))}
            </div>
         </div>
      </div>

      <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
        {isHiddenScore ? 'ส่งข้อสอบสำเร็จ!' : isExam ? 'สรุปผลสอบ' : isHomework ? 'ภารกิจสำเร็จ!' : earnedStars > 0 ? 'เก่งมากจ้า!' : 'สู้ๆ นะ ลองใหม่อีกที!'}
      </h1>
      
      {earnedStars > 0 && !isHiddenScore && (
          <div className="mb-6 bg-amber-100 text-amber-700 font-black px-6 py-2 rounded-full border-4 border-white shadow-xl inline-flex items-center gap-2 animate-bounce">
            <Star size={18} fill="currentColor"/> + {earnedStars} ดาวสะสม
          </div>
      )}

      <div className="bg-white rounded-[50px] p-10 shadow-2xl border-b-[16px] border-slate-100 w-full max-w-sm mb-10 relative overflow-hidden group">
        {isHiddenScore ? (
            <div className="flex flex-col items-center py-6">
                <div className="bg-emerald-100 text-emerald-600 p-8 rounded-[40px] mb-6 shadow-inner">
                    <CheckCircle2 size={80} />
                </div>
                <div className="text-2xl font-black text-slate-800">ส่งข้อสอบเรียบร้อย</div>
                <p className="text-slate-400 font-bold mt-2">คะแนนจะถูกส่งให้คุณครูตรวจสอบ</p>
            </div>
        ) : (
            <>
                <div className="text-8xl font-black text-blue-600 mb-2">
                  {score}<span className="text-3xl text-slate-200 font-black ml-1">/{total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-6 mb-4 p-1 shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-[1500ms] ${percentage >= 80 ? 'bg-emerald-400' : percentage >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ความแม่นยำ {Math.round(percentage)}%</p>
            </>
        )}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm px-4">
        <button 
            onClick={onHome}
            className="w-full flex items-center justify-center gap-4 py-5 rounded-[30px] font-black text-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xl transition-all active:scale-95 border-b-8 border-blue-900"
        >
            <Home size={24} /> กลับหน้าหลัก {(isHomework || isExam) && `(${countdown})`}
        </button>
        {!isExam && !isHomework && (
            <button 
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 py-5 rounded-3xl font-black text-lg text-slate-600 bg-white border-b-8 border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
            >
                <RefreshCw size={22} /> ลองใหม่อีกครั้ง
            </button>
        )}
      </div>
    </div>
  );
};

export default Results;