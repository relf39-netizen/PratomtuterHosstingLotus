-- MySQL Database Schema for Pratom Smart Tutor
-- Compatible with MySQL 5.7+ & phpMyAdmin (Windows Plesk Server)

CREATE DATABASE IF NOT EXISTS `pratom_smart_tutor` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pratom_smart_tutor`;

-- 1. Table: app_settings
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `logo_url` TEXT NULL,
  `app_name` VARCHAR(255) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default app_settings
INSERT IGNORE INTO `app_settings` (`id`, `logo_url`, `app_name`) 
VALUES (1, 'https://raw.githubusercontent.com/relf39/pratom-smart-tutor/main/public/mst-logo.png', 'Pratom Smart Tutor');

-- 2. Table: schools
CREATE TABLE IF NOT EXISTS `schools` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `school_code` VARCHAR(255) NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'active',
  `allow_all_manage_students` TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY `idx_school_name` (`name`),
  UNIQUE KEY `idx_school_code` (`school_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: classrooms
CREATE TABLE IF NOT EXISTS `classrooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school` VARCHAR(255) NOT NULL,
  `grade_level` VARCHAR(255) NOT NULL,
  `room_number` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: students
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `school` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(255) NULL,
  `grade` VARCHAR(255) NOT NULL,
  `classroom` VARCHAR(255) NOT NULL,
  `stars` INT NOT NULL DEFAULT 0,
  `inventory` TEXT NULL,
  `login_count` INT NOT NULL DEFAULT 0,
  `last_login` BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY `idx_student_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: teachers
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `school` VARCHAR(255) NOT NULL,
  `citizen_id` VARCHAR(255) NOT NULL,
  `role` VARCHAR(255) NOT NULL DEFAULT 'TEACHER',
  `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
  `position` VARCHAR(255) NULL,
  `grade_level` VARCHAR(255) NULL,
  `avatar` VARCHAR(255) NULL,
  `advisor_class` VARCHAR(255) NULL,
  `teaching_classes` TEXT NULL,
  `teaching_classroom_ids` TEXT NULL,
  `login_count` INT NOT NULL DEFAULT 0,
  `last_login` BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY `idx_teacher_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default super admin
-- username: admin, password: password123
INSERT IGNORE INTO `teachers` (`id`, `username`, `password`, `name`, `school`, `citizen_id`, `role`, `status`, `position`, `grade_level`) 
VALUES ('admin-sys-id', 'admin', 'password123', 'System Administrator', 'โรงเรียนสาธิตรวมใจ', '0000000000000', 'SUPER_ADMIN', 'active', 'ผู้ดูแลระบบ', 'ALL');

-- 6. Table: subjects
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `school` VARCHAR(255) NOT NULL,
  `teacher_id` VARCHAR(255) NOT NULL,
  `grade` VARCHAR(255) NOT NULL,
  `target_classrooms` TEXT NULL,
  `target_classroom_ids` TEXT NULL,
  `icon` VARCHAR(255) NULL,
  `color` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: assignments
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `school` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `grade` VARCHAR(255) NOT NULL,
  `question_count` INT NOT NULL DEFAULT 0,
  `deadline` VARCHAR(255) NOT NULL,
  `created_by` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `target_classrooms` TEXT NULL,
  `target_classroom_ids` TEXT NULL,
  `category` VARCHAR(255) NOT NULL DEFAULT 'GENERAL',
  `status` VARCHAR(255) NOT NULL DEFAULT 'OPEN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table: questions
CREATE TABLE IF NOT EXISTS `questions` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `subject` VARCHAR(255) NOT NULL,
  `grade` VARCHAR(255) NOT NULL,
  `text` TEXT NOT NULL,
  `image` TEXT NULL,
  `choices` TEXT NOT NULL,
  `correct_choice_id` VARCHAR(255) NOT NULL DEFAULT '1',
  `explanation` TEXT NULL,
  `school` VARCHAR(255) NOT NULL,
  `teacher_id` VARCHAR(255) NOT NULL,
  `assignment_id` VARCHAR(255) NULL,
  `target_classrooms` TEXT NULL,
  `target_classroom_ids` TEXT NULL,
  `unit` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table: exam_results
CREATE TABLE IF NOT EXISTS `exam_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(255) NOT NULL,
  `student_name` VARCHAR(255) NOT NULL,
  `school` VARCHAR(255) NOT NULL,
  `score` INT NOT NULL,
  `total_questions` INT NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `assignment_id` VARCHAR(255) NULL,
  `category` VARCHAR(255) NOT NULL DEFAULT 'GENERAL',
  `timestamp` BIGINT NOT NULL,
  `details` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table: registration_requests
CREATE TABLE IF NOT EXISTS `registration_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `citizen_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `surname` VARCHAR(255) NOT NULL,
  `school_id` VARCHAR(255) NOT NULL,
  `school_name` VARCHAR(255) NULL,
  `school_code` VARCHAR(255) NULL,
  `position` VARCHAR(255) NULL,
  `type` VARCHAR(255) NOT NULL,
  `timestamp` BIGINT NOT NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Table: finance_accounts
CREATE TABLE IF NOT EXISTS `finance_accounts` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `school_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Table: finance_transactions
CREATE TABLE IF NOT EXISTS `finance_transactions` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `school_id` VARCHAR(255) NOT NULL,
  `account_id` VARCHAR(255) NOT NULL,
  `date` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `amount` DOUBLE NOT NULL,
  `type` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Table: tpat_tgat_questions
CREATE TABLE IF NOT EXISTS `tpat_tgat_questions` (
  `id` VARCHAR(255) NOT NULL PRIMARY KEY,
  `category` VARCHAR(255) NOT NULL,
  `text` TEXT NOT NULL,
  `choices` TEXT NOT NULL,
  `correct_choice_id` VARCHAR(255) NOT NULL,
  `explanation` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

