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

/**
 * สร้างข้อสอบด้วย AI สำหรับโรงเรียนประถมและขยายโอกาส
 * เน้นอ้างอิงแนวข้อสอบจริงปี 2560 - 2567
 */
export const generateQuestionWithAI = async (
  subject: string,
  grade: string,
  topic: string,
  count: number = 5,
  style: 'normal' | 'onet' | 'nt' | 'exam' = 'normal',
  existingQuestions: string[] = []
): Promise<GeneratedQuestion[] | null> => {
  
  // 🟢 อ่าน API Key จาก LocalStorage เป็นอันดับแรกก่อนเสมอ
  // เพื่อให้แน่ใจว่าคีย์ใหม่ที่คุณครูบันทึกใหม่สดๆ จะถูกนำมาใช้งานทันที (แทนที่คีย์เดิมที่อาจหมดอายุแล้วใน memory)
  const storageKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('MST_CUSTOM_GEMINI_KEY') : null) || '';
  const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  
  // 🎯 ให้ความสำคัญกับ storageKey (คีย์ที่คุณครูบันทึกในเครื่อง) ก่อน envKey
  const rawKey = storageKey || envKey || '';

  // อัปเดต process.env ให้เป็นคีย์ล่าสุดเสมอกัน
  if (typeof process !== 'undefined' && process.env) {
    process.env.API_KEY = rawKey;
  }
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    (window as any).process.env.API_KEY = rawKey;
  }
  
  if (!rawKey) {
    throw new Error("ไม่พบ API Key กรุณาตั้งค่าที่หน้า 'ข้อมูลของฉัน' (ในส่วนโปรไฟล์คุณครู) ก่อนใช้งาน AI ครับ");
  }

  // 🧹 Auto-sanitize the API key to fix any copy-paste issues (like em-dash "—", trailing dividers, or spaces)
  let finalKey = rawKey
    .trim()
    .replace(/[\u2014\u2015\u2500]/g, '--') // Replace em-dash, horizontal bar with "--"
    .replace(/[\u2013\u2212]/g, '-');      // Replace en-dash, minus with "-"

  // Strip common trailing dividers like multiple hyphens/dashes (e.g. "—----------------")
  finalKey = finalKey.replace(/[-─—]{3,}$/, '');

  // Remove all whitespaces and other invalid characters (keeping only letters, digits, underscores, periods, and hyphens)
  finalKey = finalKey.replace(/\s+/g, '').replace(/[^\w\.\-]/g, '');

  const ai = new GoogleGenAI({ apiKey: finalKey });
  const modelName = 'gemini-flash-latest';
  
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
    return null;
  } catch (error: any) {
    console.error("AI Error:", error);
    
    const errorMsg = error?.message || "";
    
    if (errorMsg.includes('API key not found') || errorMsg.includes('403') || errorMsg.includes('invalid') || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('expired')) {
      throw new Error("API Key ไม่ถูกต้อง หมดอายุ หรือสิทธิ์เข้าถึงถูกยกเลิก กรุณาไปที่หน้า 'ข้อมูลของฉัน' ในโปรไฟล์คุณครู เพื่อสร้าง API Key ใหม่มาบันทึกเปลี่ยนใช้งานครับ");
    }
    
    if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("โควต้าการใช้งาน API Key เดิมเต็มแล้ว/หมดอายุแล้ว กรุณารอสักครู่ แล้วลองใหม่ หรือสร้าง API Key ใหม่มาบันทึกสลับเปลี่ยนที่หน้าโปรไฟล์ครับ");
    }

    throw new Error(errorMsg || "เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
  }
};