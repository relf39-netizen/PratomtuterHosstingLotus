import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, FileText, Calendar, Printer, HelpCircle } from 'lucide-react';
import { Question } from '../types';

export function extractDetailsArray(rawDetails: any): any[] {
  if (!rawDetails) return [];
  let parsed = rawDetails;
  if (typeof rawDetails === 'string') {
    try {
      parsed = JSON.parse(rawDetails);
    } catch (e) {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.retakeDetails)) return parsed.retakeDetails;
    if (Array.isArray(parsed.answers)) return parsed.answers;
    if (Array.isArray(parsed.details)) return parsed.details;
    if (parsed.userAnswers && typeof parsed.userAnswers === 'object') {
      return Object.keys(parsed.userAnswers).map(qId => ({
        questionId: qId,
        selectedChoiceId: parsed.userAnswers[qId],
      }));
    }
  }
  return [];
}

interface StudentExamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentClassroom?: string;
  examTitle: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  timestamp?: number;
  details: any;
  assignmentQuestions?: Question[];
}

export const StudentExamDetailModal: React.FC<StudentExamDetailModalProps> = ({
  isOpen,
  onClose,
  studentName,
  studentClassroom,
  examTitle,
  subjectName,
  score,
  totalQuestions,
  timestamp,
  details,
  assignmentQuestions = []
}) => {
  if (!isOpen) return null;

  const choiceLabels = ['ก', 'ข', 'ค', 'ง'];
  const detailsArray = extractDetailsArray(details);

  // Parse retake details if object
  const detailsObj = typeof details === 'string' 
    ? (() => { try { return JSON.parse(details); } catch(e) { return {}; } })() 
    : (details && typeof details === 'object' && !Array.isArray(details) ? details : {});

  const isRetake = !!detailsObj?.isRetake;
  const retakeScore = detailsObj?.retakeScore;
  const retakeTotal = detailsObj?.retakeTotal || totalQuestions;

  // Build question rows
  // If assignmentQuestions are available, use them as base list to ensure full questions order
  let questionList: any[] = [];

  if (assignmentQuestions && assignmentQuestions.length > 0) {
    questionList = assignmentQuestions.map((q, idx) => {
      const qIdStr = String(q.id).trim();
      const det = detailsArray.find((d: any) => 
        String(d.questionId || d.id || '').trim() === qIdStr || d.questionIndex === idx
      );

      const selectedChoiceId = det ? String(det.selectedChoiceId || det.userAnswer || det.choiceId || '').trim() : '';
      const correctChoiceId = String(q.correctChoiceId || '').trim();
      
      let isCorrect = false;
      if (det && det.isCorrect !== undefined) {
        isCorrect = !!det.isCorrect;
      } else if (selectedChoiceId && correctChoiceId) {
        isCorrect = selectedChoiceId === correctChoiceId;
      }

      // Find choice objects
      const selectedChoiceObj = q.choices.find(c => String(c.id).trim() === selectedChoiceId);
      const selectedChoiceIdx = q.choices.findIndex(c => String(c.id).trim() === selectedChoiceId);
      
      const correctChoiceObj = q.choices.find(c => String(c.id).trim() === correctChoiceId);
      const correctChoiceIdx = q.choices.findIndex(c => String(c.id).trim() === correctChoiceId);

      return {
        index: idx + 1,
        questionText: q.text,
        unit: q.unit || q.subject || '',
        choices: q.choices,
        selectedChoiceId,
        selectedChoiceLabel: selectedChoiceIdx >= 0 ? choiceLabels[selectedChoiceIdx % choiceLabels.length] : '',
        selectedChoiceText: selectedChoiceObj ? selectedChoiceObj.text : (det?.selectedChoiceText || (selectedChoiceId ? 'เลือกตัวเลือก' : 'ไม่ได้ตอบ')),
        correctChoiceId,
        correctChoiceLabel: correctChoiceIdx >= 0 ? choiceLabels[correctChoiceIdx % choiceLabels.length] : '',
        correctChoiceText: correctChoiceObj ? correctChoiceObj.text : (det?.correctChoiceText || ''),
        isCorrect,
        explanation: q.explanation || det?.explanation || ''
      };
    });
  } else if (detailsArray.length > 0) {
    questionList = detailsArray.map((det: any, idx: number) => {
      const selectedChoiceId = String(det.selectedChoiceId || det.userAnswer || '').trim();
      const correctChoiceId = String(det.correctChoiceId || '').trim();

      return {
        index: idx + 1,
        questionText: det.questionText || det.text || `คำถามข้อที่ ${idx + 1}`,
        unit: det.topic || det.unit || '',
        choices: det.choices || [],
        selectedChoiceId,
        selectedChoiceLabel: det.selectedChoiceLabel || '',
        selectedChoiceText: det.selectedChoiceText || (selectedChoiceId ? 'เลือกแล้ว' : 'ไม่ได้ตอบ'),
        correctChoiceId,
        correctChoiceLabel: det.correctChoiceLabel || '',
        correctChoiceText: det.correctChoiceText || '',
        isCorrect: !!det.isCorrect,
        explanation: det.explanation || ''
      };
    });
  }

  const effectiveTotal = totalQuestions || questionList.length || 1;
  const pct = Math.round((score / effectiveTotal) * 100);
  const isPassed = pct >= 50;

  const handlePrint = () => {
    window.print();
  };

  const modalNode = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto relative z-[99999]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-300 border border-indigo-400/30">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                รายละเอียดการทำข้อสอบรายบุคคล
              </h3>
              <p className="text-xs text-indigo-200 font-medium">
                {examTitle} • วิชา {subjectName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 border border-white/10"
              title="พิมพ์เอกสารรายละเอียดนี้"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">พิมพ์รายข้อ</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Student & Score Summary Banner */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-xl text-slate-800">{studentName}</h4>
                {studentClassroom && (
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-black rounded-lg">
                    ห้อง {studentClassroom}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                {timestamp && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400"/>
                    {new Date(timestamp).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                  </span>
                )}
                <span>จำนวนข้อทั้งหมด: {effectiveTotal} ข้อ</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">คะแนนสอบที่ได้</span>
              <div className="text-2xl font-black text-indigo-600 flex items-baseline gap-1">
                <span>{score}</span>
                <span className="text-sm text-slate-400">/ {effectiveTotal}</span>
                <span className="text-xs font-bold text-slate-500 ml-1">({pct}%)</span>
              </div>
              {isRetake && retakeScore !== undefined && (
                <div className="text-[11px] font-bold text-amber-600 mt-0.5">
                  สอบแก้ตัวได้: {retakeScore}/{retakeTotal}
                </div>
              )}
            </div>

            <div className="border-l border-slate-200 pl-4">
              <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-sm ${
                isPassed 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {isPassed ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                {isPassed ? 'ผ่านเกณฑ์' : 'ซ่อมเสริม'}
              </span>
            </div>
          </div>
        </div>

        {/* Question Details List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-100/60">
          {questionList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
              <HelpCircle size={40} className="mx-auto text-slate-300" />
              <h4 className="font-black text-slate-700 text-base">ไม่พบรายละเอียดการตอบคำตอบรายข้อ</h4>
              <p className="text-xs text-slate-500 font-medium">
                ผลการสอบนี้อาจทำก่อนระบบบันทึกรายข้อ หรือทำผ่านระบบสอบด่วน
              </p>
            </div>
          ) : (
            questionList.map((item) => {
              return (
                <div 
                  key={item.index} 
                  className={`p-5 rounded-2xl border transition-all bg-white shadow-sm space-y-3 ${
                    item.isCorrect ? 'border-emerald-200/80 hover:border-emerald-300' : 'border-rose-200/80 hover:border-rose-300'
                  }`}
                >
                  {/* Top Bar of Question */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.index}
                      </span>
                      <span className="font-black text-slate-800 text-sm md:text-base">
                        ข้อที่ {item.index}
                      </span>
                      {item.unit && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                          {item.unit}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-sm ${
                        item.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {item.isCorrect ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                        {item.isCorrect ? 'ถูกต้อง (+1 คะแนน)' : 'ตอบผิด (0 คะแนน)'}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm font-bold text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                    {item.questionText}
                  </div>

                  {/* Answers Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Student Answer */}
                    <div className={`p-3 rounded-xl border space-y-1 ${
                      item.isCorrect 
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50/60 border-rose-200 text-rose-900'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        คำตอบที่นักเรียนเลือกตอบ:
                      </span>
                      <div className="font-bold text-xs flex items-start gap-1.5">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                          item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {item.selectedChoiceLabel || (item.isCorrect ? '✓' : '✕')}
                        </span>
                        <span className="leading-normal">{item.selectedChoiceText}</span>
                      </div>
                    </div>

                    {/* Correct Answer / Solution */}
                    <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1 text-indigo-950">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                        เฉลยคำตอบที่ถูกต้อง:
                      </span>
                      <div className="font-bold text-xs flex items-start gap-1.5">
                        <span className="w-5 h-5 bg-indigo-600 text-white rounded-md flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                          {item.correctChoiceLabel || '✓'}
                        </span>
                        <span className="leading-normal">{item.correctChoiceText || 'เฉลยคำตอบที่ถูกต้อง'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Explanation if any */}
                  {item.explanation && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 font-medium space-y-1">
                      <span className="font-black text-[10px] text-amber-700 uppercase tracking-wider block">
                        💡 เฉลยคำอธิบายเพิ่มเติม:
                      </span>
                      <p>{item.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-slate-400">
            หลักฐานผลการทำข้อสอบรายบุคคล • ระบบตรวจทานข้อสอบ AI
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl transition shadow active:scale-95"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
};
