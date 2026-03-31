/*
 Navicat Premium Data Transfer

 Source Server         : data
 Source Server Type    : MySQL
 Source Server Version : 90600 (9.6.0)
 Source Host           : localhost:3306
 Source Schema         : healthquest

 Target Server Type    : MySQL
 Target Server Version : 90600 (9.6.0)
 File Encoding         : 65001

 Date: 24/03/2026 16:35:47
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for daily_tasks
-- ----------------------------
DROP TABLE IF EXISTS `daily_tasks`;
CREATE TABLE `daily_tasks`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NULL DEFAULT NULL,
  `date` date NULL DEFAULT NULL,
  `walk_completed` tinyint(1) NULL DEFAULT NULL,
  `sleep_completed` tinyint(1) NULL DEFAULT NULL,
  `screen_completed` tinyint(1) NULL DEFAULT NULL,
  `focus_completed` tinyint(1) NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of daily_tasks
-- ----------------------------
INSERT INTO `daily_tasks` VALUES (1, 1, '2026-03-01', 1, 1, 1, 1);

-- ----------------------------
-- Table structure for focus_session
-- ----------------------------
DROP TABLE IF EXISTS `focus_session`;
CREATE TABLE `focus_session`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NULL DEFAULT NULL,
  `minutes` int NULL DEFAULT NULL,
  `mode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of focus_session
-- ----------------------------

-- ----------------------------
-- Table structure for screen_usage
-- ----------------------------
DROP TABLE IF EXISTS `screen_usage`;
CREATE TABLE `screen_usage`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NULL DEFAULT NULL,
  `app_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `minutes` int NULL DEFAULT NULL,
  `date` date NULL DEFAULT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of screen_usage
-- ----------------------------

-- ----------------------------
-- Table structure for sleep_log
-- ----------------------------
DROP TABLE IF EXISTS `sleep_log`;
CREATE TABLE `sleep_log`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NULL DEFAULT NULL,
  `sleep_start` datetime NULL DEFAULT NULL,
  `sleep_end` datetime NULL DEFAULT NULL,
  `duration` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sleep_log
-- ----------------------------

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `xp` int NOT NULL DEFAULT 0,
  `level` int NOT NULL DEFAULT 1,
  `avatar` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NG',
  `is_me` tinyint NOT NULL DEFAULT 0,
  `streak` int NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `xp_to_next` int NOT NULL DEFAULT 100,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `last_completed` date NULL DEFAULT NULL,
  `nickname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `birthday` date NULL DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `tasks_completed` int NOT NULL DEFAULT 0,
  `friends_count` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `name`(`name` ASC) USING BTREE,
  UNIQUE INDEX `email`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (4, 'Đỗ Hữu Trung', 100, 0, 'NG', 0, 3, '2026-03-21 16:48:56', 100, 'do21082005@gmail.com', '$2b$10$oV.149JDTV4.rkBeQD95BeRCj49ZDWMExpqbNm18COTZx59ACFO0O', NULL, 'hehe', NULL, NULL, NULL, 0, 0);
INSERT INTO `users` VALUES (5, 'Trần Thị Diễm', 0, 0, 'NG', 0, 0, '2026-03-21 19:46:45', 100, 'diem2404@gmail.com', '$2b$10$XbrJjNYiFZB1WQOGVgdxAeuG9McWq79PYHZa/KzqNQDcHIt9iYfzq', NULL, 'Warrior', NULL, NULL, NULL, 0, 0);
INSERT INTO `users` VALUES (6, 'Nguyễn Thế Vũ', 200, 1, 'NG', 0, 0, '2026-03-21 19:48:22', 100, 'vu1902@gmail.com', '$2b$10$zlZcjjC0iqXA5Q//yIigCOyZjwVxzb3uSVPZHSXx1rfcjSfkON5mO', NULL, 'haha', NULL, NULL, NULL, 0, 0);

SET FOREIGN_KEY_CHECKS = 1;
