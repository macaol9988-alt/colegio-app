-- =====================================================================
-- DESINSTALACAO - APAGA TODAS AS TABELAS E DADOS
-- =====================================================================
-- ATENCAO: rode apenas se quiser comecar do ZERO. Nao ha como desfazer.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `ticket_attachments`;
DROP TABLE IF EXISTS `ticket_history`;
DROP TABLE IF EXISTS `ticket_comments`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `attendance_records`;
DROP TABLE IF EXISTS `teacher_classes`;
DROP TABLE IF EXISTS `coordinator_teachers`;
DROP TABLE IF EXISTS `classes`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `school_settings`;

SET FOREIGN_KEY_CHECKS = 1;
