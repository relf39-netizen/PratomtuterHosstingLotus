import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedQuestion {
  text: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  correct: string;
  explanation: string;
  image?: string; 
  unit?: string;
}

const sanitizeKey = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.trim()
    .replace(/[\u2014\u2015\u2500]/g, '--')
    .replace(/[\u2013\u2212]/g, '-')
    .replace(/[-─—]{3,}$/, '')
    .replace(/\s+/g, '')
    .replace(/[^\w\.\-]/g, '');
  return cleaned;
};

// Available Gemini models with automatic fallback
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest'
];

/**
 * สร้างข้อสอบด้วย AI สำหรับโรงเรียนประถมและขยายโอกาส
 * เน้นอ้างอิงแนวข้อสอบจริงปี 2560 - 2567
 * รองรับการใช้ API Key แยกของคุณครูแต่ละคน, รองรับสำรองคีย์, และระบบหมุนเวียนโมเดลอัตโนมัติเมื่อโควต้าชนขีดจำกัด
 */
export const generateQuestionWithAI = async (
  subject: string,
  grade: string,
  topic: string,
  count: number = 5,
  style: 'normal' | 'onet' | 'nt' | 'exam' = 'normal',
  existingQuestions: string[] = []
): Promise<GeneratedQuestion[] | null> => {
  
  // 🟢 อ่าน API Key จาก LocalStorage ใน Browser ของคุณครูแต่ละคน
  const storageKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('MST_CUSTOM_GEMINI_KEY') : null) || '';
  const envKey = (typeof process !== 'undefined' && process.env) ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '';
  
  const rawKeyCombined = storageKey || envKey || '';

  if (!rawKeyCombined) {
    throw new Error("ไม่พบ API Key กรุณาไปที่หน้า 'ข้อมูลของฉัน' (โปรไฟล์คุณครู) แล้วบันทึก API Key ของท่านก่อนใช้งานสร้างข้อสอบครับ");
  }

  // รองรับการใส่หลายคีย์คั่นด้วยเครื่องหมายจุลภาค (,) หรือขึ้นบรรทัดใหม่ เพื่อเป็นคีย์สำรอง
  const keyCandidates = rawKeyCombined
    .split(/[\n,;]+/)
    .map(k => sanitizeKey(k))
    .filter(k => k.length >= 20 && (k.startsWith('AIza') || k.startsWith('AQ')));

  if (keyCandidates.length === 0) {
    // กรณีที่คีย์ไม่เข้าเงื่อนไข prefix แต่ยังมีตัวอักษร
    const single = sanitizeKey(rawKeyCombined);
    if (single) keyCandidates.push(single);
  }

  if (keyCandidates.length === 0) {
    throw new Error("รูปแบบ API Key ไม่ถูกต้อง กรุณาตรวจสอบและบันทึก API Key ใหม่ในหน้าโปรไฟล์ครับ");
  }

  const isElementary = grade.startsWith('P');
  const levelName = isElementary ? 'ประถมศึกษา' : 'มัธยมศึกษาตอนต้น';

  const duplicatePreventionPrompt = existingQuestions.length > 0 
    ? `\n\n**รายการโจทย์ที่มีอยู่แล้ว (ห้ามสร้างซ้ำ):**\n- ${existingQuestions.join('\n- ')}` 
    : '';

  const prompt = `
    คำสั่ง: สร้างข้อสอบแบบเลือกตอบ (4 ตัวเลือก) จำนวน ${count} ข้อ ที่มีความสดใหม่และไม่ซ้ำซ้อน
    ระดับชั้น: ${grade} (${levelName})
    วิชา: ${subject}
    หัวข้อ: ${topic}
    
    **ข้อกำหนดพิเศษ**:
    - อ้างอิงแนวทางและระดับความยากจากข้อสอบจริง (Blueprint) ตั้งแต่ปี พ.ศ. 2560 ถึง 2567
    - รูปแบบข้อสอบ: ${
      style === 'nt' ? 'เน้นมาตรฐาน NT (เน้นการคิดวิเคราะห์เชิงเหตุผลและการนำไปใช้)' : 
      style === 'onet' ? `เน้นมาตรฐาน O-NET (${grade}) ตามแนวข้อสอบปี 60-67` : 
      `ข้อสอบทั่วไปที่ใช้หลักสูตรแกนกลาง`
    }
    ${duplicatePreventionPrompt}
    
    **กฎสำคัญในการป้องกันการซ้ำซ้อน**:
    1. ตรวจสอบ "รายการโจทย์ที่มีอยู่แล้ว" และห้ามสร้างข้อที่ซ้ำซ้อนทั้งเนื้อหาและวิธีการวัดผล
    2. ใช้ภาษาไทยที่เข้าใจง่าย เหมาะสมกับระดับชั้น
    3. ส่งกลับมาเป็น JSON Array เท่านั้น
    4. correct ต้องเป็น "1", "2", "3" หรือ "4"
  `;

  let lastError: any = null;

  // วนลูปทดสอบคีย์และโมเดลสำรองเพื่อรับมือกรณี 429 Quota Exceeded ชั่วคราว
  for (const activeKey of keyCandidates) {
    const ai = new GoogleGenAI({ apiKey: activeKey });

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: `คุณเป็นผู้เชี่ยวชาญด้านการจัดทำข้อสอบมาตรฐานระดับชาติ (NT/O-NET) ปี 2560-2567 ที่เน้นความถูกต้องและความสดใหม่ของโจทย์`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY, 
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  c1: { type: Type.STRING },
                  c2: { type: Type.STRING },
                  c3: { type: Type.STRING },
                  c4: { type: Type.STRING },
                  correct: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["text", "c1", "c2", "c3", "c4", "correct", "explanation"],
              },
            },
          },
        });

        if (response.text) {
          const data = JSON.parse(response.text.trim());
          return Array.isArray(data) ? data : [data];
        }
      } catch (error: any) {
        lastError = error;
        const errString = String(error?.message || error || '').toLowerCase();
        
        // หากเป็นข้อผิดพลาดเรื่อง Quota ชั่วคราว (429 / resource_exhausted / rate limit)
        const isQuota = errString.includes('quota') || errString.includes('429') || errString.includes('resource_exhausted');
        const isNotFoundOrUnsupported = errString.includes('not found') || errString.includes('unsupported') || errString.includes('deprecated');

        if (isQuota || isNotFoundOrUnsupported) {
          console.warn(`[AI Engine] Model ${modelName} hit limit or error (${errString.substring(0, 100)}...), trying next fallback model...`);
          // รอ 1 วินาทีสั้นๆ เพื่อให้ Rate limit รีเซ็ต
          await new Promise(res => setTimeout(res, 1000));
          continue; // ลองโมเดลถัดไป
        }

        // หากเป็นปัญหาคีย์ไม่ถูกต้องหรือโดนยกเลิก ข้ามไปคีย์ถัดไป
        if (errString.includes('api key not found') || errString.includes('403') || errString.includes('invalid') || errString.includes('api_key_invalid')) {
          console.warn(`[AI Engine] Key invalid, attempting next candidate key...`);
          break; // ข้ามไปลอง candidate key อื่น
        }

        // ข้อผิดพลาดอื่นๆ ลองโมเดลถัดไป
        continue;
      }
    }
  }

  // หากทดลองทุกโมเดลและทุกคีย์แล้วยังไม่สำเร็จ แสดงข้อความแจ้งเตือนที่ชัดเจน
  const finalErrorMsg = String(lastError?.message || lastError || '');
  if (finalErrorMsg.includes('quota') || finalErrorMsg.includes('429') || finalErrorMsg.includes('resource_exhausted')) {
    throw new Error(
      "ขณะนี้โควต้าของ Gemini API ชั่วคราวเต็ม (เกิน 15 ครั้ง/นาที หรือโควต้าประจำวัน)\n" +
      "คำแนะนำ:\n" +
      "1. กรุณารอประมาณ 30-60 วินาที แล้วกดสร้างใหม่อีกครั้ง\n" +
      "2. ตรวจสอบว่าคุณครูสร้าง API Key จาก Google Account ของตนเองที่ aistudio.google.com (เพื่อไม่ให้แชร์โควต้าปะปนกับผู้อื่น)\n" +
      "3. สามารถใส่ API Key สำรองคั่นด้วยเครื่องหมายจุลภาค (,) ได้ที่หน้าข้อมูลโปรไฟล์ของคุณครูครับ"
    );
  }

  if (finalErrorMsg.includes('api key') || finalErrorMsg.includes('403') || finalErrorMsg.includes('invalid')) {
    throw new Error("API Key ไม่ถูกต้องหรือถูกระงับสิทธิ์ กรุณาสร้าง API Key ใหม่จาก Google AI Studio แล้วบันทึกที่หน้าโปรไฟล์ครับ");
  }

  throw new Error(finalErrorMsg || "เกิดข้อผิดพลาดในการเชื่อมต่อ AI เพื่อสร้างข้อสอบ");
};