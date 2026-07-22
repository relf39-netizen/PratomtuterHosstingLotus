import { Student, Question, School, Reward } from './types';

export const GRADE_LABELS: Record<string, string> = {
    'P1': 'ป.1',
    'P2': 'ป.2',
    'P3': 'ป.3',
    'P4': 'ป.4',
    'P5': 'ป.5',
    'P6': 'ป.6',
    'M1': 'ม.1',
    'M2': 'ม.2',
    'M3': 'ม.3',
    'ALL': 'ทุกชั้น',
    'GRADUATED': 'จบการศึกษา'
};

// Mock Schools - ปรับเป็นระดับประถมศึกษา
export const MOCK_SCHOOLS: School[] = [
    { id: 's1', name: 'โรงเรียนประถมสาธิตอัจฉริยะ', schoolCode: '10000001', status: 'active' },
    { id: 's2', name: 'โรงเรียนวิทยาศาสตร์รุ่นจิ๋ว', schoolCode: '10000002', status: 'active' },
    { id: 's3', name: 'โรงเรียนบ้านหนองเรียนเก่ง', schoolCode: '99999999', status: 'active' }
];

// Mock Students - ปรับเป็นเด็กประถม
export const MOCK_STUDENTS: Student[] = [
  { id: '10001', name: 'ด.ช.มานะ ขยันเรียน', avatar: '👦', stars: 120, grade: 'P6', classroom: '1', school: 'โรงเรียนประถมสาธิตอัจฉริยะ', inventory: [] },
  { id: '10002', name: 'ด.ญ.ชูใจ รักดี', avatar: '👧', stars: 150, grade: 'P3', classroom: '2', school: 'โรงเรียนประถมสาธิตอัจฉริยะ', inventory: [] },
  { id: '10003', name: 'ด.ช.ปิติ ยินดี', avatar: '🧒', stars: 90, grade: 'P1', classroom: '1', school: 'โรงเรียนประถมสาธิตอัจฉริยะ', inventory: [] },
];

export const CREATIVE_REWARDS: Reward[] = [
    // --- Level 1: Starter Items (20 - 100 Stars) ---
    { id: 'r1', name: 'ดินสอเปลี่ยนไส้วิเศษ', cost: 20, icon: '✏️', description: 'เขียนลื่น เขียนสนุก สอบผ่านแน่นอน', category: 'Stationery' },
    { id: 'r2', name: 'ตุ๊กตาหมีโดเรม่อน', cost: 50, icon: '🧸', description: 'เพื่อนนอนสุดนุ่มนิ่ม คอยเป็นกำลังใจให้เสมอ', category: 'Lifestyle' },
    { id: 'r3', name: 'ไม้เท้ากายสิทธิ์', cost: 80, icon: '🪄', description: 'ไม้เท้าพ่อมดน้อย ช่วยร่ายมนตร์ให้ความจำดี', category: 'Lifestyle' },
    { id: 'r4', name: 'นาฬิกาข้อมือสุดเท่', cost: 100, icon: '⌚', description: 'บอกเวลาแม่นยำ เท่ระเบิดในห้องเรียน', category: 'Gadget' },

    // --- Level 2: Fun & Gear (150 - 450 Stars) ---
    { id: 'r5', name: 'ดาบกายสิทธิ์เลเซอร์', cost: 150, icon: '⚔️', description: 'ดาบเรืองแสงสุดเท่ ใช้ปราบความไม่รู้ให้หมดไป', category: 'Lifestyle' },
    { id: 'r6', name: 'โล่เกราะเหล็กกล้า', cost: 200, icon: '🛡️', description: 'ป้องกันทุกความขี้เกียจ แข็งแกร่งที่สุดในรุ่น', category: 'Lifestyle' },
    { id: 'r7', name: 'สกู๊ตเตอร์ (Scooter)', cost: 250, icon: '🛴', description: 'ไถไปทุกที่ด้วยความเร็วแสง สนุกสุดขีด', category: 'Vehicle' },
    { id: 'r8', name: 'ชุดระบายสีมหายุทธ', cost: 300, icon: '🎨', description: 'สร้างสรรค์ผลงานศิลปะระดับโลก', category: 'Stationery' },
    { id: 'r9', name: 'จักรยานแม่บ้าน', cost: 400, icon: '🚲', description: 'ปั่นชิลๆ ไปโรงเรียนกับเพื่อนๆ', category: 'Vehicle' },
    { id: 'r10', name: 'หูฟังบลูทูธสีพาสเทล', cost: 450, icon: '🎧', description: 'ฟังนิทานและบทเรียนได้ชัดแจ๋ว', category: 'Gadget' },

    // --- Level 3: High Tech & Travel (500 - 900 Stars) ---
    { id: 'r11', name: 'โทรศัพท์มือถือล้ำสมัย', cost: 500, icon: '📱', description: 'ติดต่อคุณพ่อคุณแม่ได้สะดวก ทันสมัยสุดๆ', category: 'Gadget' },
    { id: 'r12', name: 'กระเป๋าเดินทางล้อลาก', cost: 650, icon: '🧳', description: 'กระเป๋าล้อลากลายการ์ตูน ใส่ของไปเที่ยวได้เยอะแยะเลย', category: 'Lifestyle' },
    { id: 'r13', name: 'กล้องถ่ายรูปดิจิทัลจิ๋ว', cost: 750, icon: '📷', description: 'เก็บภาพความประทับใจในวันทัศนศึกษา', category: 'Gadget' },
    { id: 'r14', name: 'เครื่องเล่นเกมพกพา', cost: 850, icon: '🎮', description: 'ผ่อนคลายสมองหลังจากฝึกฝนทำข้อสอบ', category: 'Gadget' },
    { id: 'r15', name: 'โดรนสำรวจติดกล้อง', cost: 950, icon: '🛸', description: 'บินสำรวจรอบบ้านด้วยมุมมองนกอินทรี', category: 'Gadget' },

    // --- Level 4: Dream Vehicles (1200 - 9999 Stars) ---
    { id: 'r16', name: 'มอเตอร์ไซค์ไฟฟ้าจิ๋ว', cost: 1200, icon: '🛵', description: 'ขับขี่ปลอดภัย เป็นมิตรต่อโลก', category: 'Vehicle' },
    { id: 'r17', name: 'รถยนต์ Super Car', cost: 2500, icon: '🏎️', description: 'รถสปอร์ตสีแดงสุดหรู เร็วแรงกว่าใคร', category: 'Vehicle' },
    { id: 'r18', name: 'เครื่องบินเจ็ทส่วนตัว', cost: 4500, icon: '✈️', description: 'บินไปเที่ยวรอบโลกได้ทุกปิดเทอม', category: 'Vehicle' },
    { id: 'r19', name: 'เรือยอร์ชสุดหรู', cost: 6000, icon: '🛳️', description: 'ปาร์ตี้กลางทะเลแสนสุขกับครอบครัว', category: 'Vehicle' },
    { id: 'r20', name: 'ยานอวกาศ UFO', cost: 9999, icon: '🚀', description: 'ออกเดินทางไปสำรวจดวงดาวที่ห่างไกล', category: 'Vehicle' }
];

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    subject: 'คณิตศาสตร์',
    text: 'ถ้ามีส้ม 15 ผล แบ่งให้นักเรียน 3 คน คนละเท่าๆ กัน จะได้ส้มคนละกี่ผล?',
    choices: [
      { id: 'c1', text: '3 ผล' },
      { id: 'c2', text: '5 ผล' },
      { id: 'c3', text: '10 ผล' },
      { id: 'c4', text: '15 ผล' },
    ],
    correctChoiceId: 'c2',
    explanation: 'ใช้การหาร 15 ÷ 3 = 5 ดังนั้นจะได้คนละ 5 ผล',
    grade: 'P3'
  },
  {
    id: 'q2',
    subject: 'วิทยาศาสตร์',
    text: 'สัตว์ในข้อใดจัดเป็นสัตว์เลี้ยงลูกด้วยนม?',
    choices: [
      { id: 'c1', text: 'ปลาฉลาม' },
      { id: 'c2', text: 'เต่าทะเล' },
      { id: 'c3', text: 'วาฬ' },
      { id: 'c4', text: 'จระเข้' },
    ],
    correctChoiceId: 'c3',
    explanation: 'วาฬเป็นสัตว์เลี้ยงลูกด้วยนมที่อาศัยอยู่ในน้ำ ออกลูกเป็นตัวและเลี้ยงลูกด้วยน้ำนม',
    grade: 'P4'
  }
];