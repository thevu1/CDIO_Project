/*
 Navicat Premium Data Transfer

 Source Server         : 123
 Source Server Type    : MySQL
 Source Server Version : 80408 (8.4.8)
 Source Host           : localhost:3306
 Source Schema         : healthquest_app

 Target Server Type    : MySQL
 Target Server Version : 80408 (8.4.8)
 File Encoding         : 65001

 Date: 12/04/2026 07:35:41
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for accounts
-- ----------------------------
DROP TABLE IF EXISTS `accounts`;
CREATE TABLE `accounts`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenDangNhap` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `verify_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `verify_expires` datetime NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_tenDangNhap`(`tenDangNhap` ASC) USING BTREE,
  UNIQUE INDEX `uq_email`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of accounts
-- ----------------------------
INSERT INTO `accounts` VALUES (1, 'he', 'temnguyenvu@gmail.com', '$2b$10$F8e/.DxUgkli4PIyJt/c3OALyOtBoFEnL9WEE9VKrJC0fBSNNReoG', 1, NULL, NULL, '2026-04-11 20:42:19');
INSERT INTO `accounts` VALUES (2, 'vu', 'nguyenthevu4@dtu.edu.vn', '$2b$10$r31fbkJJfFXeVo0ZDjdP3uF5TD74BX9mNh.ZNV6V657ngrsXcmtuq', 1, NULL, NULL, '2026-04-11 23:38:04');

-- ----------------------------
-- Table structure for cities
-- ----------------------------
DROP TABLE IF EXISTS `cities`;
CREATE TABLE `cities`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cities
-- ----------------------------
INSERT INTO `cities` VALUES (1, 'Hà Nội');
INSERT INTO `cities` VALUES (2, 'Hồ Chí Minh');
INSERT INTO `cities` VALUES (3, 'Đà Nẵng');
INSERT INTO `cities` VALUES (4, 'Cần Thơ');
INSERT INTO `cities` VALUES (5, 'Hải Phòng');

-- ----------------------------
-- Table structure for focus_sessions
-- ----------------------------
DROP TABLE IF EXISTS `focus_sessions`;
CREATE TABLE `focus_sessions`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `focus_mode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'unknown',
  `focus_duration_seconds` int UNSIGNED NOT NULL DEFAULT 0,
  `time_remaining_seconds` int UNSIGNED NOT NULL DEFAULT 0,
  `status` enum('completed','unfinished') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'unfinished',
  `duration_formatted` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci GENERATED ALWAYS AS (concat(lpad(floor((`focus_duration_seconds` / 3600)),2,_utf8mb4'0'),_utf8mb4':',lpad(floor(((`focus_duration_seconds` % 3600) / 60)),2,_utf8mb4'0'),_utf8mb4':',lpad((`focus_duration_seconds` % 60),2,_utf8mb4'0'))) STORED NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_focus_user`(`user_id` ASC) USING BTREE,
  INDEX `idx_focus_created`(`created_at` ASC) USING BTREE,
  CONSTRAINT `fk_focus_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of focus_sessions
-- ----------------------------
INSERT INTO `focus_sessions` VALUES (1, 1, 'screen', 3, 2697, 'unfinished', DEFAULT, '2026-04-12 07:16:10');

-- ----------------------------
-- Table structure for friends
-- ----------------------------
DROP TABLE IF EXISTS `friends`;
CREATE TABLE `friends`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `friend_id` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_friendship`(`user_id` ASC, `friend_id` ASC) USING BTREE,
  INDEX `idx_friend_id`(`friend_id` ASC) USING BTREE,
  CONSTRAINT `fk_friends_friend` FOREIGN KEY (`friend_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_friends_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 15 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of friends
-- ----------------------------
INSERT INTO `friends` VALUES (11, 1, 2, '2026-04-12 00:14:44');
INSERT INTO `friends` VALUES (12, 2, 1, '2026-04-12 00:14:44');

-- ----------------------------
-- Table structure for group_members
-- ----------------------------
DROP TABLE IF EXISTS `group_members`;
CREATE TABLE `group_members`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `steps` int UNSIGNED NOT NULL DEFAULT 0,
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_group_member`(`group_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_gm_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_gm_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`group_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_gm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of group_members
-- ----------------------------

-- ----------------------------
-- Table structure for groups
-- ----------------------------
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups`  (
  `group_id` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `sport` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_by` int UNSIGNED NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`) USING BTREE,
  INDEX `idx_group_creator`(`created_by` ASC) USING BTREE,
  CONSTRAINT `fk_group_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of groups
-- ----------------------------

-- ----------------------------
-- Table structure for streak_history
-- ----------------------------
DROP TABLE IF EXISTS `streak_history`;
CREATE TABLE `streak_history`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `streak_date` date NOT NULL,
  `is_streak_day` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_streak_date`(`user_id` ASC, `streak_date` ASC) USING BTREE,
  INDEX `idx_streak_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_streak_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of streak_history
-- ----------------------------
INSERT INTO `streak_history` VALUES (1, 1, '2026-04-12', 1);
INSERT INTO `streak_history` VALUES (2, 1, '2026-04-11', 1);
INSERT INTO `streak_history` VALUES (3, 1, '2026-04-10', 1);
INSERT INTO `streak_history` VALUES (4, 1, '2026-04-09', 1);

-- ----------------------------
-- Table structure for tasks
-- ----------------------------
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `task_date` date NOT NULL DEFAULT (curdate()),
  `walk_completed` tinyint(1) NOT NULL DEFAULT 0,
  `walk_xp_claimed` tinyint(1) NOT NULL DEFAULT 0,
  `focus_completed` tinyint(1) NOT NULL DEFAULT 0,
  `focus_xp_claimed` tinyint(1) NOT NULL DEFAULT 0,
  `meditate_10min` tinyint(1) NOT NULL DEFAULT 0,
  `meditate_10min_xp_claimed` tinyint(1) NOT NULL DEFAULT 0,
  `exercise_20min` tinyint(1) NOT NULL DEFAULT 0,
  `exercise_20min_xp_claimed` tinyint(1) NOT NULL DEFAULT 0,
  `reading_10min` tinyint(1) NOT NULL DEFAULT 0,
  `reading_10min_xp_claimed` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_user_date`(`user_id` ASC, `task_date` ASC) USING BTREE,
  INDEX `idx_tasks_user`(`user_id` ASC) USING BTREE,
  CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 112 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tasks
-- ----------------------------
INSERT INTO `tasks` VALUES (1, 1, '2026-04-11', 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, '2026-04-11 20:42:38');
INSERT INTO `tasks` VALUES (33, 2, '2026-04-11', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '2026-04-11 23:38:44');
INSERT INTO `tasks` VALUES (100, 1, '2026-04-12', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '2026-04-12 07:15:46');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_id` int UNSIGNED NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `avatar` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `birthdate` date NULL DEFAULT NULL,
  `city_id` int UNSIGNED NULL DEFAULT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `profile_completed` tinyint(1) NOT NULL DEFAULT 0,
  `xp` int UNSIGNED NOT NULL DEFAULT 0,
  `level` int UNSIGNED NOT NULL DEFAULT 1,
  `xp_to_next` int UNSIGNED NOT NULL DEFAULT 100,
  `streak` int UNSIGNED NOT NULL DEFAULT 0,
  `total_streak` int UNSIGNED NOT NULL DEFAULT 0,
  `last_completed` date NULL DEFAULT NULL,
  `privacy_settings` json NULL,
  `is_me` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `google_fit_connected` tinyint(1) NULL DEFAULT 0,
  `google_fit_token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `google_fit_refresh_token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `is_verified` tinyint(1) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uq_account`(`account_id` ASC) USING BTREE,
  INDEX `idx_city`(`city_id` ASC) USING BTREE,
  CONSTRAINT `fk_users_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_users_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 1, 'he', NULL, '2026-04-10', 3, '321', 1, 500, 3, 500, 0, 4, NULL, '{\"city_name\": \"friends\"}', 0, '2026-04-11 20:42:19', 0, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` VALUES (2, 2, 'vu', NULL, '2026-04-10', 4, '123', 1, 0, 1, 100, 0, 0, NULL, NULL, 0, '2026-04-11 23:38:04', 0, NULL, NULL, NULL, NULL, 0);

-- ----------------------------
-- Table structure for walk_sessions
-- ----------------------------
DROP TABLE IF EXISTS `walk_sessions`;
CREATE TABLE `walk_sessions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NULL DEFAULT NULL,
  `steps` int NULL DEFAULT NULL,
  `distance_km` float NULL DEFAULT NULL,
  `duration_seconds` int NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of walk_sessions
-- ----------------------------

-- ----------------------------
-- View structure for vw_focus_history
-- ----------------------------
DROP VIEW IF EXISTS `vw_focus_history`;
CREATE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `vw_focus_history` AS select `fs`.`id` AS `id`,`fs`.`user_id` AS `user_id`,`fs`.`focus_mode` AS `focus_mode`,`fs`.`focus_duration_seconds` AS `focus_duration_seconds`,`fs`.`duration_formatted` AS `duration_formatted`,`fs`.`status` AS `status`,`fs`.`created_at` AS `created_at` from `focus_sessions` `fs` order by `fs`.`created_at` desc;

-- ----------------------------
-- View structure for vw_leaderboard
-- ----------------------------
DROP VIEW IF EXISTS `vw_leaderboard`;
CREATE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `vw_leaderboard` AS select `u`.`id` AS `id`,`a`.`tenDangNhap` AS `tenDangNhap`,`u`.`name` AS `name`,`u`.`xp` AS `xp`,`u`.`level` AS `level`,`u`.`avatar` AS `avatar`,`u`.`is_me` AS `is_me`,`u`.`streak` AS `streak`,rank() OVER (ORDER BY `u`.`xp` desc )  AS `user_rank` from (`users` `u` join `accounts` `a` on((`a`.`id` = `u`.`account_id`))) order by `u`.`xp` desc;

-- ----------------------------
-- View structure for vw_profile
-- ----------------------------
DROP VIEW IF EXISTS `vw_profile`;
CREATE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW `vw_profile` AS select `u`.`id` AS `id`,`a`.`tenDangNhap` AS `tenDangNhap`,`u`.`name` AS `name`,`a`.`email` AS `email`,`u`.`avatar` AS `avatar`,`u`.`birthdate` AS `birthdate`,`u`.`city_id` AS `city_id`,`c`.`name` AS `city_name`,`u`.`phone_number` AS `phone_number`,`u`.`profile_completed` AS `profile_completed`,`u`.`xp` AS `xp`,`u`.`level` AS `level`,`u`.`xp_to_next` AS `xp_to_next`,`u`.`streak` AS `streak`,`u`.`total_streak` AS `total_streak`,`u`.`last_completed` AS `last_completed`,`u`.`privacy_settings` AS `privacy_settings`,`u`.`is_me` AS `is_me`,`u`.`created_at` AS `created_at`,(select count(0) from `friends` where (`friends`.`user_id` = `u`.`id`)) AS `friends`,(select count(0) from `tasks` where (`tasks`.`user_id` = `u`.`id`)) AS `tasks` from ((`users` `u` join `accounts` `a` on((`a`.`id` = `u`.`account_id`))) left join `cities` `c` on((`c`.`id` = `u`.`city_id`)));

SET FOREIGN_KEY_CHECKS = 1;
