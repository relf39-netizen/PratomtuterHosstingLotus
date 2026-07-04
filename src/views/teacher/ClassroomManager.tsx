
import React, { useState, useEffect } from 'react';
import { Classroom, Teacher } from '../../types';
import { Building2, Plus, Trash2, LayoutGrid, RefreshCw } from 'lucide-react';
import { getClassrooms, manageClassroom } from '../../services/api';

interface ClassroomManagerProps {
  teacher: Teacher;
}

const GRADES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'M1', 'M2', 'M3'];
const GRADE_LABELS: Record<string, string> = { 
    'P1': 'ป.1', 'P2': 'ป.2', 'P3': 'ป.3', 'P4': 'ป.4', 'P5': 'ป.5', 'P6': 'ป.6',
    'M1': 'ม.1', 'M2': 'ม.2', 'M3': 'ม.3' 
};

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ teacher }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState('P1');
  const [startRoom, setStartRoom] = useState(1);
  const [endRoom, setEndRoom] = useState(1);

  useEffect(() => {
    loadClassrooms();
  }, [teacher.school]);

  const loadClassrooms = async () => {
    setLoading(true);
    try {
        const data = await getClassrooms(teacher.school);
        setClassrooms(data);
    } catch (error: any) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleGenerate = async () => {
      if (endRoom < startRoom) return alert("ห้องเริ่มต้นต้องน้อยกว่าห้องสิ้นสุด");
      setIsProcessing(true);
      try {
          for (let i = startRoom; i <= endRoom; i++) {
              await manageClassroom('add', {
                  school: teacher.school,
                  gradeLevel: selectedGrade,
                  roomNumber: i.toString()
              });
          }
          alert("✅ สร้างห้องเรียนเรียบร้อย");
          loadClassrooms();
      } catch (e) {
          console.error(e);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDelete = async (id: string) => {
      if (!confirm('ยืนยันลบห้องเรียนนี้?')) return;
      await manageClassroom('delete', { id });
      loadClassrooms();
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="text-indigo-600"/> รายการห้องเรียน</h3>
            <button onClick={loadClassrooms} className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-slate-200 transition">
                <RefreshCw size={14}/> รีเฟรชข้อมูล
            </button>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8">
            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><LayoutGrid size={18}/> สร้างห้องเรียนอัตโนมัติ</h4>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-indigo-600 mb-1">ระดับชั้น</label>
                    <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="w-full p-2.5 border border-indigo-200 rounded-lg bg-white">
                        {GRADES.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-32">
                    <label className="block text-xs font-bold text-indigo-600 mb-1">เริ่มห้อง</label>
                    <input type="number" value={startRoom} onChange={e => setStartRoom(Number(e.target.value))} className="w-full p-2.5 border border-indigo-200 rounded-lg bg-white"/>
                </div>
                <div className="w-full md:w-32">
                    <label className="block text-xs font-bold text-indigo-600 mb-1">ถึงห้อง</label>
                    <input type="number" value={endRoom} onChange={e => setEndRoom(Number(e.target.value))} className="w-full p-2.5 border border-indigo-200 rounded-lg bg-white"/>
                </div>
                <button onClick={handleGenerate} disabled={isProcessing} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                    {isProcessing ? <RefreshCw className="animate-spin" size={18}/> : <Plus size={18}/>}
                    {isProcessing ? 'กำลังสร้าง...' : 'สร้างห้องเรียน'}
                </button>
            </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {loading ? <div className="p-10 text-center text-slate-500">กำลังโหลด...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {classrooms.map(c => {
                        const thaiGrade = GRADE_LABELS[c.gradeLevel] || c.gradeLevel;
                        return (
                            <div key={c.id} className="p-4 border-b border-r flex justify-between items-center hover:bg-slate-50 transition">
                                <span className="font-bold text-slate-800">ชั้น {thaiGrade}/{c.roomNumber}</span>
                                <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 transition"><Trash2 size={16}/></button>
                            </div>
                        );
                    })}
                    {classrooms.length === 0 && <div className="p-10 col-span-full text-center text-slate-600 italic">ยังไม่มีห้องเรียนในฐานข้อมูล</div>}
                </div>
            )}
        </div>
    </div>
  );
};

export default ClassroomManager;
