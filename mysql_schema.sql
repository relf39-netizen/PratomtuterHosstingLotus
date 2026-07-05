-- MySQL Database Schema for Pratom Smart Tutor
-- Compatible with MySQL 5.7+ & phpMyAdmin (Windows Plesk Server)
-- Note for Shared Hosting (Plesk/cPanel): 
-- 1. Create a database via your Hosting Panel (e.g., Plesk) first.
-- 2. Select the database and import this SQL file.
-- 3. We have commented out the CREATE DATABASE and USE statements below to prevent privilege/access denied errors.

-- CREATE DATABASE IF NOT EXISTS `pratom_smart_tutor` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `pratom_smart_tutor`;

-- 1. Table: app_settings
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `logo_url` TEXT NULL,
  `app_name` VARCHAR(191) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default app_settings
INSERT IGNORE INTO `app_settings` (`id`, `logo_url`, `app_name`) 
VALUES (1, 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png', 'Pratom Smart Tutor');

-- 2. Table: schools
CREATE TABLE IF NOT EXISTS `schools` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `school_code` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `allow_all_manage_students` TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY `idx_school_name` (`name`),
  UNIQUE KEY `idx_school_code` (`school_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: classrooms
CREATE TABLE IF NOT EXISTS `classrooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school` VARCHAR(191) NOT NULL,
  `grade_level` VARCHAR(191) NOT NULL,
  `room_number` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: students
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `school` VARCHAR(191) NOT NULL,
  `avatar` VARCHAR(191) NULL,
  `grade` VARCHAR(191) NOT NULL,
  `classroom` VARCHAR(191) NOT NULL,
  `stars` INT NOT NULL DEFAULT 0,
  `inventory` TEXT NULL,
  `login_count` INT NOT NULL DEFAULT 0,
  `last_login` BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY `idx_student_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: teachers
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `username` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `school` VARCHAR(191) NOT NULL,
  `citizen_id` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL DEFAULT 'TEACHER',
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `position` VARCHAR(191) NULL,
  `grade_level` VARCHAR(191) NULL,
  `avatar` VARCHAR(191) NULL,
  `advisor_class` VARCHAR(191) NULL,
  `teaching_classes` TEXT NULL,
  `teaching_classroom_ids` TEXT NULL,
  `login_count` INT NOT NULL DEFAULT 0,
  `last_login` BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY `idx_teacher_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default super admin
-- Username: admin, password: password123
INSERT IGNORE INTO `teachers` (`id`, `username`, `password`, `name`, `school`, `citizen_id`, `role`, `status`, `position`, `grade_level`) 
VALUES ('admin-sys-id', 'admin', 'password123', 'System Administrator', 'โรงเรียนสาธิตรวมใจ', '0000000000000', 'SUPER_ADMIN', 'active', 'ผู้ดูแลระบบ', 'ALL');

-- Seed requested Super Admin: peyarm
-- Username: peyarm, password: Siam@2520
INSERT IGNORE INTO `teachers` (`id`, `username`, `password`, `name`, `school`, `citizen_id`, `role`, `status`, `position`, `grade_level`) 
VALUES ('super-admin-peyarm', 'peyarm', 'Siam@2520', 'Super Admin (peyarm)', 'โรงเรียนทั่วไป', '1111111111111', 'SUPER_ADMIN', 'active', 'ผู้ดูแลระบบสูงสุด', 'ALL');

-- 6. Table: subjects
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `school` VARCHAR(191) NOT NULL,
  `teacher_id` VARCHAR(191) NOT NULL,
  `grade` VARCHAR(191) NOT NULL,
  `target_classrooms` TEXT NULL,
  `target_classroom_ids` TEXT NULL,
  `icon` VARCHAR(191) NULL,
  `color` VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: assignments
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `school` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `grade` VARCHAR(191) NOT NULL,
  `question_count` INT NOT NULL DEFAULT 0,
  `deadline` VARCHAR(191) NOT NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `target_classrooms` TEXT NULL,
  `target_classroom_ids` TEXT NULL,
  `category` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
  `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: questions
CREATE TABLE IF NOT EXISTS `questions` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `subject` VARCHAR(191) NOT NULL,
  `grade` VARCHAR(191) NOT NULL,
  `text` TEXT NOT NULL,
  `image` TEXT NULL,
  `choices` TEXT NOT NULL,
  `correct_choice_id` VARCHAR(191) NOT NULL DEFAULT '1',
  `explanation` TEXT NULL,
  `school` VARCHAR(191) NOT NULL,
  `teacher_id` VARCHAR(191) NOT NULL,
  `assignment_id` VARCHAR(191) NULL,
  `target_classrooms` TEXT NULL,
  `target_classroom_ids` TEXT NULL,
  `unit` VARCHAR(191) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table: exam_results
CREATE TABLE IF NOT EXISTS `exam_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(191) NOT NULL,
  `student_name` VARCHAR(191) NOT NULL,
  `school` VARCHAR(191) NOT NULL,
  `score` INT NOT NULL,
  `total_questions` INT NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `assignment_id` VARCHAR(191) NULL,
  `category` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
  `timestamp` BIGINT NOT NULL,
  `details` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table: registration_requests
CREATE TABLE IF NOT EXISTS `registration_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `citizen_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `surname` VARCHAR(191) NOT NULL,
  `school_id` VARCHAR(191) NOT NULL,
  `school_name` VARCHAR(191) NULL,
  `school_code` VARCHAR(191) NULL,
  `position` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL,
  `timestamp` BIGINT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Table: finance_accounts
CREATE TABLE IF NOT EXISTS `finance_accounts` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `school_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Table: finance_transactions
CREATE TABLE IF NOT EXISTS `finance_transactions` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `school_id` VARCHAR(191) NOT NULL,
  `account_id` VARCHAR(191) NOT NULL,
  `date` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DOUBLE NOT NULL,
  `type` VARCHAR(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Table: tpat_tgat_questions
CREATE TABLE IF NOT EXISTS `tpat_tgat_questions` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `category` VARCHAR(191) NOT NULL,
  `text` TEXT NOT NULL,
  `choices` TEXT NOT NULL,
  `correct_choice_id` VARCHAR(191) NOT NULL,
  `explanation` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

