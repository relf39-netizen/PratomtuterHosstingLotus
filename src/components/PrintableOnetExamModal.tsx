import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, X, FileText, CheckSquare, Key, Settings2, 
  Copy, Check, BookOpen, School, Calendar
} from 'lucide-react';

export interface ExamQuestionForPrint {
  id?: string | number;
  text: string;
  choices?: { id?: string | number; text: string }[];
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
  correctChoiceId?: string | number;
  correct?: string | number;
  explanation?: string;
  indicator?: string;
  yearRef?: string;
}

interface PrintableOnetExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subject: string;
  grade: string;
  schoolName?: string;
  questions: ExamQuestionForPrint[];
}

export const PrintableOnetExamModal: React.FC<PrintableOnetExamModalProps> = ({
  isOpen,
  onClose,
  title,
  subject,
  grade,
  schoolName = 'โรงเรียนประถมศึกษา',
  questions = []
}) => {
  const [activeTab, setActiveTab] = useState<'EXAM' | 'ANSWER_SHEET' | 'KEY'>('EXAM');
  const [customSchool, setCustomSchool] = useState(schoolName || 'โรงเรียนประถมศึกษา');
  const [customTitle, setCustomTitle] = useState(title || `แบบทดสอบเตรียมความพร้อม O-NET ${subject}`);
  const [academicYear, setAcademicYear] = useState('2568');
  const [timeAllowed, setTimeAllowed] = useState('60 นาที');
  const [choiceFormat, setChoiceFormat] = useState<'THAI' | 'NUMBER'>('THAI'); // ก,ข,ค,ง หรือ 1,2,3,4
  const [columns, setColumns] = useState<'1' | '2'>('1');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [showIndicators, setShowIndicators] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const choiceLabels = choiceFormat === 'THAI' 
    ? ['ก', 'ข', 'ค', 'ง'] 
    : ['1', '2', '3', '4'];

  const getChoiceText = (q: ExamQuestionForPrint, index: number) => {
    if (q.choices && q.choices[index]) {
      return q.choices[index].text;
    }
    if (index === 0) return q.c1 || '';
    if (index === 1) return q.c2 || '';
    if (index === 2) return q.c3 || '';
    if (index === 3) return q.c4 || '';
    return '';
  };

  const getCorrectChoiceIndex = (q: ExamQuestionForPrint): number => {
    const raw = q.correctChoiceId ?? q.correct ?? '1';
    const num = parseInt(String(raw), 10);
    if (!isNaN(num) && num >= 1 && num <= 4) return num - 1;
    if (String(raw).toLowerCase() === 'a' || String(raw) === 'ก') return 0;
    if (String(raw).toLowerCase() === 'b' || String(raw) === 'ข') return 1;
    if (String(raw).toLowerCase() === 'c' || String(raw) === 'ค') return 2;
    if (String(raw).toLowerCase() === 'd' || String(raw) === 'ง') return 3;
    return 0;
  };

  const gradeDisplay = grade === 'P6' ? 'ประถมศึกษาปีที่ 6' : 
                       grade === 'M3' ? 'มัธยมศึกษาปีที่ 3' : 
                       grade === 'P3' ? 'ประถมศึกษาปีที่ 3 (NT)' : grade;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    let output = `${customSchool}\n${customTitle}\nระดับชั้น ${gradeDisplay} วิชา ${subject} ปีการศึกษา ${academicYear}\n\n`;
    questions.forEach((q, i) => {
      output += `${i + 1}. ${q.text}\n`;
      output += `   ก. ${getChoiceText(q, 0)}\n`;
      output += `   ข. ${getChoiceText(q, 1)}\n`;
      output += `   ค. ${getChoiceText(q, 2)}\n`;
      output += `   ง. ${getChoiceText(q, 3)}\n\n`;
    });
    output += `\n--- เฉลยข้อสอบ ---\n`;
    questions.forEach((q, i) => {
      const cIdx = getCorrectChoiceIndex(q);
      output += `ข้อ ${i + 1}: ตอบ ${choiceLabels[cIdx]} - ${q.explanation || ''}\n`;
    });
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex flex-col font-prompt animate-fade-in">
      <style>{`
        @media print {
          #root {
            display: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-size: 13pt !important;
            line-height: 1.4 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-exam-wrapper {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .printable-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            max-width: 100% !important;
            width: 100% !important;
            page-break-after: always;
          }
          .question-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 12pt !important;
          }
          @page {
            size: A4;
            margin: 12mm 10mm 12mm 10mm;
          }
        }
      `}</style>

      {/* Top Navbar / Controls (Hidden when printing) */}
      <div className="no-print bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/30">
            <Printer size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black leading-tight flex items-center gap-2">
              พิมพ์แบบทดสอบข้อสอบติว O-NET / NT บนกระดาษ A4
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              ปรับแต่งหัวกระดาษ กระดาษคำตอบ และสั่งพิมพ์แบบกระดาษสำหรับใช้ทดสอบนักเรียน
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('EXAM')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'EXAM' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText size={15} /> 1. แบบทดสอบนักเรียน
          </button>
          <button
            onClick={() => setActiveTab('ANSWER_SHEET')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'ANSWER_SHEET' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CheckSquare size={15} /> 2. ใบกระดาษคำตอบ
          </button>
          <button
            onClick={() => setActiveTab('KEY')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'KEY' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Key size={15} /> 3. เฉลยละเอียด (สำหรับครู)
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 border border-slate-700"
            title="คัดลอกข้อสอบเป็นข้อความ"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            {copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}
          </button>
          <button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-black transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95"
          >
            <Printer size={18} /> สั่งพิมพ์แบบทดสอบ (Print / PDF)
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Layout with Sidebar Settings & Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Settings Panel (Hidden when printing) */}
        <div className="no-print w-80 bg-slate-900 border-r border-slate-800 p-5 overflow-y-auto space-y-5 text-slate-200">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-indigo-400 pb-2 border-b border-slate-800">
            <Settings2 size={16} /> การตั้งค่าหัวข้อสอบและหน้าพิมพ์
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <School size={14} /> ชื่อโรงเรียน / สังกัด
            </label>
            <input
              type="text"
              value={customSchool}
              onChange={(e) => setCustomSchool(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <BookOpen size={14} /> ชื่อแบบทดสอบ
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} /> ปีการศึกษา
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                เวลาทำข้อสอบ
              </label>
              <input
                type="text"
                value={timeAllowed}
                onChange={(e) => setTimeAllowed(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">
              รูปแบบสัญลักษณ์ตัวเลือก
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChoiceFormat('THAI')}
                className={`py-2 rounded-xl text-xs font-black border transition ${
                  choiceFormat === 'THAI'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ก, ข, ค, ง
              </button>
              <button
                type="button"
                onClick={() => setChoiceFormat('NUMBER')}
                className={`py-2 rounded-xl text-xs font-black border transition ${
                  choiceFormat === 'NUMBER'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                1, 2, 3, 4
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">
              การจัดเลย์เอาต์หน้ากระดาษ
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColumns('1')}
                className={`py-2 rounded-xl text-xs font-black border transition ${
                  columns === '1'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                1 คอลัมน์ (อ่านง่าย)
              </button>
              <button
                type="button"
                onClick={() => setColumns('2')}
                className={`py-2 rounded-xl text-xs font-black border transition ${
                  columns === '2'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                2 คอลัมน์ (ประหยัดกระดาษ)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">
              ขนาดตัวอักษรพิมพ์
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['small', 'normal', 'large'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFontSize(s)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                    fontSize === s
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'small' ? 'เล็ก' : s === 'normal' ? 'มาตรฐาน' : 'ใหญ่ (ป.3)'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={showIndicators}
                onChange={(e) => setShowIndicators(e.target.checked)}
                className="rounded accent-indigo-600"
              />
              แสดงตัวชี้วัด / ปีข้อสอบอ้างอิง
            </label>
          </div>

          <div className="p-3 bg-indigo-950/50 rounded-xl border border-indigo-800/40 text-[11px] text-indigo-300 leading-relaxed font-medium">
            💡 <strong>คำแนะนำการพิมพ์:</strong> เมื่อกดสั่งพิมพ์ ให้เลือกเครื่องพิมพ์เป็น <strong>"Save as PDF"</strong> หรือเครื่องพิมพ์จริง และตรวจสอบว่า <strong>Margins: Default (ปกติ)</strong> หรือ <strong>None</strong>
          </div>
        </div>

        {/* Paper Sheet Preview Area */}
        <div className="printable-exam-wrapper flex-1 bg-slate-950/60 overflow-y-auto p-4 md:p-8 flex justify-center">
          {/* A4 White Sheet Container */}
          <div 
            className={`printable-sheet bg-white text-slate-900 rounded-[10px] shadow-2xl w-full max-w-[850px] p-8 md:p-12 min-h-[1100px] font-prompt ${
              fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'
            }`}
          >
            {/* 1. แบบทดสอบสำหรับนักเรียน */}
            {activeTab === 'EXAM' && (
              <div>
                {/* Official Exam Header */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                      {customSchool}
                    </h2>
                    <h3 className="text-base md:text-lg font-black text-slate-800">
                      {customTitle}
                    </h3>
                    <p className="text-xs md:text-sm font-bold text-slate-600">
                      กลุ่มสาระการเรียนรู้ {subject} • ระดับชั้น {gradeDisplay} • ปีการศึกษา {academicYear}
                    </p>
                  </div>

                  {/* Student Credentials Box */}
                  <div className="mt-5 p-3.5 border border-slate-700 rounded-lg bg-slate-50/50 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs md:text-sm font-bold">
                    <div className="md:col-span-6">
                      ชื่อ - สกุล: ....................................................................................
                    </div>
                    <div className="md:col-span-3">
                      ชั้น: ............/............  เลขที่: ............
                    </div>
                    <div className="md:col-span-3 text-right">
                      คะแนนที่ได้: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / {questions.length} ]
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mt-3 text-xs text-slate-600 font-medium flex justify-between items-center">
                    <span>
                      <strong>คำชี้แจง:</strong> แบบทดสอบมีทั้งหมด {questions.length} ข้อ แบบเลือกตอบ 4 ตัวเลือก ให้นักเรียนเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว
                    </span>
                    <span className="font-bold text-slate-800 ml-4 flex-shrink-0">
                      เวลา {timeAllowed}
                    </span>
                  </div>
                </div>

                {/* Questions List */}
                <div className={columns === '2' ? 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6' : 'space-y-6'}>
                  {questions.map((q, idx) => (
                    <div key={idx} className="question-item break-inside-avoid">
                      <div className="font-black text-slate-900 leading-relaxed flex items-start gap-1.5 mb-2.5">
                        <span className="flex-shrink-0 font-black">{idx + 1}.</span>
                        <div className="flex-1">
                          {q.text}
                          {showIndicators && (q.indicator || q.yearRef) && (
                            <span className="no-print ml-2 inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              {q.yearRef ? `${q.yearRef} • ` : ''}{q.indicator || 'มาตรฐาน สทศ.'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 4 Choices Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-5 text-slate-800 font-medium">
                        {[0, 1, 2, 3].map((cIdx) => (
                          <div key={cIdx} className="flex items-start gap-2 py-0.5">
                            <span className="font-bold text-slate-900 w-5 flex-shrink-0">
                              {choiceLabels[cIdx]}.
                            </span>
                            <span className="leading-snug">
                              {getChoiceText(q, cIdx)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* End of Exam Marker */}
                <div className="text-center text-xs font-bold text-slate-500 pt-8 mt-8 border-t border-dashed border-slate-300">
                  *** สิ้นสุดแบบทดสอบ ขอให้นักเรียนทุกคนโชคดีในการทำข้อสอบ ***
                </div>
              </div>
            )}

            {/* 2. ใบกระดาษคำตอบสำหรับฝนหรือกากบาท (Answer Sheet) */}
            {activeTab === 'ANSWER_SHEET' && (
              <div>
                <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase">
                    กระดาษคำตอบ (Answer Sheet)
                  </h2>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {customSchool} • {customTitle}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    ระดับชั้น {gradeDisplay} • วิชา {subject} • จำนวน {questions.length} ข้อ
                  </p>

                  <div className="mt-5 p-4 border border-slate-800 rounded-lg bg-slate-50/50 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs md:text-sm font-bold text-left">
                    <div className="md:col-span-6">
                      ชื่อ - สกุล: ....................................................................................
                    </div>
                    <div className="md:col-span-3">
                      ชั้น: ............/............ เลขที่: ............
                    </div>
                    <div className="md:col-span-3 text-right">
                      คะแนน: [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / {questions.length} ]
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 text-left font-medium">
                    <strong>วิธีการทำ:</strong> ให้นักเรียนทำเครื่องหมายกากบาท (X) หรือระบายทึบลงในวงกลมตัวเลือกที่ถูกต้องที่สุดเพียงข้อเดียว
                  </div>
                </div>

                {/* Answer Grid (3 or 4 columns) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {questions.map((_, idx) => (
                    <div 
                      key={idx} 
                      className="border border-slate-300 rounded-lg p-2.5 bg-white flex items-center justify-between"
                    >
                      <span className="font-black text-sm text-slate-800 w-8">
                        {idx + 1}.
                      </span>
                      <div className="flex items-center gap-1.5">
                        {choiceLabels.map((lbl) => (
                          <div 
                            key={lbl}
                            className="w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                          >
                            {lbl}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grading Area */}
                <div className="mt-10 pt-6 border-t-2 border-slate-300 flex justify-between items-end text-xs text-slate-600">
                  <div>
                    ลงชื่อผู้ตรวจ ............................................................<br/>
                    ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )
                  </div>
                  <div className="text-right">
                    วันที่ตรวจ ......... / ......... / 2568
                  </div>
                </div>
              </div>
            )}

            {/* 3. เฉลยละเอียดและเกณฑ์การให้คะแนน (Answer Key & Solutions) */}
            {activeTab === 'KEY' && (
              <div>
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Key size={24} className="text-emerald-600" />
                    เฉลยละเอียดและคำอธิบายข้อสอบติว O-NET / NT (สำหรับคุณครู)
                  </h2>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {customTitle} • ระดับชั้น {gradeDisplay} • วิชา {subject}
                  </p>
                </div>

                {/* Quick Key Summary Table */}
                <div className="mb-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-black text-xs uppercase tracking-widest text-emerald-800 mb-3">
                    📋 ตารางสรุปกุญแจเฉลยเร็ว
                  </h4>
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 text-center text-xs font-black">
                    {questions.map((q, idx) => {
                      const cIdx = getCorrectChoiceIndex(q);
                      return (
                        <div key={idx} className="bg-white p-2 rounded-lg border border-emerald-200 shadow-sm">
                          <div className="text-slate-400 text-[10px]">ข้อ {idx + 1}</div>
                          <div className="text-emerald-700 text-sm">{choiceLabels[cIdx]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Full Question-by-Question Explanations */}
                <div className="space-y-6">
                  {questions.map((q, idx) => {
                    const cIdx = getCorrectChoiceIndex(q);
                    return (
                      <div key={idx} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 question-item break-inside-avoid">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="font-black text-slate-900 text-sm">
                            ข้อที่ {idx + 1}. {q.text}
                          </div>
                          <span className="bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-lg text-xs flex-shrink-0">
                            ตอบ {choiceLabels[cIdx]}
                          </span>
                        </div>

                        {/* Choices */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 text-xs mb-3 text-slate-600">
                          {[0, 1, 2, 3].map((ci) => (
                            <div key={ci} className={ci === cIdx ? 'font-black text-emerald-700' : ''}>
                              {choiceLabels[ci]}. {getChoiceText(q, ci)} {ci === cIdx ? '✓ (คำตอบที่ถูกต้อง)' : ''}
                            </div>
                          ))}
                        </div>

                        {/* Detailed Solution */}
                        <div className="p-3 bg-white rounded-lg border border-emerald-100 text-xs text-slate-700 leading-relaxed">
                          <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                            💡 <strong>แนวคิด / วิธีทำ / คำอธิบายเฉลย:</strong>
                          </div>
                          <p className="whitespace-pre-line pl-5 border-l-2 border-emerald-300">
                            {q.explanation || 'สืบค้นจากหลักการและนิยามตามมาตรฐานตัวชี้วัด สทศ.'}
                          </p>
                          {(q.indicator || q.yearRef) && (
                            <div className="mt-2 text-[10px] text-slate-400 font-bold flex items-center gap-2">
                              <span>📌 ตัวชี้วัด: {q.indicator || 'มาตรฐาน สทศ.'}</span>
                              {q.yearRef && <span>• อ้างอิง: {q.yearRef}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrintableOnetExamModal;

