<?php
/**
 * PHP MySQL Backend API for Pratom Smart Tutor
 * Designed for deployment on Windows Server via Plesk Control Panel (with phpMyAdmin)
 *
 * INSTRUCTIONS:
 * 1. Upload this file to your Plesk web root directory (same folder as your index.html/dist files).
 * 2. Set your MySQL database connection credentials below.
 * 3. Import "mysql_schema.sql" in your phpMyAdmin panel.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===========================================================================
// 🟢 DATABASE CONFIGURATION (Change these to match your Plesk MySQL database)
// ===========================================================================
define('DB_HOST', 'localhost');
define('DB_USER', 'your_plesk_db_user');
define('DB_PASS', 'your_plesk_db_password');
define('DB_NAME', 'pratom_smart_tutor');
define('DB_PORT', 3306);

// Establish PDO Connection
try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Database Connection Failed: " . $e->getMessage(),
        "instruction" => "Please configure the MySQL credentials in api.php and ensure the database has been created in Plesk phpMyAdmin."
    ]);
    exit();
}

// Read incoming JSON body
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input || !isset($input['action'])) {
    http_response_code(400);
    echo json_encode(["error" => "Action parameter is required."]);
    exit();
}

$action = $input['action'];

// Helper to safely format JSON strings
function safeJsonParse($str) {
    if (!$str) return [];
    $parsed = json_decode($str, true);
    return is_array($parsed) ? $parsed : [];
}

// Helper to generate unique string ID
function generateId($prefix = '') {
    return $prefix . time() . '_' . bin2hex(random_bytes(4));
}

try {
    switch ($action) {
        case 'getAppSettings':
            $stmt = $pdo->query("SELECT logo_url, app_name FROM app_settings LIMIT 1");
            $settings = $stmt->fetch();
            if ($settings) {
                echo json_encode([
                    "logo_url" => $settings['logo_url'],
                    "app_name" => $settings['app_name']
                ]);
            } else {
                echo json_encode([
                    "logo_url" => "https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png",
                    "app_name" => "Pratom Smart Tutor"
                ]);
            }
            break;

        case 'updateAppSettings':
            $logoUrl = isset($input['logo_url']) ? $input['logo_url'] : null;
            $appName = isset($input['app_name']) ? $input['app_name'] : null;
            
            $stmt = $pdo->prepare("
                INSERT INTO app_settings (id, logo_url, app_name) 
                VALUES (1, ?, ?) 
                ON DUPLICATE KEY UPDATE logo_url = ?, app_name = ?
            ");
            $stmt->execute([$logoUrl, $appName, $logoUrl, $appName]);
            echo json_encode(["success" => true]);
            break;

        case 'fetchAppData':
            $students = $pdo->query("SELECT * FROM students")->fetchAll();
            $questions = $pdo->query("SELECT * FROM questions")->fetchAll();
            $results = $pdo->query("SELECT * FROM exam_results")->fetchAll();
            $assignments = $pdo->query("SELECT * FROM assignments")->fetchAll();
            $subjects = $pdo->query("SELECT * FROM subjects")->fetchAll();
            echo json_encode([
                "students" => $students,
                "questions" => $questions,
                "results" => $results,
                "assignments" => $assignments,
                "subjects" => $subjects
            ]);
            break;

        case 'getDataForStudent':
            $student = $input['student'];
            $cleanSchool = trim($student['school'] ?? '');
            
            $stmt1 = $pdo->prepare("SELECT * FROM exam_results WHERE student_id = ? ORDER BY timestamp DESC");
            $stmt1->execute([$student['id']]);
            $results = $stmt1->fetchAll();

            $stmt2 = $pdo->prepare("SELECT * FROM assignments WHERE school = ?");
            $stmt2->execute([$cleanSchool]);
            $assignments = $stmt2->fetchAll();

            $stmt3 = $pdo->prepare("SELECT * FROM subjects WHERE school = ?");
            $stmt3->execute([$cleanSchool]);
            $subjects = $stmt3->fetchAll();

            $stmt4 = $pdo->prepare("SELECT * FROM questions WHERE school = ?");
            $stmt4->execute([$cleanSchool]);
            $questions = $stmt4->fetchAll();

            echo json_encode([
                "results" => $results,
                "assignments" => $assignments,
                "subjects" => $subjects,
                "questions" => $questions
            ]);
            break;

        case 'getTeacherDashboard':
            $school = trim($input['school'] ?? '');
            
            $stmt1 = $pdo->prepare("SELECT * FROM students WHERE school = ?");
            $stmt1->execute([$school]);
            $students = $stmt1->fetchAll();

            $stmt2 = $pdo->prepare("SELECT * FROM exam_results WHERE school = ? ORDER BY timestamp DESC");
            $stmt2->execute([$school]);
            $results = $stmt2->fetchAll();

            $stmt3 = $pdo->prepare("SELECT * FROM assignments WHERE school = ?");
            $stmt3->execute([$school]);
            $assignments = $stmt3->fetchAll();

            $stmt4 = $pdo->prepare("SELECT * FROM subjects WHERE school = ?");
            $stmt4->execute([$school]);
            $subjects = $stmt4->fetchAll();

            $stmt5 = $pdo->prepare("SELECT * FROM schools WHERE name = ? LIMIT 1");
            $stmt5->execute([$school]);
            $schoolRow = $stmt5->fetch();

            echo json_encode([
                "students" => $students,
                "results" => $results,
                "assignments" => $assignments,
                "subjects" => $subjects,
                "school" => $schoolRow ? [
                    "id" => $schoolRow['id'],
                    "name" => $schoolRow['name'],
                    "school_code" => $schoolRow['school_code'],
                    "status" => $schoolRow['status'],
                    "allowAllManageStudents" => (int)$schoolRow['allow_all_manage_students']
                ] : null
            ]);
            break;

        case 'saveScore':
            $studentId = $input['studentId'];
            $studentName = $input['studentName'];
            $school = $input['school'];
            $score = (int)$input['score'];
            $total = (int)$input['total'];
            $subject = $input['subject'];
            $assignmentId = $input['assignmentId'] ?? null;
            $category = $input['category'];
            $earnedStars = (int)($input['earnedStars'] ?? 0);
            $details = isset($input['details']) ? json_encode($input['details']) : null;

            $stmt = $pdo->prepare("
                INSERT INTO exam_results (student_id, student_name, school, score, total_questions, subject, assignment_id, category, timestamp, details) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$studentId, $studentName, $school, $score, $total, $subject, $assignmentId, $category, time() * 1000, $details]);

            if ($earnedStars > 0) {
                $stmtStars = $pdo->prepare("UPDATE students SET stars = stars + ? WHERE id = ?");
                $stmtStars->execute([$earnedStars, $studentId]);
            }
            echo json_encode(["success" => true]);
            break;

        case 'verifyStudentLogin':
            $username = $input['username'];
            $password = $input['password'] ?? null;

            if ($password) {
                $stmt = $pdo->prepare("SELECT * FROM students WHERE username = ? AND password = ? LIMIT 1");
                $stmt->execute([$username, $password]);
            } else {
                $stmt = $pdo->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
                $stmt->execute([$username]);
            }
            $student = $stmt->fetch();

            if ($student) {
                $stmtUpdate = $pdo->prepare("UPDATE students SET login_count = login_count + 1, last_login = ? WHERE id = ?");
                $stmtUpdate->execute([time() * 1000, $student['id']]);
                echo json_encode(["student" => $student]);
            } else {
                echo json_encode(["error" => "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"]);
            }
            break;

        case 'addAssignment':
            $school = $input['school'];
            $subject = $input['subject'];
            $grade = $input['grade'];
            $questionCount = (int)$input['questionCount'];
            $deadline = $input['deadline'];
            $createdBy = $input['createdBy'];
            $title = $input['title'] ?? '';
            $targetClassrooms = json_encode($input['targetClassrooms'] ?? []);
            $targetClassroomIds = json_encode($input['targetClassroomIds'] ?? []);
            $category = $input['category'];
            $status = $input['status'] ?? 'OPEN';

            $id = generateId('asg_');
            $stmt = $pdo->prepare("
                INSERT INTO assignments (id, school, subject, grade, question_count, deadline, created_by, title, target_classrooms, target_classroom_ids, category, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$id, $school, $subject, $grade, $questionCount, $deadline, $createdBy, $title, $targetClassrooms, $targetClassroomIds, $category, $status]);
            echo json_encode(["id" => $id, "error" => null]);
            break;

        case 'toggleAssignmentStatus':
            $id = $input['id'];
            $currentStatus = $input['currentStatus'];
            $newStatus = $currentStatus === 'LOCKED' ? 'OPEN' : 'LOCKED';

            $stmtSelect = $pdo->prepare("SELECT title FROM assignments WHERE id = ? LIMIT 1");
            $stmtSelect->execute([$id]);
            $row = $stmtSelect->fetch();

            if ($row) {
                $title = $row['title'] ?? '';
                $title = str_replace(['::LOCKED', '::OPEN'], '', $title);
                $title = trim($title);
                if ($newStatus === 'LOCKED') {
                    $title .= '::LOCKED';
                }
                $stmtUpdate = $pdo->prepare("UPDATE assignments SET title = ?, status = ? WHERE id = ?");
                $stmtUpdate->execute([$title, $newStatus, $id]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false]);
            }
            break;

        case 'deleteAssignment':
            $stmt = $pdo->prepare("DELETE FROM assignments WHERE id = ?");
            $stmt->execute([$input['id']]);
            echo json_encode(["success" => true]);
            break;

        case 'getQuestionsByAssignment':
            $stmt = $pdo->prepare("SELECT * FROM questions WHERE assignment_id = ?");
            $stmt->execute([$input['assignmentId']]);
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'addQuestion':
            $q = $input['q'];
            $id = $q['id'] ?? generateId('q_');
            $choices = json_encode([
                ["id" => "1", "text" => $q['c1'] ?? ""],
                ["id" => "2", "text" => $q['c2'] ?? ""],
                ["id" => "3", "text" => $q['c3'] ?? ""],
                ["id" => "4", "text" => $q['c4'] ?? ""]
            ]);
            $correct = $q['correct'] ?? '1';
            $targetClassrooms = json_encode($q['targetClassrooms'] ?? []);
            $targetClassroomIds = json_encode($q['targetClassroomIds'] ?? []);
            
            $stmt = $pdo->prepare("
                INSERT INTO questions (id, subject, grade, text, image, choices, correct_choice_id, explanation, school, teacher_id, assignment_id, target_classrooms, target_classroom_ids, unit) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $id, $q['subject'], $q['grade'], $q['text'], $q['image'] ?? '', $choices, $correct, $q['explanation'] ?? '',
                $q['school'], $q['teacherId'] ?? $q['teacher_id'] ?? '', $q['assignmentId'] ?? $q['assignment_id'] ?? null,
                $targetClassrooms, $targetClassroomIds, $q['unit'] ?? null
            ]);
            echo json_encode(["success" => true, "id" => $id]);
            break;

        case 'editQuestion':
            $q = $input['q'];
            $choices = json_encode([
                ["id" => "1", "text" => $q['c1'] ?? ""],
                ["id" => "2", "text" => $q['c2'] ?? ""],
                ["id" => "3", "text" => $q['c3'] ?? ""],
                ["id" => "4", "text" => $q['c4'] ?? ""]
            ]);
            $correct = $q['correct'] ?? '1';
            $targetClassrooms = json_encode($q['targetClassrooms'] ?? []);
            $targetClassroomIds = json_encode($q['targetClassroomIds'] ?? []);

            $stmt = $pdo->prepare("
                UPDATE questions 
                SET subject = ?, grade = ?, text = ?, image = ?, choices = ?, correct_choice_id = ?, explanation = ?, target_classrooms = ?, target_classroom_ids = ?, unit = ? 
                WHERE id = ?
            ");
            $stmt->execute([
                $q['subject'], $q['grade'], $q['text'], $q['image'] ?? '', $choices, $correct, $q['explanation'] ?? '',
                $targetClassrooms, $targetClassroomIds, $q['unit'] ?? null, $q['id']
            ]);
            echo json_encode(["success" => true]);
            break;

        case 'getTeacherById':
            $stmt = $pdo->prepare("SELECT * FROM teachers WHERE id = ? LIMIT 1");
            $stmt->execute([$input['id']]);
            echo json_encode(["teacher" => $stmt->fetch() ?: null]);
            break;

        case 'teacherLogin':
            $username = $input['username'];
            $password = $input['password'];
            
            $stmt = $pdo->prepare("SELECT * FROM teachers WHERE username = ? AND password = ? LIMIT 1");
            $stmt->execute([$username, $password]);
            $teacher = $stmt->fetch();

            if ($teacher) {
                if ($teacher['status'] !== 'active') {
                    echo json_encode(["success" => false, "message" => "บัญชีของคุณอยู่ระหว่างรออนุมัติหรือถูกระงับการใช้งาน"]);
                } else {
                    $stmtUpdate = $pdo->prepare("UPDATE teachers SET login_count = login_count + 1, last_login = ? WHERE id = ?");
                    $stmtUpdate->execute([time() * 1000, $teacher['id']]);
                    echo json_encode(["success" => true, "teacher" => $teacher]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"]);
            }
            break;

        case 'getSubjects':
            $stmt = $pdo->prepare("SELECT * FROM subjects WHERE school = ?");
            $stmt->execute([$input['school']]);
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'addSubject':
            $school = $input['school'];
            $sub = $input['sub'];
            $id = $sub['id'] ?? generateId('sub_');
            $targetClassrooms = json_encode($sub['targetClassrooms'] ?? []);
            $targetClassroomIds = json_encode($sub['targetClassroomIds'] ?? []);

            $stmt = $pdo->prepare("
                INSERT INTO subjects (id, name, school, teacher_id, grade, target_classrooms, target_classroom_ids, icon, color) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $id, $sub['name'], $school, $sub['teacherId'], $sub['grade'],
                $targetClassrooms, $targetClassroomIds, $sub['icon'] ?? '', $sub['color'] ?? ''
            ]);
            echo json_encode(["success" => true, "id" => $id]);
            break;

        case 'deleteSubject':
            $stmt = $pdo->prepare("DELETE FROM subjects WHERE id = ? AND school = ?");
            $stmt->execute([$input['id'], $input['school']]);
            echo json_encode(["success" => true]);
            break;

        case 'updateSchoolSettings':
            $schoolName = $input['schoolName'];
            $settings = $input['settings'];
            $allow = $settings['allowAllManageStudents'] ? 1 : 0;
            
            $stmt = $pdo->prepare("UPDATE schools SET allow_all_manage_students = ? WHERE name = ?");
            $stmt->execute([$allow, $schoolName]);
            echo json_encode(["success" => true]);
            break;

        case 'manageTeacher':
            $type = $input['type'];
            $payload = $input['payload'];
            
            if ($type === 'edit') {
                $teachingClasses = json_encode($payload['teachingClasses'] ?? []);
                $teachingClassroomIds = json_encode($payload['teachingClassroomIds'] ?? []);
                
                $stmt = $pdo->prepare("
                    UPDATE teachers 
                    SET name = ?, position = ?, teaching_classes = ?, teaching_classroom_ids = ?, grade_level = ?, avatar = ?, password = COALESCE(NULLIF(?, ''), password) 
                    WHERE id = ?
                ");
                $stmt->execute([
                    $payload['name'], $payload['position'], $teachingClasses, $teachingClassroomIds,
                    $payload['gradeLevel'], $payload['avatar'] ?? null, $payload['password'] ?? '', $payload['id']
                ]);
                echo json_encode(["success" => true]);
            } else if ($type === 'update_role') {
                $stmt = $pdo->prepare("UPDATE teachers SET role = ? WHERE id = ?");
                $stmt->execute([$payload['role'], $payload['id']]);
                echo json_encode(["success" => true]);
            } else if ($type === 'update_status') {
                $stmt = $pdo->prepare("UPDATE teachers SET status = ? WHERE id = ?");
                $stmt->execute([$payload['status'], $payload['id']]);
                echo json_encode(["success" => true]);
            } else if ($type === 'delete') {
                $stmt = $pdo->prepare("DELETE FROM teachers WHERE id = ?");
                $stmt->execute([$payload['id']]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false]);
            }
            break;

        case 'manageSchool':
            $type = $input['type'];
            $payload = $input['payload'];

            if ($type === 'add') {
                $stmt = $pdo->prepare("INSERT INTO schools (name, school_code, status) VALUES (?, ?, 'active')");
                $stmt->execute([$payload['name'], $payload['schoolCode']]);
                echo json_encode(["success" => true]);
            } else if ($type === 'update_status') {
                $stmt = $pdo->prepare("UPDATE schools SET status = ? WHERE id = ?");
                $stmt->execute([$payload['status'], $payload['id']]);
                echo json_encode(["success" => true]);
            } else if ($type === 'delete') {
                $stmt = $pdo->prepare("DELETE FROM schools WHERE id = ?");
                $stmt->execute([$payload['id']]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false]);
            }
            break;

        case 'findSchoolByCode':
            $stmt = $pdo->prepare("SELECT * FROM schools WHERE school_code = ? LIMIT 1");
            $stmt->execute([$input['code']]);
            echo json_encode(["school" => $stmt->fetch() ?: null]);
            break;

        case 'requestRegistration':
            $payload = $input['payload'];
            $stmt = $pdo->prepare("
                INSERT INTO registration_requests (citizen_id, name, surname, school_id, school_name, school_code, position, type, timestamp, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([
                $payload['citizenId'], $payload['name'], $payload['surname'], $payload['schoolId'], 
                $payload['schoolName'] ?? '', $payload['schoolCode'] ?? '', $payload['position'] ?? '', $payload['type'], time() * 1000
            ]);
            echo json_encode(["success" => true]);
            break;

        case 'approveRegistration':
            $req = $input['req'];
            $role = $input['role'];
            $grade = $input['grade'];
            $schoolName = $input['schoolName'];

            if ($req['type'] === 'SCHOOL') {
                // insert school if not exist
                $stmtSchool = $pdo->prepare("INSERT IGNORE INTO schools (name, school_code, status) VALUES (?, ?, 'active')");
                $stmtSchool->execute([$req['schoolName'], $req['schoolCode']]);

                // insert teacher
                $stmtTeacher = $pdo->prepare("
                    INSERT INTO teachers (id, username, password, name, school, citizen_id, role, status, position, grade_level) 
                    VALUES (?, ?, '123456', ?, ?, ?, 'SCHOOL_ADMIN', 'active', ?, 'ALL')
                ");
                $stmtTeacher->execute([generateId('tea_'), $req['citizenId'], $req['name'] . ' ' . $req['surname'], $req['schoolName'], $req['citizenId'], $req['position']]);
            } else {
                $stmtTeacher = $pdo->prepare("
                    INSERT INTO teachers (id, username, password, name, school, citizen_id, role, status, position, grade_level) 
                    VALUES (?, ?, '123456', ?, ?, ?, ?, 'active', ?, ?)
                ");
                $stmtTeacher->execute([generateId('tea_'), $req['citizenId'], $req['name'] . ' ' . $req['surname'], $schoolName, $req['citizenId'], $role, $req['position'], $grade]);
            }

            $stmtApprove = $pdo->prepare("UPDATE registration_requests SET status = 'approved' WHERE id = ?");
            $stmtApprove->execute([$req['id']]);
            echo json_encode(["success" => true]);
            break;

        case 'rejectRegistration':
            $stmt = $pdo->prepare("UPDATE registration_requests SET status = 'rejected' WHERE id = ?");
            $stmt->execute([$input['id']]);
            echo json_encode(["success" => true]);
            break;

        case 'getAllPendingRegistrations':
            $stmt = $pdo->query("SELECT * FROM registration_requests WHERE status = 'pending'");
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'manageStudent':
            $type = $input['type'];
            $payload = $input['payload'];

            if ($type === 'add') {
                $id = $payload['id'] ?? generateId('std_');
                $stmt = $pdo->prepare("
                    INSERT INTO students (id, name, username, password, school, avatar, grade, classroom, stars) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                ");
                $stmt->execute([$id, $payload['name'], $payload['username'], $payload['password'], $payload['school'], $payload['avatar'] ?? '👶', $payload['grade'], $payload['classroom']]);
                echo json_encode(["success" => true, "student" => ["id" => $id] + $payload + ["stars" => 0]]);
            } else if ($type === 'edit') {
                $stmt = $pdo->prepare("
                    UPDATE students 
                    SET name = ?, username = ?, password = COALESCE(NULLIF(?, ''), password), avatar = ?, grade = ?, classroom = ? 
                    WHERE id = ?
                ");
                $stmt->execute([
                    $payload['name'], $payload['username'], $payload['password'] ?? '', $payload['avatar'] ?? '👶',
                    $payload['grade'], $payload['classroom'], $payload['id']
                ]);
                echo json_encode(["success" => true]);
            } else if ($type === 'delete') {
                $stmt = $pdo->prepare("DELETE FROM students WHERE id = ?");
                $stmt->execute([$payload['id']]);
                echo json_encode(["success" => true]);
            } else if ($type === 'promote_bulk') {
                $studentIds = $payload['studentIds'] ?? [];
                $newGrade = $payload['newGrade'];
                if (count($studentIds) > 0) {
                    $inPlaceholders = implode(',', array_fill(0, count($studentIds), '?'));
                    $stmt = $pdo->prepare("UPDATE students SET grade = ? WHERE id IN ($inPlaceholders)");
                    $stmt->execute(array_merge([$newGrade], $studentIds));
                }
                echo json_encode(["success" => true]);
            } else if ($type === 'reset_stars') {
                $stmt = $pdo->prepare("UPDATE students SET stars = 0 WHERE id = ?");
                $stmt->execute([$payload['id']]);
                echo json_encode(["success" => true]);
            } else if ($type === 'reset_scores') {
                $stmt = $pdo->prepare("DELETE FROM exam_results WHERE student_id = ?");
                $stmt->execute([$payload['id']]);
                echo json_encode(["success" => true]);
            } else if ($type === 'change_password') {
                $stmt = $pdo->prepare("UPDATE students SET password = ? WHERE id = ?");
                $stmt->execute([$payload['password'], $payload['id']]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false]);
            }
            break;

        case 'getClassrooms':
            $stmt = $pdo->prepare("SELECT * FROM classrooms WHERE school = ? ORDER BY name ASC");
            $stmt->execute([$input['school']]);
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'manageClassroom':
            $type = $input['type'];
            $payload = $input['payload'];

            if ($type === 'add') {
                $name = $payload['gradeLevel'] . '/' . $payload['roomNumber'];
                $stmt = $pdo->prepare("INSERT INTO classrooms (school, grade_level, room_number, name) VALUES (?, ?, ?, ?)");
                $stmt->execute([$payload['school'], $payload['gradeLevel'], $payload['roomNumber'], $name]);
                echo json_encode(["success" => true]);
            } else if ($type === 'delete') {
                $stmt = $pdo->prepare("DELETE FROM classrooms WHERE id = ?");
                $stmt->execute([$payload['id']]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false]);
            }
            break;

        case 'deleteQuestion':
            $stmt = $pdo->prepare("DELETE FROM questions WHERE id = ?");
            $stmt->execute([$input['id']]);
            echo json_encode(["success" => true]);
            break;

        case 'getQuestionsBySubject':
            $stmt = $pdo->prepare("SELECT * FROM questions WHERE subject = ?");
            $stmt->execute([$input['subject']]);
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'getQuestionsBySubjectAndGrade':
            $stmt = $pdo->prepare("SELECT * FROM questions WHERE subject = ? AND grade = ? AND school = ?");
            $stmt->execute([$input['subject'], $input['grade'], $input['school']]);
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'redeemReward':
            $studentId = $input['studentId'];
            $rewardId = $input['rewardId'];
            $cost = (int)$input['cost'];

            $stmtSelect = $pdo->prepare("SELECT stars, inventory FROM students WHERE id = ? LIMIT 1");
            $stmtSelect->execute([$studentId]);
            $student = $stmtSelect->fetch();

            if ($student && (int)$student['stars'] >= $cost) {
                $inv = safeJsonParse($student['inventory']);
                $inv[] = $rewardId;
                
                $stmtUpdate = $pdo->prepare("UPDATE students SET stars = stars - ?, inventory = ? WHERE id = ?");
                $stmtUpdate->execute([$cost, json_encode($inv), $studentId]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false]);
            }
            break;

        case 'getSchools':
            $stmt = $pdo->query("SELECT * FROM schools ORDER BY name ASC");
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'getAllTeachers':
            $stmt = $pdo->query("SELECT * FROM teachers ORDER BY name ASC");
            echo json_encode(["data" => $stmt->fetchAll()]);
            break;

        case 'getSuperAdminStats':
            $students = $pdo->query("SELECT * FROM students")->fetchAll();
            $results = $pdo->query("SELECT * FROM exam_results")->fetchAll();
            $teachers = $pdo->query("SELECT * FROM teachers")->fetchAll();
            echo json_encode([
                "students" => $students,
                "results" => $results,
                "teachers" => $teachers
            ]);
            break;

        default:
            http_response_code(400);
            echo json_encode(["error" => "Unknown action: " . $action]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
