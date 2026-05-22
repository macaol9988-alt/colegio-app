-- =====================================================================
-- RESET DE DADOS (mantem as tabelas)
-- =====================================================================
--
-- ATENCAO: este script APAGA TODOS OS DADOS do sistema, exceto o admin
-- inicial e as configuracoes default. As tabelas continuam existindo.
--
-- Use apenas para testar / zerar o sistema antes de comecar a usar.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `ticket_attachments`;
TRUNCATE TABLE `ticket_history`;
TRUNCATE TABLE `ticket_comments`;
TRUNCATE TABLE `tickets`;
TRUNCATE TABLE `attendance_records`;
TRUNCATE TABLE `teacher_classes`;
TRUNCATE TABLE `coordinator_teachers`;
TRUNCATE TABLE `classes`;
DELETE FROM `users` WHERE `email` <> 'admin@colegio.com';

SET FOREIGN_KEY_CHECKS = 1;

-- Garante que o admin inicial existe
INSERT IGNORE INTO `users` (`name`, `email`, `cpf`, `password_hash`, `role`, `status`, `must_change_password`)
VALUES (
  'Administrador',
  'admin@colegio.com',
  NULL,
  '$2a$10$YqfAiTvuANnE6haAe3uK2e05./nc1ijg8rdSB5bjTTCpEoI.NwsNO',
  'admin',
  'active',
  1
);
