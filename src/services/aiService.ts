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
  indicator?: string;
  yearRef?: string;
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

// Available active Gemini models with prioritized fallback:
// Uses modern recommended models from @google/genai SDK
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-3.8-flash'
];

export interface OnetExamGenerationParams {
  level: 'P6' | 'M3' | 'P3';
  subject: string;
  count?: number;
  yearRange?: string; // e.g. '2560-2568', '2567-2568', '2565-2566', '2560-2564'
  mode?: 'blueprint' | 'custom_topic';
  customTopic?: string;
  existingQuestions?: string[];
}

function getSubjectBlueprintGuide(subject: string, level: 'P6' | 'M3' | 'P3'): string {
  if (level === 'P3') {
    if (subject.includes('คณิต') || subject.includes('คำนวณ')) {
      return `Test Blueprint สทศ. ด้านคณิตศาสตร์ (NT ป.3): 
      - สาระที่ 1 จำนวนและพีชคณิต: การบวก ลบ คูณ หารระคน ไม่เกิน 100,000, แบบรูปของจำนวน, เศษส่วนที่มีตัวเศษเท่ากันหรือตัวส่วนเท่ากัน
      - สาระที่ 2 การวัดและเรขาคณิต: เวลา (นาฬิกา ปฏิทิน), เงินและบันทึกรายรับรายจ่าย, ความยาว/ระยะทาง, น้ำหนัก, ปริมาตรและความจุ, รูปเรขาคณิตสองมิติ (แกนสมมาตร)
      - สาระที่ 3 สถิติและความน่าจะเป็น: แผนภูมิรูปภาพ แผนภูมิแท่งและการอ่านข้อมูล`;
    }
    return `Test Blueprint สทศ. ด้านภาษาไทย (NT ป.3):
    - สาระที่ 1 การอ่าน: อ่านออกเสียง อ่านข้อความ นิทาน บทความสั้น การจับใจความสำคัญ การคาดคะเนเหตุการณ์
    - สาระที่ 2 การเขียน: การเขียนบรรยาย เขียนสรุปความ เขียนสะกดคำ
    - สาระที่ 3 การฟัง ดู พูด: การตอบคำถามจากเรื่องที่ฟังและดู การแยกข้อเท็จจริงและข้อคิดเห็น
    - สาระที่ 4 หลักภาษา: มาตราตัวสะกด วรรณยุกต์ คำควบกล้ำ อักษรนำ คำคล้องจอง ชนิดของคำ`;
  }

  if (subject.includes('คณิต')) {
    if (level === 'P6') {
      return `Test Blueprint สทศ. คณิตศาสตร์ O-NET ป.6:
      - สาระที่ 1 จำนวนและพีชคณิต: ตัวประกอบของจำนวนนับ, ห.ร.ม. และ ค.ร.น., เศษส่วนและการบวก ลบ คูณ หารระคนของเศษส่วน, ทศนิยมและความสัมพันธ์, ร้อยละ/เปอร์เซ็นต์/กำไรขาดทุน, อัตราส่วนและมาตราส่วน, แบบรูปและความสัมพันธ์
      - สาระที่ 2 การวัดและเรขาคณิต: รูปเรขาคณิตสองมิติ (ชนิด มุม ผลบวกมุมภายใน สมบัติของรูปสามเหลี่ยม สี่เหลี่ยม วงกลม), พื้นที่และความยาวรอบรูปสามเหลี่ยม สี่เหลี่ยม วงกลม, รูปเรขาคณิตสามมิติ (ทรงกลม ทรงกระบอก กรวย ปริซึม พีระมิด รูปคลี่), ปริมาตรและความจุทรงสี่เหลี่ยมมุมฉาก
      - สาระที่ 3 สถิติและความน่าจะเป็น: การอ่านแผนภูมิแท่งเปรียบเทียบ แผนภูมิวงกลม, การแก้โจทย์ปัญหาเกี่ยวกับสถิติ`;
    } else {
      return `Test Blueprint สทศ. คณิตศาสตร์ O-NET ม.3:
      - สาระที่ 1 จำนวนและพีชคณิต: จำนวนจริง เลขยกกำลัง พหุนามและการแยกตัวประกอบ สมการเชิงเส้นตัวแปรเดียวและสองตัวแปร ระบบสมการ ฟังก์ชันกำลังสอง อสมการเชิงเส้น
      - สาระที่ 2 การวัดและเรขาคณิต: พื้นที่ผิวและปริมาตร (ปริซึม ทรงกระบอก พีระมิด กรวย ทรงกลม), ทฤษฎีบทพีทาโกรัสและความคล้าย, อัตราส่วนตรีโกณมิติ, วงกลมและมุมในวงกลม, การแปลงทางเรขาคณิต
      - สาระที่ 3 สถิติและความน่าจะเป็น: มัธยฐาน ฐานนิยม ค่าเฉลี่ย ควอร์ไทล์ แผนภาพกล่อง ความน่าจะเป็นของเหตุการณ์`;
    }
  }

  if (subject.includes('วิทย์')) {
    if (level === 'P6') {
      return `Test Blueprint สทศ. วิทยาศาสตร์ O-NET ป.6:
      - สาระที่ 1 วิทยาศาสตร์ชีวภาพ: การเจริญเติบโตของร่างกายและสารอาหาร, ระบบย่อยอาหาร, ระบบหายใจ, ระบบหมุนเวียนเลือด, การปรับตัวของสิ่งมีชีวิต, ห่วงโซ่อาหารและสายใยอาหาร, การสืบพันธุ์และการถ่ายทอดลักษณะทางพันธุกรรม
      - สาระที่ 2 วิทยาศาสตร์กายภาพ: สมบัติทางกายภาพของสาร (ความยืดหยุ่น ความเหนียว ความแข็ง การนำความร้อน/ไฟฟ้า), การจำแนกสาร, การแยกสารเนื้อผสม (การกรอง การร่อน การระเหิด การใช้แม่เหล็ก), แรงไฟฟ้า วงจรไฟฟ้าอย่างง่าย แม่เหล็กไฟฟ้า, แรงเสียดทาน แรงพยุง แสงและเงา การเกิดภาพ
      - สาระที่ 3 วิทยาศาสตร์โลกและอวกาศ: ดิน หิน และวัฏจักรของหิน, ซากดึกดำบรรพ์, ปรากฏการณ์ทางดาราศาสตร์ (สุริยุปราคา จันทรุปราคา ข้างขึ้นข้างแรม ฤดูกาล), ระบบสุริยะและเทคโนโลยีอวกาศ, ลมฟ้าอากาศ ลมบก ลมทะเล มรสุม ภัยธรรมชาติ (น้ำท่วม แผ่นดินไหว สึนามิ) ภาวะโลกร้อน
      - สาระที่ 4 เทคโนโลยี: วิทยาการคำนวณ การใช้เหตุผลเชิงตรรกะ การออกแบบอัลกอริทึม การค้นหาข้อมูลและความปลอดภัยทางไซเบอร์`;
    } else {
      return `Test Blueprint สทศ. วิทยาศาสตร์ O-NET ม.3:
      - สาระที่ 1 ชีวภาพ: พันธุศาสตร์ โครโมโซม DNA การกลายพันธุ์ ระบบนิเวศ การสังเคราะห์ด้วยแสงและการลำเลียงในพืช อวัยวะในร่างกาย
      - สาระที่ 2 กายภาพ: อนุภาคของสาร ธาตุและสารประกอบ ปฏิกิริยาเคมี การเคลื่อนที่และแรง งานและพลังงาน คลื่นแม่เหล็กไฟฟ้า วงจรไฟฟ้ากระแสตรง
      - สาระที่ 3 โลกและอวกาศ: โครงสร้างโลก การเคลื่อนที่ของแผ่นธรณี แหล่งน้ำ ธรณีพิบัติภัย ดาราศาสตร์ดาวเคราะห์ ดาราจักร เอกภพ`;
    }
  }

  if (subject.includes('ไทย')) {
    return `Test Blueprint สทศ. ภาษาไทย (${level === 'P6' ? 'O-NET ป.6' : level === 'M3' ? 'O-NET ม.3' : 'NT ป.3'}):
    - สาระที่ 1 การอ่าน: การอ่านจับใจความสำคัญจากบทความ นิทาน ข่าว ข้อคิดเห็น, การวิเคราะห์จุดประสงค์ของผู้เขียน, การแปลความหมายของคำและข้อความที่มีความหมายโดยนัย
    - สาระที่ 2 การเขียน: การเขียนคำขวัญ, การเขียนสื่อสาร, การกรอกแบบรายการ, การเขียนเรียงความ/ย่อความ
    - สาระที่ 3 การฟัง ดู พูด: การวิเคราะห์ข้อเท็จจริงและข้อคิดเห็น, การประเมินความน่าเชื่อถือของสื่อโฆษณา
    - สาระที่ 4 หลักการใช้ภาษา: ชนิดและหน้าที่ของคำ (คำนาม สรรพนาม กริยา วิเศษณ์ บุพบท สันธาน อุทาน), คำราชาศัพท์, คำยืมภาษาต่างประเทศ (บาลี สันสกฤต เขมร จีน อังกฤษ), ประโยค (ประโยคความเดียว ความรวม ความซ้อน), สำนวน สุภาษิต คำพังเพย, คำสมาส คำสนธิ, การแต่งบทร้อยกรอง (กลอนสุภาพ กาพย์ยานี)
    - สาระที่ 5 วรรณคดีและวรรณกรรม: การวิเคราะห์คุณค่าและข้อคิดจากวรรณคดีบทเรียน (เช่น ขุนช้างขุนแผน รามเกียรติ์ สังข์ทอง นิราศภูเขาทอง พระอภัยมณี)`;
  }

  if (subject.includes('อังกฤษ') || subject.toLowerCase().includes('english')) {
    return `Test Blueprint สทศ. ภาษาอังกฤษ (${level === 'P6' ? 'O-NET ป.6' : level === 'M3' ? 'O-NET ม.3' : 'NT ป.3'}):
    - สาระที่ 1 ภาษาเพื่อการสื่อสาร (Communication): Situational Dialogues ในชีวิตประจำวันและในโรงเรียน, การอ่านป้ายประกาศ เครื่องหมาย สัญลักษณ์, แผนผัง แผนที่ กราฟิก, บทความสั้นและนิทานพร้อมคำถาม Who, What, Where, When, Why, How
    - สาระที่ 2 ภาษาและวัฒนธรรม: เทศกาล วัฒนธรรม ประเพณีสากลและไทย (Christmas, Halloween, Thanksgiving, New Year, Songkran, Loy Krathong), มารยาทสังคมและการทักทาย
    - สาระที่ 3 ภาษากับความรู้กลุ่มอื่น: คำศัพท์วิทยาศาสตร์ คณิตศาสตร์ สังคม และสุขศึกษาในภาษาอังกฤษ
    - สาระที่ 4 ภาษากับชุมชนและโลก: ไวยากรณ์สำคัญ (Tenses, Prepositions, Pronouns, Adjectives เปรียบเทียบขั้นกว่าและขั้นสุด, คำเชื่อม, Modal verbs)`;
  }

  return `หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน และ Test Blueprint สทศ. (NIETS) ครอบคลุมตัวชี้วัดสำคัญ`;
}

/**
 * 🎯 สร้างข้อสอบ O-NET / NT อัตโนมัติตามคลังข้อสอบจริง สทศ. (ปีการศึกษา 2560 - 2568)
 * โดยไม่ต้องให้คุณครูพิมพ์เนื้อหารายละเอียดเอง AI จะจัดโครงสร้างตาม Test Blueprint
 * และปรับเปลี่ยนข้อความ/ตัวเลข (AI Paraphrase) เพื่อสร้างข้อสอบเสมือนจริงที่สดใหม่ ไม่ซ้ำ
 */
export const generateOnetExamWithAI = async (
  params: OnetExamGenerationParams
): Promise<GeneratedQuestion[] | null> => {
  const {
    level,
    subject,
    count = 10,
    yearRange = '2560-2568',
    mode = 'blueprint',
    customTopic = '',
    existingQuestions = []
  } = params;

  const storageKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('MST_CUSTOM_GEMINI_KEY') : null) || '';
  const envKey = (typeof process !== 'undefined' && process.env) ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '';
  const rawKeyCombined = storageKey || envKey || '';

  if (!rawKeyCombined) {
    throw new Error("ไม่พบ API Key กรุณาไปที่หน้า 'ข้อมูลของฉัน' (โปรไฟล์คุณครู) แล้วบันทึก API Key ของท่านก่อนใช้งานสร้างข้อสอบครับ");
  }

  const keyCandidates = rawKeyCombined
    .split(/[\n,;]+/)
    .map(k => sanitizeKey(k))
    .filter(k => k.length >= 20 && (k.startsWith('AIza') || k.startsWith('AQ')));

  if (keyCandidates.length === 0) {
    const single = sanitizeKey(rawKeyCombined);
    if (single) keyCandidates.push(single);
  }

  if (keyCandidates.length === 0) {
    throw new Error("รูปแบบ API Key ไม่ถูกต้อง กรุณาตรวจสอบและบันทึก API Key ใหม่ในหน้าโปรไฟล์ครับ");
  }

  const examTypeLabel = level === 'P3' ? 'NT (ป.3)' : level === 'M3' ? 'O-NET (ม.3)' : 'O-NET (ป.6)';
  const blueprintGuide = getSubjectBlueprintGuide(subject, level);

  const duplicatePrompt = existingQuestions.length > 0
    ? `\n\n**รายการข้อสอบเดิมที่มีอยู่แล้ว (ห้ามซ้ำซ้อน):**\n- ${existingQuestions.slice(-20).join('\n- ')}`
    : '';

  const topicDirective = mode === 'custom_topic' && customTopic.trim()
    ? `เน้นหัวข้อเฉพาะ: ${customTopic.trim()}`
    : `สร้างข้อสอบแบบคละสาระสำคัญและกระจายตัวชี้วัดตาม Test Blueprint สทศ. อย่างสมดุล (ไม่ต้องเจาะจงเฉพาะเรื่องเดียว)`;

  const prompt = `
    คำสั่งระดับสูง: คุณเป็นผู้เชี่ยวชาญการออกข้อสอบระดับชาติ สทศ. (NIETS) และสำนักทดสอบทางการศึกษา (สพฐ.)
    สร้างข้อสอบปรนัย 4 ตัวเลือก จำนวน ${count} ข้อ สำหรับการติวเตรียมสอบ ${examTypeLabel}
    วิชา: ${subject}
    ช่วงปีข้อสอบอ้างอิง: คลังข้อสอบจริงของ สทศ. ตั้งแต่ปีการศึกษา 2560 จนถึงปีการศึกษา 2568 ล่าสุด (${yearRange})
    
    แนวทางเนื้อหาและ Test Blueprint:
    ${blueprintGuide}
    
    ข้อกำหนดในการออกข้อสอบ:
    1. ${topicDirective}
    2. เทคนิค AI Paraphrasing: ให้ค้นหาและอ้างอิงจากโครงสร้างข้อสอบจริงของ O-NET/NT สทศ. ปี 2560 ถึง 2568 แล้วทำการ "ปรับเปลี่ยนข้อความ ตัวละคร ตัวเลข หรือบริบทในโจทย์" เพื่อให้ได้ข้อสอบใหม่ที่มีคุณภาพระดับเดียวกัน วัดทักษะการคิดวิเคราะห์ (Higher-Order Thinking) แบบเดียวกับข้อสอบจริง 100% แต่ไม่ซ้ำเดิมคำต่อคำ
    3. ตัวเลือก 4 ตัวเลือก (c1, c2, c3, c4) ต้องมีตัวลวงที่สมเหตุสมผลตามหลักสถิติข้อสอบ สทศ.
    4. correct ต้องเป็น "1", "2", "3" หรือ "4"
    5. explanation ต้องอธิบายวิธีทำและเฉลยอย่างละเอียด แสดงขั้นตอนการคิดคำนวณ หรือหลักเกณฑ์ทางวิชาการ เพื่อให้คุณครูนำไปสอนติวนักเรียนได้ทันที
    6. indicator: ระบุรหัสตัวชี้วัดหรือสาระการเรียนรู้ (เช่น "ค 1.1 ป.6/1", "ว 2.1 ป.6/2", "ท 1.1 ป.6/3", "ต 1.1 ป.6/4")
    7. yearRef: ระบุแนวข้อสอบปีที่อ้างอิง เช่น "แนว O-NET ปี 2568", "แนว O-NET ปี 2567", "แนว O-NET ปี 2566"
    ${duplicatePrompt}

    ส่งผลลัพธ์กลับมาเป็น JSON Array เท่านั้น
  `;

  let lastError: any = null;

  for (const activeKey of keyCandidates) {
    const ai = new GoogleGenAI({ apiKey: activeKey });

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: `คุณเป็นคณะกรรมการผู้ทรงคุณวุฒิในการออกข้อสอบ O-NET และ NT ของ สทศ. ปีการศึกษา 2560-2568 เน้นความถูกต้องทางวิชาการ 100% และคำอธิบายเฉลยที่ชัดเจนสำหรับครูและนักเรียน`,
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
                  explanation: { type: Type.STRING },
                  indicator: { type: Type.STRING },
                  yearRef: { type: Type.STRING },
                },
                required: ["text", "c1", "c2", "c3", "c4", "correct", "explanation"],
              },
            },
          },
        });

        if (response.text) {
          let cleanedText = response.text.trim();
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          const data = JSON.parse(cleanedText);
          return Array.isArray(data) ? data : [data];
        }
      } catch (error: any) {
        lastError = error;
        let errString = '';
        if (typeof error === 'string') {
          errString = error.toLowerCase();
        } else if (error?.message) {
          errString = (error.message + ' ' + (error.status || '')).toLowerCase();
        } else {
          try {
            errString = JSON.stringify(error).toLowerCase();
          } catch {
            errString = String(error).toLowerCase();
          }
        }

        const isHighDemand = errString.includes('503') || 
                             errString.includes('unavailable') || 
                             errString.includes('high demand') || 
                             errString.includes('spikes in demand') ||
                             errString.includes('overloaded');

        const isQuota = errString.includes('quota') || 
                        errString.includes('429') || 
                        errString.includes('resource_exhausted');

        const isNotFoundOrUnsupported = errString.includes('not found') || 
                                        errString.includes('unsupported') || 
                                        errString.includes('deprecated') || 
                                        errString.includes('404');

        if (isHighDemand || isQuota || isNotFoundOrUnsupported) {
          console.warn(`[AI Engine] Model ${modelName} fallback: ${errString.substring(0, 100)}`);
          await new Promise(res => setTimeout(res, 500));
          continue;
        }

        if (errString.includes('api key not found') || errString.includes('403') || errString.includes('invalid') || errString.includes('api_key_invalid')) {
          break;
        }

        continue;
      }
    }
  }

  const finalErrorMsg = String(lastError?.message || lastError || '');
  if (finalErrorMsg.includes('503') || finalErrorMsg.includes('high demand') || finalErrorMsg.includes('unavailable')) {
    throw new Error("เซิร์ฟเวอร์ Gemini AI ของ Google กำลังประมวลผลหนาแน่น กรุณากดปุ่มสร้างข้อสอบอีกครั้งครับ");
  }
  if (finalErrorMsg.includes('quota') || finalErrorMsg.includes('429')) {
    throw new Error("โควต้า Gemini API เต็มชั่วคราว กรุณารอ 30 วินาที หรือตรวจสอบ API Key ในหน้าข้อมูลของฉันครับ");
  }
  throw new Error(finalErrorMsg || "เกิดข้อผิดพลาดในการเชื่อมต่อ AI เพื่อสร้างข้อสอบ O-NET");
};

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
          let cleanedText = response.text.trim();
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          const data = JSON.parse(cleanedText);
          return Array.isArray(data) ? data : [data];
        }
      } catch (error: any) {
        lastError = error;
        let errString = '';
        if (typeof error === 'string') {
          errString = error.toLowerCase();
        } else if (error?.message) {
          errString = (error.message + ' ' + (error.status || '')).toLowerCase();
        } else {
          try {
            errString = JSON.stringify(error).toLowerCase();
          } catch {
            errString = String(error).toLowerCase();
          }
        }
        
        // 1. ตรวจสอบกรณีเซิร์ฟเวอร์ Google มีผู้ใช้งานหนาแน่นชั่วคราว (Code 503 / High Demand / Unavailable)
        const isHighDemand = errString.includes('503') || 
                             errString.includes('unavailable') || 
                             errString.includes('high demand') || 
                             errString.includes('spikes in demand') ||
                             errString.includes('overloaded');

        // 2. ตรวจสอบกรณีโควต้าชนขีดจำกัดชั่วคราว (Code 429 / Rate Limit / Resource Exhausted)
        const isQuota = errString.includes('quota') || 
                        errString.includes('429') || 
                        errString.includes('resource_exhausted');

        // 3. ตรวจสอบกรณีโมเดลไม่พร้อมให้บริการหรือไม่รองรับ
        const isNotFoundOrUnsupported = errString.includes('not found') || 
                                        errString.includes('unsupported') || 
                                        errString.includes('deprecated') || 
                                        errString.includes('404');

        if (isHighDemand || isQuota || isNotFoundOrUnsupported) {
          console.warn(`[AI Engine] Model ${modelName} encountered issue: ${errString.substring(0, 100)}. Trying fallback model...`);
          // หน่วงเวลาสั้นๆ 500ms
          await new Promise(res => setTimeout(res, 500));
          continue; // สลับไปลองโมเดลตัวถัดไปในลิสต์
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
  
  if (finalErrorMsg.includes('503') || finalErrorMsg.includes('high demand') || finalErrorMsg.includes('unavailable')) {
    throw new Error(
      "ขณะนี้เซิร์ฟเวอร์ Gemini AI ของ Google มีผู้ใช้งานหนาแน่นชั่วคราว (High Demand / Code 503)\n" +
      "คำแนะนำ: กรุณากดปุ่มสร้างข้อสอบอีกครั้งได้เลยครับ ระบบจะเชื่อมต่อใหม่อัตโนมัติ"
    );
  }

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