import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ---------------------------------------------------------------------------
// 📁 File Database Setup (Fallback when MySQL is not connected)
// ---------------------------------------------------------------------------
const DB_FILE = path.join(process.cwd(), 'db.json');

function initLocalDb() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      app_settings: [{ id: 1, logo_url: 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png', app_name: 'Pratom Smart Tutor' }],
      schools: [
        { id: 1, name: 'โรงเรียนสาธิตรวมใจ', school_code: 'DEMO123', status: 'active', allow_all_manage_students: 0 }
      ],
      classrooms: [
        { id: 1, school: 'โรงเรียนสาธิตรวมใจ', grade_level: 'P3', room_number: '1', name: 'P3/1' },
        { id: 2, school: 'โรงเรียนสาธิตรวมใจ', grade_level: 'P6', room_number: '1', name: 'P6/1' }
      ],
      students: [
        { id: '11111', name: 'น้องดอม เรียนดี', username: 'student1', password: 'password123', school: 'โรงเรียนสาธิตรวมใจ', grade: 'P6', classroom: '1', stars: 10, inventory: '[]', login_count: 0, last_login: 0 },
        { id: '22222', name: 'น้องมะลิ สดใส', username: 'student2', password: 'password123', school: 'โรงเรียนสาธิตรวมใจ', grade: 'P3', classroom: '1', stars: 5, inventory: '[]', login_count: 0, last_login: 0 }
      ],
      teachers: [
        { id: 'admin-sys-id', username: 'admin', password: 'password123', name: 'System Administrator', school: 'โรงเรียนสาธิตรวมใจ', citizen_id: '0000000000000', role: 'SUPER_ADMIN', status: 'active', position: 'ผู้ดูแลระบบ', grade_level: 'ALL', login_count: 0, last_login: 0 },
        { id: 't1', username: 'teacher1', password: 'password123', name: 'คุณครูสมศรี ใจดี', school: 'โรงเรียนสาธิตรวมใจ', citizen_id: '1234567890123', role: 'SCHOOL_ADMIN', status: 'active', position: 'ครูประจำชั้น', grade_level: 'ALL', login_count: 0, last_login: 0 }
      ],
      subjects: [
        { id: 'sub1', name: 'ภาษาไทย', school: 'โรงเรียนสาธิตรวมใจ', teacher_id: 't1', grade: 'P6', target_classrooms: '["P6/1"]', target_classroom_ids: '[]', icon: 'Book', color: 'pink' },
        { id: 'sub2', name: 'คณิตศาสตร์', school: 'โรงเรียนสาธิตรวมใจ', teacher_id: 't1', grade: 'P6', target_classrooms: '["P6/1"]', target_classroom_ids: '[]', icon: 'Calculator', color: 'indigo' },
        { id: 'sub3', name: 'NT คณิตศาสตร์', school: 'โรงเรียนสาธิตรวมใจ', teacher_id: 't1', grade: 'P3', target_classrooms: '["P3/1"]', target_classroom_ids: '[]', icon: 'Trophy', color: 'emerald' },
        { id: 'sub4', name: 'O-NET ภาษาไทย', school: 'โรงเรียนสาธิตรวมใจ', teacher_id: 't1', grade: 'P6', target_classrooms: '["P6/1"]', target_classroom_ids: '[]', icon: 'Trophy', color: 'blue' }
      ],
      assignments: [
        { id: 'a1', school: 'โรงเรียนสาธิตรวมใจ', subject: 'คณิตศาสตร์', grade: 'P6', question_count: 2, deadline: '2026-12-31', created_by: 'คุณครูสมศรี ใจดี', title: 'แบบฝึกหัดการบวกเลข', target_classrooms: '["P6/1"]', target_classroom_ids: '[]', category: 'GENERAL', status: 'OPEN' }
      ],
      questions: [
        { id: 'q1', subject: 'คณิตศาสตร์', grade: 'P6', text: '5 + 5 เท่ากับเท่าไหร่?', image: '', choices: '[{"id":"1","text":"8"},{"id":"2","text":"9"},{"id":"3","text":"10"},{"id":"4","text":"11"}]', correct_choice_id: '3', explanation: 'เพราะ 5 + 5 = 10', school: 'โรงเรียนสาธิตรวมใจ', teacher_id: 't1', assignment_id: 'a1', target_classrooms: '[]', target_classroom_ids: '[]', unit: '' },
        { id: 'q2', subject: 'คณิตศาสตร์', grade: 'P6', text: '12 x 12 เท่ากับเท่าไหร่?', image: '', choices: '[{"id":"1","text":"120"},{"id":"2","text":"144"},{"id":"3","text":"132"},{"id":"4","text":"156"}]', correct_choice_id: '2', explanation: '12 คูณ 12 ได้ 144', school: 'โรงเรียนสาธิตรวมใจ', teacher_id: 't1', assignment_id: 'a1', target_classrooms: '[]', target_classroom_ids: '[]', unit: '' }
      ],
      exam_results: [] as any[],
      registration_requests: [] as any[]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function getJsonDb() {
  initLocalDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveJsonDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// 🟢 MySQL Database Connection Pool
// ---------------------------------------------------------------------------
let pool: mysql.Pool | null = null;
const useMySQL = !!process.env.DB_HOST;

if (useMySQL) {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4_unicode_ci'
    });
    console.log("⚡ MySQL connection pool initialized using host:", process.env.DB_HOST);
  } catch (err) {
    console.error("❌ Failed to connect to MySQL, fallback to JSON DB:", err);
    pool = null;
  }
} else {
  console.log("ℹ️ No DB_HOST env found, running in Auto-Healing JSON Database Fallback mode.");
}

// Helper query function
async function query(sql: string, params: any[] = []): Promise<any> {
  if (pool) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
  throw new Error("MySQL Pool is not initialized");
}

// UUID helper
function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to safe parse JSON
const safeJsonParse = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
        try { 
            const parsed = JSON.parse(input);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }
    return [];
};

// 🛡️ Auto-Healing Super Admin Account Restorer
async function ensureSuperAdminsExist() {
  try {
    if (pool) {
      try {
        const checkTable: any = await query("SHOW TABLES LIKE 'teachers'");
        if (checkTable && checkTable.length > 0) {
          const teachers: any = await query("SELECT * FROM `teachers` WHERE `role` = 'SUPER_ADMIN'");
          const hasAdmin = teachers.some((t: any) => t.username === 'admin');
          const hasPeyarm = teachers.some((t: any) => t.username === 'peyarm');

          if (!hasAdmin) {
            console.log("🛡️ Auto-Healing: Seeding default super admin 'admin' into MySQL...");
            await query(`INSERT IGNORE INTO \`teachers\` (\`id\`, \`username\`, \`password\`, \`name\`, \`school\`, \`citizen_id\`, \`role\`, \`status\`, \`position\`, \`grade_level\`) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                         ['admin-sys-id', 'admin', 'password123', 'System Administrator', 'โรงเรียนสาธิตรวมใจ', '0000000000000', 'SUPER_ADMIN', 'active', 'ผู้ดูแลระบบ', 'ALL']);
          }
          if (!hasPeyarm) {
            console.log("🛡️ Auto-Healing: Seeding requested super admin 'peyarm' into MySQL...");
            await query(`INSERT IGNORE INTO \`teachers\` (\`id\`, \`username\`, \`password\`, \`name\`, \`school\`, \`citizen_id\`, \`role\`, \`status\`, \`position\`, \`grade_level\`) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                         ['super-admin-peyarm', 'peyarm', 'Siam@2520', 'Super Admin (peyarm)', 'โรงเรียนทั่วไป', '1111111111111', 'SUPER_ADMIN', 'active', 'ผู้ดูแลระบบสูงสุด', 'ALL']);
          }
        }
      } catch (err) {
        console.error("❌ MySQL check/seed for teachers table failed:", err);
      }
    }
    
    // Also heal JSON DB fallback
    try {
      const db = getJsonDb();
      if (!db.teachers) {
        db.teachers = [];
      }
      const hasAdminJson = db.teachers.some((t: any) => t.username === 'admin');
      const hasPeyarmJson = db.teachers.some((t: any) => t.username === 'peyarm');
      
      let updated = false;
      if (!hasAdminJson) {
        db.teachers.push({ id: 'admin-sys-id', username: 'admin', password: 'password123', name: 'System Administrator', school: 'โรงเรียนสาธิตรวมใจ', citizen_id: '0000000000000', role: 'SUPER_ADMIN', status: 'active', position: 'ผู้ดูแลระบบ', grade_level: 'ALL', login_count: 0, last_login: 0 });
        updated = true;
      }
      if (!hasPeyarmJson) {
        db.teachers.push({ id: 'super-admin-peyarm', username: 'peyarm', password: 'Siam@2520', name: 'Super Admin (peyarm)', school: 'โรงเรียนทั่วไป', citizen_id: '1111111111111', role: 'SUPER_ADMIN', status: 'active', position: 'ผู้ดูแลระบบสูงสุด', grade_level: 'ALL', login_count: 0, last_login: 0 });
        updated = true;
      }
      if (updated) {
        saveJsonDb(db);
      }
    } catch (err) {
      console.error("❌ Local JSON DB auto-healing check failed:", err);
    }
  } catch (error) {
    console.error("❌ General error in ensureSuperAdminsExist:", error);
  }
}

// ---------------------------------------------------------------------------
// 🚪 Consolidated Unified Action Endpoint for React Application
// ---------------------------------------------------------------------------
app.post('/api', async (req, res) => {
  const { action, ...args } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Action parameter is required' });
  }

  // Ensure Super Admins always exist on every API request
  await ensureSuperAdminsExist();

  try {
    // ----------------- USE MYSQL DATABASE -----------------
    if (pool) {
      switch (action) {
        case 'supabaseQuery': {
          const { table, operation, selectFields, filterField, filterVal, isSingle, orderCol, limitNum, payload } = args;
          try {
            if (operation === 'select') {
              let sql = `SELECT ${selectFields || '*'} FROM \`${table}\``;
              const params: any[] = [];
              if (filterField && filterVal !== null) {
                sql += ` WHERE \`${filterField}\` = ?`;
                params.push(filterVal);
              }
              if (orderCol) {
                sql += ` ORDER BY \`${orderCol}\` ASC`;
              }
              if (limitNum) {
                sql += ` LIMIT ?`;
                params.push(Number(limitNum));
              }
              
              const rows = await query(sql, params);
              if (isSingle) {
                return res.json({ data: rows && rows.length > 0 ? rows[0] : null });
              }
              return res.json({ data: rows || [] });
            }
            
            if (operation === 'insert') {
              const items = Array.isArray(payload) ? payload : [payload];
              for (const item of items) {
                const keys = Object.keys(item);
                const values = Object.values(item);
                const placeholders = keys.map(() => '?').join(',');
                const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES (${placeholders})`;
                await query(sql, values);
              }
              return res.json({ data: payload });
            }
            
            if (operation === 'update') {
              const keys = Object.keys(payload);
              const values = Object.values(payload);
              const setClause = keys.map(k => `\`${k}\` = ?`).join(',');
              const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${filterField}\` = ?`;
              await query(sql, [...values, filterVal]);
              return res.json({ success: true });
            }
            
            if (operation === 'delete') {
              const sql = `DELETE FROM \`${table}\` WHERE \`${filterField}\` = ?`;
              await query(sql, [filterVal]);
              return res.json({ success: true });
            }
          } catch (e: any) {
            console.error(`Emulator MySQL failed for table "${table}":`, e);
            return res.json({ data: null, error: e.message || String(e) });
          }
          return res.status(400).json({ error: `Unknown query operation: ${operation}` });
        }

        case 'getAppSettings': {
          const rows = await query('SELECT logo_url, app_name FROM app_settings LIMIT 1');
          if (rows && rows.length > 0) {
            return res.json({ logo_url: rows[0].logo_url, app_name: rows[0].app_name });
          }
          return res.json({ logo_url: 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png', app_name: 'Pratom Smart Tutor' });
        }

        case 'updateAppSettings': {
          const { logo_url, app_name } = args;
          await query(
            'INSERT INTO app_settings (id, logo_url, app_name) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE logo_url = ?, app_name = ?',
            [logo_url || null, app_name || null, logo_url || null, app_name || null]
          );
          return res.json({ success: true });
        }

        case 'fetchAppData': {
          const students = await query('SELECT * FROM students');
          const questions = await query('SELECT * FROM questions');
          const results = await query('SELECT * FROM exam_results');
          const assignments = await query('SELECT * FROM assignments');
          const subjects = await query('SELECT * FROM subjects');
          return res.json({ students, questions, results, assignments, subjects });
        }

        case 'getDataForStudent': {
          const { student } = args;
          const cleanSchool = String(student.school || '').trim();
          const results = await query('SELECT * FROM exam_results WHERE student_id = ? ORDER BY timestamp DESC', [student.id]);
          const assignments = await query('SELECT * FROM assignments WHERE school = ?', [cleanSchool]);
          const subjects = await query('SELECT * FROM subjects WHERE school = ?', [cleanSchool]);
          const questions = await query('SELECT * FROM questions WHERE school = ?', [cleanSchool]);
          return res.json({ results, assignments, subjects, questions });
        }

        case 'getTeacherDashboard': {
          const { school } = args;
          const cleanSchool = String(school).trim();
          const students = await query('SELECT * FROM students WHERE school = ?', [cleanSchool]);
          const results = await query('SELECT * FROM exam_results WHERE school = ? ORDER BY timestamp DESC', [cleanSchool]);
          const assignments = await query('SELECT * FROM assignments WHERE school = ?', [cleanSchool]);
          const subjects = await query('SELECT * FROM subjects WHERE school = ?', [cleanSchool]);
          const schoolRows = await query('SELECT * FROM schools WHERE name = ? LIMIT 1', [cleanSchool]);
          return res.json({
            students,
            results,
            assignments,
            subjects,
            school: schoolRows && schoolRows.length > 0 ? { ...schoolRows[0], allowAllManageStudents: schoolRows[0].allow_all_manage_students } : null
          });
        }

        case 'saveScore': {
          const { studentId, studentName, school, score, total, subject, assignmentId, category, earnedStars, details } = args;
          await query(
            'INSERT INTO exam_results (student_id, student_name, school, score, total_questions, subject, assignment_id, category, timestamp, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [studentId, studentName, school, score, total, subject, assignmentId || null, category, Date.now(), details ? JSON.stringify(details) : null]
          );
          if (earnedStars > 0) {
            await query('UPDATE students SET stars = stars + ? WHERE id = ?', [earnedStars, studentId]);
          }
          return res.json({ success: true });
        }

        case 'verifyStudentLogin': {
          const { username, password } = args;
          let rows;
          if (password) {
            rows = await query('SELECT * FROM students WHERE username = ? AND password = ? LIMIT 1', [username, password]);
          } else {
            // legacy PIN login
            rows = await query('SELECT * FROM students WHERE id = ? LIMIT 1', [username]);
          }

          if (rows && rows.length > 0) {
            const student = rows[0];
            await query('UPDATE students SET login_count = login_count + 1, last_login = ? WHERE id = ?', [Date.now(), student.id]);
            return res.json({ student });
          }
          return res.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        case 'addAssignment': {
          const { school, subject, grade, questionCount, deadline, createdBy, title, targetClassrooms, targetClassroomIds, category, status } = args;
          const id = generateId('asg_');
          await query(
            'INSERT INTO assignments (id, school, subject, grade, question_count, deadline, created_by, title, target_classrooms, target_classroom_ids, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, school, subject, grade, questionCount, deadline, createdBy, title || '', JSON.stringify(targetClassrooms || []), JSON.stringify(targetClassroomIds || []), category, status || 'OPEN']
          );
          return res.json({ id, error: null });
        }

        case 'toggleAssignmentStatus': {
          const { id, currentStatus } = args;
          const newStatus = currentStatus === 'LOCKED' ? 'OPEN' : 'LOCKED';
          const rows = await query('SELECT title FROM assignments WHERE id = ? LIMIT 1', [id]);
          if (rows && rows.length > 0) {
            let title = rows[0].title || '';
            title = title.replace('::LOCKED', '').replace('::OPEN', '').trim();
            if (newStatus === 'LOCKED') title += '::LOCKED';
            await query('UPDATE assignments SET title = ?, status = ? WHERE id = ?', [title, newStatus, id]);
            return res.json({ success: true });
          }
          return res.json({ success: false });
        }

        case 'deleteAssignment': {
          const { id } = args;
          await query('DELETE FROM assignments WHERE id = ?', [id]);
          return res.json({ success: true });
        }

        case 'getQuestionsByAssignment': {
          const { assignmentId } = args;
          const rows = await query('SELECT * FROM questions WHERE assignment_id = ?', [assignmentId]);
          return res.json({ data: rows });
        }

        case 'addQuestion': {
          const { q } = args;
          const id = q.id || generateId('q_');
          const choices = [
              { id: "1", text: q.c1 || "" }, 
              { id: "2", text: q.c2 || "" }, 
              { id: "3", text: q.c3 || "" }, 
              { id: "4", text: q.c4 || "" }
          ];
          await query(
            'INSERT INTO questions (id, subject, grade, text, image, choices, correct_choice_id, explanation, school, teacher_id, assignment_id, target_classrooms, target_classroom_ids, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              id, q.subject, q.grade, q.text, q.image || '', JSON.stringify(choices), q.correct || '1', q.explanation || '',
              q.school, q.teacherId || q.teacher_id || '', q.assignmentId || q.assignment_id || null,
              JSON.stringify(q.targetClassrooms || []), JSON.stringify(q.targetClassroomIds || []), q.unit || null
            ]
          );
          return res.json({ success: true, id });
        }

        case 'editQuestion': {
          const { q } = args;
          const choices = [
              { id: "1", text: q.c1 || "" }, 
              { id: "2", text: q.c2 || "" }, 
              { id: "3", text: q.c3 || "" }, 
              { id: "4", text: q.c4 || "" }
          ];
          await query(
            'UPDATE questions SET subject = ?, grade = ?, text = ?, image = ?, choices = ?, correct_choice_id = ?, explanation = ?, target_classrooms = ?, target_classroom_ids = ?, unit = ? WHERE id = ?',
            [
              q.subject, q.grade, q.text, q.image || '', JSON.stringify(choices), q.correct || '1', q.explanation || '',
              JSON.stringify(q.targetClassrooms || []), JSON.stringify(q.targetClassroomIds || []), q.unit || null, q.id
            ]
          );
          return res.json({ success: true });
        }

        case 'getTeacherById': {
          const { id } = args;
          const rows = await query('SELECT * FROM teachers WHERE id = ? LIMIT 1', [id]);
          return res.json({ teacher: rows && rows.length > 0 ? rows[0] : null });
        }

        case 'teacherLogin': {
          const { username, password } = args;
          const rows = await query('SELECT * FROM teachers WHERE username = ? AND password = ? LIMIT 1', [username, password]);
          if (rows && rows.length > 0) {
            const teacher = rows[0];
            if (teacher.status !== 'active') {
              return res.json({ success: false, message: 'บัญชีของคุณอยู่ระหว่างรออนุมัติหรือถูกระงับการใช้งาน' });
            }
            await query('UPDATE teachers SET login_count = login_count + 1, last_login = ? WHERE id = ?', [Date.now(), teacher.id]);
            return res.json({ success: true, teacher });
          }
          return res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        case 'getSubjects': {
          const { school } = args;
          const rows = await query('SELECT * FROM subjects WHERE school = ?', [school]);
          return res.json({ data: rows });
        }

        case 'addSubject': {
          const { school, sub } = args;
          const id = sub.id || generateId('sub_');
          await query(
            'INSERT INTO subjects (id, name, school, teacher_id, grade, target_classrooms, target_classroom_ids, icon, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, sub.name, school, sub.teacherId, sub.grade, JSON.stringify(sub.targetClassrooms || []), JSON.stringify(sub.targetClassroomIds || []), sub.icon || '', sub.color || '']
          );
          return res.json({ success: true, id });
        }

        case 'deleteSubject': {
          const { school, id } = args;
          await query('DELETE FROM subjects WHERE id = ? AND school = ?', [id, school]);
          return res.json({ success: true });
        }

        case 'updateSchoolSettings': {
          const { schoolName, settings } = args;
          await query('UPDATE schools SET allow_all_manage_students = ? WHERE name = ?', [settings.allowAllManageStudents ? 1 : 0, schoolName]);
          return res.json({ success: true });
        }

        case 'manageTeacher': {
          const { type, payload } = args; // Note: 'action' inside parameter is 'type' to avoid collision
          if (type === 'edit') {
            const sql = 'UPDATE teachers SET name = ?, position = ?, teaching_classes = ?, teaching_classroom_ids = ?, grade_level = ?, avatar = ?, password = COALESCE(NULLIF(?, ""), password) WHERE id = ?';
            await query(sql, [
              payload.name, payload.position, JSON.stringify(payload.teachingClasses || []), JSON.stringify(payload.teachingClassroomIds || []),
              payload.gradeLevel, payload.avatar || null, payload.password || '', payload.id
            ]);
            return res.json({ success: true });
          }
          if (type === 'update_role') {
            await query('UPDATE teachers SET role = ? WHERE id = ?', [payload.role, payload.id]);
            return res.json({ success: true });
          }
          if (type === 'update_status') {
            await query('UPDATE teachers SET status = ? WHERE id = ?', [payload.status, payload.id]);
            return res.json({ success: true });
          }
          if (type === 'delete') {
            await query('DELETE FROM teachers WHERE id = ?', [payload.id]);
            return res.json({ success: true });
          }
          return res.json({ success: false });
        }

        case 'manageSchool': {
          const { type, payload } = args;
          if (type === 'add') {
            await query('INSERT INTO schools (name, school_code, status) VALUES (?, ?, ?)', [payload.name, payload.schoolCode, 'active']);
            return res.json({ success: true });
          }
          if (type === 'update_status') {
            await query('UPDATE schools SET status = ? WHERE id = ?', [payload.status, payload.id]);
            return res.json({ success: true });
          }
          if (type === 'delete') {
            await query('DELETE FROM schools WHERE id = ?', [payload.id]);
            return res.json({ success: true });
          }
          return res.json({ success: false });
        }

        case 'findSchoolByCode': {
          const { code } = args;
          const rows = await query('SELECT * FROM schools WHERE school_code = ? LIMIT 1', [code]);
          return res.json({ school: rows && rows.length > 0 ? rows[0] : null });
        }

        case 'requestRegistration': {
          const { payload } = args;
          await query(
            'INSERT INTO registration_requests (citizen_id, name, surname, school_id, school_name, school_code, position, type, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [payload.citizenId, payload.name, payload.surname, payload.schoolId, payload.schoolName || '', payload.schoolCode || '', payload.position || '', payload.type, Date.now(), 'pending']
          );
          return res.json({ success: true });
        }

        case 'approveRegistration': {
          const { req, role, grade, schoolName } = args;
          if (req.type === 'SCHOOL') {
            await query('INSERT IGNORE INTO schools (name, school_code, status) VALUES (?, ?, ?)', [req.schoolName, req.schoolCode, 'active']);
            await query(
              'INSERT INTO teachers (id, username, password, name, school, citizen_id, role, status, position, grade_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [generateId('tea_'), req.citizenId, '123456', `${req.name} ${req.surname}`, req.schoolName, req.citizenId, 'SCHOOL_ADMIN', 'active', req.position, 'ALL']
            );
          } else {
            await query(
              'INSERT INTO teachers (id, username, password, name, school, citizen_id, role, status, position, grade_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [generateId('tea_'), req.citizenId, '123456', `${req.name} ${req.surname}`, schoolName, req.citizenId, role, 'active', req.position, grade]
            );
          }
          await query('UPDATE registration_requests SET status = "approved" WHERE id = ?', [req.id]);
          return res.json({ success: true });
        }

        case 'rejectRegistration': {
          const { id } = args;
          await query('UPDATE registration_requests SET status = "rejected" WHERE id = ?', [id]);
          return res.json({ success: true });
        }

        case 'getAllPendingRegistrations': {
          const rows = await query('SELECT * FROM registration_requests WHERE status = "pending"');
          return res.json({ data: rows });
        }

        case 'manageStudent': {
          const { type, payload } = args;
          if (type === 'add') {
            const id = payload.id || generateId('std_');
            await query(
              'INSERT INTO students (id, name, username, password, school, avatar, grade, classroom, stars) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [id, payload.name, payload.username, payload.password, payload.school, payload.avatar || '👶', payload.grade, payload.classroom, 0]
            );
            return res.json({ success: true, student: { id, ...payload, stars: 0 } });
          }
          if (type === 'edit') {
            await query(
              'UPDATE students SET name = ?, username = ?, password = COALESCE(NULLIF(?, ""), password), avatar = ?, grade = ?, classroom = ? WHERE id = ?',
              [payload.name, payload.username, payload.password || '', payload.avatar || '👶', payload.grade, payload.classroom, payload.id]
            );
            return res.json({ success: true });
          }
          if (type === 'delete') {
            await query('DELETE FROM students WHERE id = ?', [payload.id]);
            return res.json({ success: true });
          }
          if (type === 'promote_bulk') {
            const { studentIds, newGrade } = payload;
            if (studentIds && studentIds.length > 0) {
              const placeholders = studentIds.map(() => '?').join(',');
              await query(`UPDATE students SET grade = ? WHERE id IN (${placeholders})`, [newGrade, ...studentIds]);
            }
            return res.json({ success: true });
          }
          if (type === 'reset_stars') {
            await query('UPDATE students SET stars = 0 WHERE id = ?', [payload.id]);
            return res.json({ success: true });
          }
          if (type === 'reset_scores') {
            await query('DELETE FROM exam_results WHERE student_id = ?', [payload.id]);
            return res.json({ success: true });
          }
          if (type === 'change_password') {
            await query('UPDATE students SET password = ? WHERE id = ?', [payload.password, payload.id]);
            return res.json({ success: true });
          }
          return res.json({ success: false });
        }

        case 'getClassrooms': {
          const { school } = args;
          const rows = await query('SELECT * FROM classrooms WHERE school = ? ORDER BY name ASC', [school]);
          return res.json({ data: rows });
        }

        case 'manageClassroom': {
          const { type, payload } = args;
          if (type === 'add') {
            const name = `${payload.gradeLevel}/${payload.roomNumber}`;
            await query(
              'INSERT INTO classrooms (school, grade_level, room_number, name) VALUES (?, ?, ?, ?)',
              [payload.school, payload.gradeLevel, payload.roomNumber, name]
            );
            return res.json({ success: true });
          }
          if (type === 'delete') {
            await query('DELETE FROM classrooms WHERE id = ?', [payload.id]);
            return res.json({ success: true });
          }
          return res.json({ success: false });
        }

        case 'deleteQuestion': {
          const { id } = args;
          await query('DELETE FROM questions WHERE id = ?', [id]);
          return res.json({ success: true });
        }

        case 'getQuestionsBySubject': {
          const { subject } = args;
          const rows = await query('SELECT * FROM questions WHERE subject = ?', [subject]);
          return res.json({ data: rows });
        }

        case 'getQuestionsBySubjectAndGrade': {
          const { subject, grade, school } = args;
          const rows = await query('SELECT * FROM questions WHERE subject = ? AND grade = ? AND school = ?', [subject, grade, school]);
          return res.json({ data: rows });
        }

        case 'redeemReward': {
          const { studentId, rewardId, cost } = args;
          const rows = await query('SELECT stars, inventory FROM students WHERE id = ? LIMIT 1', [studentId]);
          if (rows && rows.length > 0) {
            const student = rows[0];
            const currentStars = Number(student.stars) || 0;
            if (currentStars >= cost) {
              const inv = safeJsonParse(student.inventory);
              inv.push(rewardId);
              await query('UPDATE students SET stars = stars - ?, inventory = ? WHERE id = ?', [cost, JSON.stringify(inv), studentId]);
              return res.json({ success: true });
            }
          }
          return res.json({ success: false });
        }

        case 'getSchools': {
          const rows = await query('SELECT * FROM schools ORDER BY name ASC');
          return res.json({ data: rows });
        }

        case 'getAllTeachers': {
          const rows = await query('SELECT * FROM teachers ORDER BY name ASC');
          return res.json({ data: rows });
        }

        case 'getSuperAdminStats': {
          const students = await query('SELECT * FROM students');
          const results = await query('SELECT * FROM exam_results');
          const teachers = await query('SELECT * FROM teachers');
          return res.json({ students, results, teachers });
        }

        case 'importFromSupabase': {
          const { supabaseUrl, supabaseKey } = args;
          if (!supabaseUrl || !supabaseKey) {
            return res.status(400).json({ error: 'Supabase URL and Key are required.' });
          }
          
          const tablesToImport = [
            'app_settings',
            'schools',
            'classrooms',
            'students',
            'teachers',
            'subjects',
            'assignments',
            'questions',
            'exam_results',
            'registration_requests',
            'finance_accounts',
            'finance_transactions',
            'tpat_tgat_questions'
          ];
          
          const report: any = {};
          
          for (const table of tablesToImport) {
            try {
              const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*`;
              const response = await fetch(url, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`
                }
              });
              
              if (!response.ok) {
                report[table] = { status: 'skipped', reason: `HTTP error ${response.status}` };
                continue;
              }
              
              const rows = await response.json();
              if (!Array.isArray(rows)) {
                report[table] = { status: 'skipped', reason: 'Response is not an array' };
                continue;
              }
              
              if (rows.length === 0) {
                report[table] = { status: 'success', count: 0, note: 'No data found in old table' };
                continue;
              }
              
              // Get columns dynamically
              const cols = await query(`SHOW COLUMNS FROM \`${table}\``);
              const allowedCols = cols.map((c: any) => (c.Field || c.field || '').toString()).filter(Boolean);
              
              // Insert into MySQL table
              await query(`DELETE FROM \`${table}\``);
              
              for (const row of rows) {
                const filteredRow: any = {};
                for (const col of allowedCols) {
                  if (col in row) {
                    filteredRow[col] = row[col];
                  }
                }
                const keys = Object.keys(filteredRow);
                if (keys.length === 0) continue;
                
                const values = Object.values(filteredRow);
                const sanitizedValues = values.map(val => {
                  if (typeof val === 'boolean') {
                    return val ? 1 : 0;
                  }
                  if (val !== null && typeof val === 'object') {
                    return JSON.stringify(val);
                  }
                  return val;
                });
                const placeholders = keys.map(() => '?').join(',');
                const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES (${placeholders})`;
                await query(sql, sanitizedValues);
              }
              
              report[table] = { status: 'success', count: rows.length };
            } catch (err: any) {
              report[table] = { status: 'error', reason: err.message || String(err) };
            }
          }
          
          return res.json({ success: true, report });
        }

        case 'importSingleTableFromSupabase': {
          const { table, supabaseUrl, supabaseKey } = args;
          if (!table || !supabaseUrl || !supabaseKey) {
            return res.status(400).json({ error: 'table, supabaseUrl, and supabaseKey are required.' });
          }
          try {
            const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*`;
            const response = await fetch(url, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            
            if (!response.ok) {
              const is404 = response.status === 404;
              return res.json({ 
                success: false, 
                is404, 
                error: is404 ? 'ไม่พบบน Supabase (ข้ามการดึงข้อมูล)' : `HTTP error ${response.status} (${response.statusText})` 
              });
            }
            
            const rows = await response.json();
            if (!Array.isArray(rows)) {
              return res.json({ success: false, error: 'Response from Supabase is not an array. Please check the API key, URL, and table permissions.' });
            }
            
            // Check if the table exists in MySQL and get its detailed column list
            let cols;
            try {
              cols = await query(`SHOW COLUMNS FROM \`${table}\``);
            } catch (err: any) {
              return res.json({ success: false, error: `MySQL table error: ${err.message || String(err)}` });
            }
            
            const allowedCols = cols.map((c: any) => ({
              field: (c.Field || c.field || '').toString(),
              type: (c.Type || c.type || '').toString().toLowerCase(),
              nullable: (c.Null || c.null || '').toString().toUpperCase() === 'YES',
              key: (c.Key || c.key || '').toString().toUpperCase(),
              default: c.Default || c.default,
              extra: (c.Extra || c.extra || '').toString().toLowerCase()
            }));
            
            // Delete existing records to avoid duplicates
            await query(`DELETE FROM \`${table}\``);
            
            let insertedCount = 0;
            for (const row of rows) {
              // Map keys of row to allowed columns
              const filteredRow: any = {};
              let skipRowId = false;

              for (const col of allowedCols) {
                let val = row[col.field];
                
                // 1. Handle auto_increment and primary key integer IDs that might be non-numeric (e.g. string UUIDs)
                if (col.field === 'id' && (col.extra.includes('auto_increment') || col.type.includes('int'))) {
                  if (val === undefined || val === null || isNaN(Number(val))) {
                    // Let MySQL generate the ID auto-incrementally
                    skipRowId = true;
                    continue;
                  } else {
                    val = parseInt(val, 10);
                  }
                }

                // 2. Handle NOT NULL columns when incoming value is null or undefined
                if (!col.nullable && (val === null || val === undefined)) {
                  if (col.field === 'username') {
                    val = `user_${row.id || Math.random().toString(36).substring(2, 10)}`;
                  } else if (col.field === 'password') {
                    val = 'password123';
                  } else if (col.field === 'citizen_id') {
                    val = '0000000000000';
                  } else if (col.field === 'school') {
                    val = 'โรงเรียนทั่วไป';
                  } else if (col.field === 'grade' || col.field === 'grade_level') {
                    val = 'ป.1';
                  } else if (col.field === 'classroom') {
                    val = '1';
                  } else if (col.field === 'status') {
                    val = 'active';
                  } else if (col.field === 'role') {
                    val = 'TEACHER';
                  } else if (col.field === 'category') {
                    val = 'GENERAL';
                  } else if (col.field === 'timestamp') {
                    val = Date.now();
                  } else {
                    // Fallback based on SQL type
                    if (col.type.includes('int') || col.type.includes('double') || col.type.includes('decimal')) {
                      val = 0;
                    } else {
                      val = '';
                    }
                  }
                }

                filteredRow[col.field] = val;
              }
              
              const keys = Object.keys(filteredRow);
              if (keys.length === 0) continue;
              
              const values = Object.values(filteredRow);
              const sanitizedValues = values.map(val => {
                if (typeof val === 'boolean') {
                  return val ? 1 : 0;
                }
                if (val !== null && typeof val === 'object') {
                  return JSON.stringify(val);
                }
                return val;
              });
              
              const placeholders = keys.map(() => '?').join(',');
              const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES (${placeholders})`;
              await query(sql, sanitizedValues);
              insertedCount++;
            }
            
            return res.json({ success: true, count: insertedCount });
          } catch (err: any) {
            return res.json({ success: false, error: err.message || String(err) });
          }
        }

        default: {
          return res.status(400).json({ error: `Unknown action: ${action}` });
        }
      }
    }

    // ----------------- AUTOPILOT JSON DATABASE FALLBACK -----------------
    const db = getJsonDb();

    switch (action) {
      case 'supabaseQuery': {
        const { table, operation, selectFields, filterField, filterVal, isSingle, orderCol, limitNum, payload } = args;
        
        // Dynamically initialize table array if not exists
        if (!db[table]) {
          db[table] = [];
        }
        
        if (operation === 'select') {
          let rows = db[table];
          if (filterField && filterVal !== null) {
            rows = rows.filter((r: any) => String(r[filterField] || '') === String(filterVal));
          }
          if (orderCol) {
            rows = [...rows].sort((a: any, b: any) => String(a[orderCol] || '').localeCompare(String(b[orderCol] || '')));
          }
          if (limitNum) {
            rows = rows.slice(0, Number(limitNum));
          }
          if (isSingle) {
            return res.json({ data: rows[0] || null });
          }
          return res.json({ data: rows });
        }
        
        if (operation === 'insert') {
          const items = Array.isArray(payload) ? payload : [payload];
          items.forEach((item: any) => {
            if (!item.id) {
              item.id = generateId('emu_');
            }
          });
          db[table].push(...items);
          saveJsonDb(db);
          return res.json({ data: payload });
        }
        
        if (operation === 'update') {
          db[table].forEach((r: any) => {
            if (filterField && String(r[filterField] || '') === String(filterVal)) {
              Object.assign(r, payload);
            }
          });
          saveJsonDb(db);
          return res.json({ success: true });
        }
        
        if (operation === 'delete') {
          if (filterField) {
            db[table] = db[table].filter((r: any) => String(r[filterField] || '') !== String(filterVal));
            saveJsonDb(db);
          }
          return res.json({ success: true });
        }
        
        return res.status(400).json({ error: `Unknown query operation: ${operation}` });
      }

      case 'getAppSettings': {
        const settings = db.app_settings[0] || { logo_url: 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png', app_name: 'Pratom Smart Tutor' };
        return res.json(settings);
      }

      case 'updateAppSettings': {
        const { logo_url, app_name } = args;
        db.app_settings[0] = { id: 1, logo_url: logo_url || db.app_settings[0]?.logo_url, app_name: app_name || db.app_settings[0]?.app_name };
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'fetchAppData': {
        return res.json({
          students: db.students,
          questions: db.questions,
          results: db.exam_results,
          assignments: db.assignments,
          subjects: db.subjects
        });
      }

      case 'getDataForStudent': {
        const { student } = args;
        const cleanSchool = String(student.school || '').trim().toLowerCase();
        const results = db.exam_results.filter((r: any) => String(r.student_id) === String(student.id))
          .sort((a: any, b: any) => b.timestamp - a.timestamp);
        const assignments = db.assignments.filter((a: any) => String(a.school).trim().toLowerCase() === cleanSchool);
        const subjects = db.subjects.filter((s: any) => String(s.school).trim().toLowerCase() === cleanSchool);
        const questions = db.questions.filter((q: any) => String(q.school).trim().toLowerCase() === cleanSchool);
        return res.json({ results, assignments, subjects, questions });
      }

      case 'getTeacherDashboard': {
        const { school } = args;
        const cleanSchool = String(school).trim().toLowerCase();
        const students = db.students.filter((s: any) => String(s.school).trim().toLowerCase() === cleanSchool);
        const results = db.exam_results.filter((r: any) => String(r.school).trim().toLowerCase() === cleanSchool)
          .sort((a: any, b: any) => b.timestamp - a.timestamp);
        const assignments = db.assignments.filter((a: any) => String(a.school).trim().toLowerCase() === cleanSchool);
        const subjects = db.subjects.filter((s: any) => String(s.school).trim().toLowerCase() === cleanSchool);
        const schoolInfo = db.schools.find((s: any) => String(s.name).trim().toLowerCase() === cleanSchool) || null;
        return res.json({ students, results, assignments, subjects, school: schoolInfo });
      }

      case 'saveScore': {
        const { studentId, studentName, school, score, total, subject, assignmentId, category, earnedStars, details } = args;
        const newResult = {
          id: db.exam_results.length + 1,
          student_id: studentId,
          student_name: studentName,
          school: school,
          score: score,
          total_questions: total,
          subject: subject,
          assignment_id: assignmentId || null,
          category: category,
          timestamp: Date.now(),
          details: details ? JSON.stringify(details) : null
        };
        db.exam_results.push(newResult);

        if (earnedStars > 0) {
          const student = db.students.find((s: any) => String(s.id) === String(studentId));
          if (student) {
            student.stars = (Number(student.stars) || 0) + earnedStars;
          }
        }
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'verifyStudentLogin': {
        const { username, password } = args;
        let student;
        if (password) {
          student = db.students.find((s: any) => s.username === username && s.password === password);
        } else {
          // legacy PIN
          student = db.students.find((s: any) => s.id === username);
        }

        if (student) {
          student.login_count = (student.login_count || 0) + 1;
          student.last_login = Date.now();
          saveJsonDb(db);
          return res.json({ student });
        }
        return res.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      }

      case 'addAssignment': {
        const { school, subject, grade, questionCount, deadline, createdBy, title, targetClassrooms, targetClassroomIds, category, status } = args;
        const id = generateId('asg_');
        const newAsg = {
          id, school, subject, grade, question_count: questionCount, deadline, created_by: createdBy, title: title || '',
          target_classrooms: JSON.stringify(targetClassrooms || []), target_classroom_ids: JSON.stringify(targetClassroomIds || []),
          category, status: status || 'OPEN'
        };
        db.assignments.push(newAsg);
        saveJsonDb(db);
        return res.json({ id, error: null });
      }

      case 'toggleAssignmentStatus': {
        const { id, currentStatus } = args;
        const newStatus = currentStatus === 'LOCKED' ? 'OPEN' : 'LOCKED';
        const asg = db.assignments.find((a: any) => String(a.id) === String(id));
        if (asg) {
          let title = asg.title || '';
          title = title.replace('::LOCKED', '').replace('::OPEN', '').trim();
          if (newStatus === 'LOCKED') title += '::LOCKED';
          asg.title = title;
          asg.status = newStatus;
          saveJsonDb(db);
          return res.json({ success: true });
        }
        return res.json({ success: false });
      }

      case 'deleteAssignment': {
        const { id } = args;
        db.assignments = db.assignments.filter((a: any) => String(a.id) !== String(id));
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'getQuestionsByAssignment': {
        const { assignmentId } = args;
        const rows = db.questions.filter((q: any) => String(q.assignment_id) === String(assignmentId));
        return res.json({ data: rows });
      }

      case 'addQuestion': {
        const { q } = args;
        const id = q.id || generateId('q_');
        const choices = [
            { id: "1", text: q.c1 || "" }, 
            { id: "2", text: q.c2 || "" }, 
            { id: "3", text: q.c3 || "" }, 
            { id: "4", text: q.c4 || "" }
        ];
        const newQ = {
          id, subject: q.subject, grade: q.grade, text: q.text, image: q.image || '', choices: JSON.stringify(choices),
          correct_choice_id: q.correct || '1', explanation: q.explanation || '', school: q.school,
          teacher_id: q.teacherId || q.teacher_id || '', assignment_id: q.assignmentId || q.assignment_id || null,
          target_classrooms: JSON.stringify(q.targetClassrooms || []), target_classroom_ids: JSON.stringify(q.targetClassroomIds || []),
          unit: q.unit || null
        };
        db.questions.push(newQ);
        saveJsonDb(db);
        return res.json({ success: true, id });
      }

      case 'editQuestion': {
        const { q } = args;
        const choices = [
            { id: "1", text: q.c1 || "" }, 
            { id: "2", text: q.c2 || "" }, 
            { id: "3", text: q.c3 || "" }, 
            { id: "4", text: q.c4 || "" }
        ];
        const existingQ = db.questions.find((qq: any) => String(qq.id) === String(q.id));
        if (existingQ) {
          existingQ.subject = q.subject;
          existingQ.grade = q.grade;
          existingQ.text = q.text;
          existingQ.image = q.image || '';
          existingQ.choices = JSON.stringify(choices);
          existingQ.correct_choice_id = q.correct || '1';
          existingQ.explanation = q.explanation || '';
          existingQ.target_classrooms = JSON.stringify(q.targetClassrooms || []);
          existingQ.target_classroom_ids = JSON.stringify(q.targetClassroomIds || []);
          existingQ.unit = q.unit || null;
          saveJsonDb(db);
        }
        return res.json({ success: true });
      }

      case 'getTeacherById': {
        const { id } = args;
        const teacher = db.teachers.find((t: any) => String(t.id) === String(id)) || null;
        return res.json({ teacher });
      }

      case 'teacherLogin': {
        const { username, password } = args;
        const teacher = db.teachers.find((t: any) => t.username === username && t.password === password);
        if (teacher) {
          if (teacher.status !== 'active') {
            return res.json({ success: false, message: 'บัญชีของคุณอยู่ระหว่างรออนุมัติหรือถูกระงับการใช้งาน' });
          }
          teacher.login_count = (teacher.login_count || 0) + 1;
          teacher.last_login = Date.now();
          saveJsonDb(db);
          return res.json({ success: true, teacher });
        }
        return res.json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      }

      case 'getSubjects': {
        const { school } = args;
        const rows = db.subjects.filter((s: any) => String(s.school).trim().toLowerCase() === String(school).trim().toLowerCase());
        return res.json({ data: rows });
      }

      case 'addSubject': {
        const { school, sub } = args;
        const id = sub.id || generateId('sub_');
        const newSub = {
          id, name: sub.name, school: school, teacher_id: sub.teacherId, grade: sub.grade,
          target_classrooms: JSON.stringify(sub.targetClassrooms || []), target_classroom_ids: JSON.stringify(sub.targetClassroomIds || []),
          icon: sub.icon || '', color: sub.color || ''
        };
        db.subjects.push(newSub);
        saveJsonDb(db);
        return res.json({ success: true, id });
      }

      case 'deleteSubject': {
        const { school, id } = args;
        db.subjects = db.subjects.filter((s: any) => !(String(s.id) === String(id) && String(s.school).trim().toLowerCase() === String(school).trim().toLowerCase()));
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'updateSchoolSettings': {
        const { schoolName, settings } = args;
        const school = db.schools.find((s: any) => String(s.name).trim().toLowerCase() === String(schoolName).trim().toLowerCase());
        if (school) {
          school.allow_all_manage_students = settings.allowAllManageStudents ? 1 : 0;
          saveJsonDb(db);
        }
        return res.json({ success: true });
      }

      case 'manageTeacher': {
        const { type, payload } = args;
        if (type === 'edit') {
          const t = db.teachers.find((x: any) => String(x.id) === String(payload.id));
          if (t) {
            t.name = payload.name;
            t.position = payload.position;
            t.teaching_classes = JSON.stringify(payload.teachingClasses || []);
            t.teaching_classroom_ids = JSON.stringify(payload.teachingClassroomIds || []);
            t.grade_level = payload.gradeLevel;
            t.avatar = payload.avatar;
            if (payload.password) t.password = payload.password;
            saveJsonDb(db);
          }
          return res.json({ success: true });
        }
        if (type === 'update_role') {
          const t = db.teachers.find((x: any) => String(x.id) === String(payload.id));
          if (t) {
            t.role = payload.role;
            saveJsonDb(db);
          }
          return res.json({ success: true });
        }
        if (type === 'update_status') {
          const t = db.teachers.find((x: any) => String(x.id) === String(payload.id));
          if (t) {
            t.status = payload.status;
            saveJsonDb(db);
          }
          return res.json({ success: true });
        }
        if (type === 'delete') {
          db.teachers = db.teachers.filter((x: any) => String(x.id) !== String(payload.id));
          saveJsonDb(db);
          return res.json({ success: true });
        }
        return res.json({ success: false });
      }

      case 'manageSchool': {
        const { type, payload } = args;
        if (type === 'add') {
          const newSchool = { id: db.schools.length + 1, name: payload.name, school_code: payload.schoolCode, status: 'active', allow_all_manage_students: 0 };
          db.schools.push(newSchool);
          saveJsonDb(db);
          return res.json({ success: true });
        }
        if (type === 'update_status') {
          const s = db.schools.find((x: any) => String(x.id) === String(payload.id));
          if (s) {
            s.status = payload.status;
            saveJsonDb(db);
          }
          return res.json({ success: true });
        }
        if (type === 'delete') {
          db.schools = db.schools.filter((x: any) => String(x.id) !== String(payload.id));
          saveJsonDb(db);
          return res.json({ success: true });
        }
        return res.json({ success: false });
      }

      case 'findSchoolByCode': {
        const { code } = args;
        const school = db.schools.find((s: any) => String(s.school_code).trim().toLowerCase() === String(code).trim().toLowerCase()) || null;
        return res.json({ school });
      }

      case 'requestRegistration': {
        const { payload } = args;
        const newReq = {
          id: db.registration_requests.length + 1,
          citizen_id: payload.citizenId,
          name: payload.name,
          surname: payload.surname,
          school_id: payload.schoolId,
          school_name: payload.schoolName,
          school_code: payload.schoolCode,
          position: payload.position,
          type: payload.type,
          timestamp: Date.now(),
          status: 'pending'
        };
        db.registration_requests.push(newReq);
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'approveRegistration': {
        const { req, role, grade, schoolName } = args;
        if (req.type === 'SCHOOL') {
          const existsSchool = db.schools.some((s: any) => s.name === req.schoolName);
          if (!existsSchool) {
            db.schools.push({ id: db.schools.length + 1, name: req.schoolName, school_code: req.schoolCode, status: 'active', allow_all_manage_students: 0 });
          }
          db.teachers.push({
            id: generateId('tea_'), username: req.citizenId, password: '123456', name: `${req.name} ${req.surname}`, school: req.schoolName,
            citizen_id: req.citizenId, role: 'SCHOOL_ADMIN', status: 'active', position: req.position, grade_level: 'ALL', login_count: 0, last_login: 0
          });
        } else {
          db.teachers.push({
            id: generateId('tea_'), username: req.citizenId, password: '123456', name: `${req.name} ${req.surname}`, school: schoolName,
            citizen_id: req.citizenId, role: role, status: 'active', position: req.position, grade_level: grade, login_count: 0, last_login: 0
          });
        }
        const r = db.registration_requests.find((x: any) => String(x.id) === String(req.id));
        if (r) r.status = 'approved';
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'rejectRegistration': {
        const { id } = args;
        const r = db.registration_requests.find((x: any) => String(x.id) === String(id));
        if (r) r.status = 'rejected';
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'getAllPendingRegistrations': {
        const rows = db.registration_requests.filter((r: any) => r.status === 'pending');
        return res.json({ data: rows });
      }

      case 'manageStudent': {
        const { type, payload } = args;
        if (type === 'add') {
          const id = payload.id || generateId('std_');
          const newStudent = { id, name: payload.name, username: payload.username, password: payload.password, school: payload.school, avatar: payload.avatar || '👶', grade: payload.grade, classroom: payload.classroom, stars: 0, inventory: '[]', login_count: 0, last_login: 0 };
          db.students.push(newStudent);
          saveJsonDb(db);
          return res.json({ success: true, student: newStudent });
        }
        if (type === 'edit') {
          const std = db.students.find((x: any) => String(x.id) === String(payload.id));
          if (std) {
            std.name = payload.name;
            std.username = payload.username;
            if (payload.password) std.password = payload.password;
            std.avatar = payload.avatar;
            std.grade = payload.grade;
            std.classroom = payload.classroom;
            saveJsonDb(db);
          }
          return res.json({ success: true });
        }
        if (type === 'delete') {
          db.students = db.students.filter((x: any) => String(x.id) !== String(payload.id));
          saveJsonDb(db);
          return res.json({ success: true });
        }
        if (type === 'promote_bulk') {
          const { studentIds, newGrade } = payload;
          const idsSet = new Set(studentIds.map(String));
          db.students.forEach((s: any) => {
            if (idsSet.has(String(s.id))) {
              s.grade = newGrade;
            }
          });
          saveJsonDb(db);
          return res.json({ success: true });
        }
        if (type === 'reset_stars') {
          const std = db.students.find((x: any) => String(x.id) === String(payload.id));
          if (std) std.stars = 0;
          saveJsonDb(db);
          return res.json({ success: true });
        }
        if (type === 'reset_scores') {
          db.exam_results = db.exam_results.filter((r: any) => String(r.student_id) !== String(payload.id));
          saveJsonDb(db);
          return res.json({ success: true });
        }
        if (type === 'change_password') {
          const std = db.students.find((x: any) => String(x.id) === String(payload.id));
          if (std) std.password = payload.password;
          saveJsonDb(db);
          return res.json({ success: true });
        }
        return res.json({ success: false });
      }

      case 'getClassrooms': {
        const { school } = args;
        const cleanSchool = String(school).trim().toLowerCase();
        const rows = db.classrooms.filter((c: any) => String(c.school).trim().toLowerCase() === cleanSchool)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        return res.json({ data: rows });
      }

      case 'manageClassroom': {
        const { type, payload } = args;
        if (type === 'add') {
          const name = `${payload.gradeLevel}/${payload.roomNumber}`;
          db.classrooms.push({ id: db.classrooms.length + 1, school: payload.school, grade_level: payload.gradeLevel, room_number: payload.roomNumber, name });
          saveJsonDb(db);
          return res.json({ success: true });
        }
        if (type === 'delete') {
          db.classrooms = db.classrooms.filter((c: any) => String(c.id) !== String(payload.id));
          saveJsonDb(db);
          return res.json({ success: true });
        }
        return res.json({ success: false });
      }

      case 'deleteQuestion': {
        const { id } = args;
        db.questions = db.questions.filter((q: any) => String(q.id) !== String(id));
        saveJsonDb(db);
        return res.json({ success: true });
      }

      case 'getQuestionsBySubject': {
        const { subject } = args;
        const rows = db.questions.filter((q: any) => q.subject === subject);
        return res.json({ data: rows });
      }

      case 'getQuestionsBySubjectAndGrade': {
        const { subject, grade, school } = args;
        const rows = db.questions.filter((q: any) => q.subject === subject && q.grade === grade && String(q.school).trim().toLowerCase() === String(school).trim().toLowerCase());
        return res.json({ data: rows });
      }

      case 'redeemReward': {
        const { studentId, rewardId, cost } = args;
        const student = db.students.find((s: any) => String(s.id) === String(studentId));
        if (student && (student.stars >= cost)) {
          student.stars -= cost;
          const inv = safeJsonParse(student.inventory);
          inv.push(rewardId);
          student.inventory = JSON.stringify(inv);
          saveJsonDb(db);
          return res.json({ success: true });
        }
        return res.json({ success: false });
      }

      case 'getSchools': {
        const sorted = [...db.schools].sort((a: any, b: any) => a.name.localeCompare(b.name));
        return res.json({ data: sorted });
      }

      case 'getAllTeachers': {
        const sorted = [...db.teachers].sort((a: any, b: any) => a.name.localeCompare(b.name));
        return res.json({ data: sorted });
      }

      case 'getSuperAdminStats': {
        return res.json({
          students: db.students,
          results: db.exam_results,
          teachers: db.teachers
        });
      }

      case 'importFromSupabase': {
        const { supabaseUrl, supabaseKey } = args;
        if (!supabaseUrl || !supabaseKey) {
          return res.status(400).json({ error: 'Supabase URL and Key are required.' });
        }
        
        const tablesToImport = [
          'app_settings',
          'schools',
          'classrooms',
          'students',
          'teachers',
          'subjects',
          'assignments',
          'questions',
          'exam_results',
          'registration_requests',
          'finance_accounts',
          'finance_transactions',
          'tpat_tgat_questions'
        ];
        
        const report: any = {};
        
        for (const table of tablesToImport) {
          try {
            const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*`;
            const response = await fetch(url, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            
            if (!response.ok) {
              report[table] = { status: 'skipped', reason: `HTTP error ${response.status}` };
              continue;
            }
            
            const rows = await response.json();
            if (!Array.isArray(rows)) {
              report[table] = { status: 'skipped', reason: 'Response is not an array' };
              continue;
            }
            
            if (rows.length === 0) {
              report[table] = { status: 'success', count: 0, note: 'No data found in old table' };
              continue;
            }
            
            // Store directly in JSON database
            db[table] = rows;
            report[table] = { status: 'success', count: rows.length };
          } catch (err: any) {
            report[table] = { status: 'error', reason: err.message || String(err) };
          }
        }
        
        saveJsonDb(db);
        return res.json({ success: true, report });
      }

      case 'importSingleTableFromSupabase': {
        const { table, supabaseUrl, supabaseKey } = args;
        if (!table || !supabaseUrl || !supabaseKey) {
          return res.status(400).json({ error: 'table, supabaseUrl, and supabaseKey are required.' });
        }
        try {
          const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?select=*`;
          const response = await fetch(url, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          
          if (!response.ok) {
            const is404 = response.status === 404;
            return res.json({ 
              success: false, 
              is404, 
              error: is404 ? 'ไม่พบบน Supabase (ข้ามการดึงข้อมูล)' : `HTTP error ${response.status} (${response.statusText})` 
            });
          }
          
          const rows = await response.json();
          if (!Array.isArray(rows)) {
            return res.json({ success: false, error: 'Response from Supabase is not an array.' });
          }
          
          db[table] = rows;
          saveJsonDb(db);
          return res.json({ success: true, count: rows.length });
        } catch (err: any) {
          return res.json({ success: false, error: err.message || String(err) });
        }
      }

      default: {
        return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    }

  } catch (error: any) {
    console.error(`API Error handling action "${action}":`, error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// ---------------------------------------------------------------------------
// ⚡ Vite Dev & Static Assets Routing Setup
// ---------------------------------------------------------------------------
async function startServer() {
  const isInsideDist = path.basename(__dirname) === 'dist';
  let distPath = '';

  if (isInsideDist) {
    distPath = __dirname;
  } else {
    distPath = path.join(__dirname, 'dist');
  }

  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" && !isInsideDist && !hasDist) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (isNaN(Number(PORT))) {
    app.listen(PORT, () => {
      console.log(`🚀 Fullstack Node.js + Vite Server running on named pipe ${PORT}`);
    });
  } else {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`🚀 Fullstack Node.js + Vite Server running on port ${PORT}`);
    });
  }
}

startServer();
