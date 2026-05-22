-- ============================================================
-- Schema MySQL do Sistema do Colegio
-- Hora Extra de Professores + Chamados de TI
-- ============================================================
-- Execute este script no phpMyAdmin (ou via CLI) depois de
-- criar o banco e o usuario. O script eh idempotente:
-- pode rodar varias vezes sem perder dados.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. Configuracoes do colegio (linha unica id=1)
-- ============================================================
CREATE TABLE IF NOT EXISTS school_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name VARCHAR(200) NOT NULL DEFAULT 'Meu Colegio',
  cnpj VARCHAR(20) DEFAULT NULL,
  address VARCHAR(300) DEFAULT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  logo_path VARCHAR(300) DEFAULT NULL,
  primary_color VARCHAR(20) DEFAULT '#6c5ce7',
  accent_color VARCHAR(20) DEFAULT '#fd79a8',
  school_lat DECIMAL(10,7) DEFAULT -23.5505200,
  school_lng DECIMAL(10,7) DEFAULT -46.6333080,
  allowed_radius INT DEFAULT 120,
  max_accuracy INT DEFAULT 80,
  class_morning_start TIME DEFAULT '07:00:00',
  class_morning_end TIME DEFAULT '12:00:00',
  class_afternoon_start TIME DEFAULT '13:00:00',
  class_afternoon_end TIME DEFAULT '18:00:00',
  sla_critical_hours INT DEFAULT 2,
  sla_high_hours INT DEFAULT 8,
  sla_medium_hours INT DEFAULT 24,
  sla_low_hours INT DEFAULT 72,
  allow_self_register TINYINT(1) DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO school_settings (id) VALUES (1);

-- ============================================================
-- 2. Usuarios (professores, coordenadores, admins, TI)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  cpf VARCHAR(14) DEFAULT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('teacher','coordinator','ti','admin') NOT NULL DEFAULT 'teacher',
  status ENUM('pending','active','blocked') NOT NULL DEFAULT 'pending',
  must_change_password TINYINT(1) DEFAULT 0,
  activation_token VARCHAR(100) DEFAULT NULL,
  activation_expires DATETIME DEFAULT NULL,
  reset_token VARCHAR(100) DEFAULT NULL,
  reset_expires DATETIME DEFAULT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  avatar_path VARCHAR(300) DEFAULT NULL,
  last_login DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status),
  INDEX idx_users_activation (activation_token),
  INDEX idx_users_reset (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Vinculo coordenador <-> professor
-- ============================================================
CREATE TABLE IF NOT EXISTS coordinator_teachers (
  coordinator_id INT NOT NULL,
  teacher_id INT NOT NULL,
  PRIMARY KEY (coordinator_id, teacher_id),
  FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Turmas
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  shift ENUM('Manha','Tarde','Noite','Integral') NOT NULL DEFAULT 'Manha',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_class_year (name, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Vinculo professor <-> turma
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  class_id INT NOT NULL,
  year INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_teacher_class_year (teacher_id, class_id, year),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Registros de ponto / hora extra
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  teacher_name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy DECIMAL(8,2) NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  school_lat DECIMAL(10,7) NOT NULL,
  school_lng DECIMAL(10,7) NOT NULL,
  allowed_radius INT NOT NULL,
  gps_status VARCHAR(40) NOT NULL,
  approval_status ENUM('Pendente','Aprovado','Rejeitado') DEFAULT 'Pendente',
  approved_by_id INT DEFAULT NULL,
  approved_by_name VARCHAR(200) DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  within_class_hours TINYINT(1) DEFAULT 0,
  justification TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attendance_teacher (teacher_id),
  INDEX idx_attendance_date (created_at),
  INDEX idx_attendance_approval (approval_status),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Chamados de TI
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(20) NOT NULL UNIQUE,
  created_by_id INT NOT NULL,
  created_by_name VARCHAR(200) NOT NULL,
  assigned_to_id INT DEFAULT NULL,
  assigned_to_name VARCHAR(200) DEFAULT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('Rede','Hardware','Software','Impressora','Telefonia','Acesso','Outros') NOT NULL DEFAULT 'Outros',
  priority ENUM('Critica','Alta','Media','Baixa') NOT NULL DEFAULT 'Media',
  status ENUM('Aberto','EmAndamento','Aguardando','Resolvido','Fechado') NOT NULL DEFAULT 'Aberto',
  location VARCHAR(200) DEFAULT NULL,
  sla_due_at DATETIME DEFAULT NULL,
  first_response_at DATETIME DEFAULT NULL,
  resolved_at DATETIME DEFAULT NULL,
  closed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tickets_status (status),
  INDEX idx_tickets_priority (priority),
  INDEX idx_tickets_assigned (assigned_to_id),
  INDEX idx_tickets_created_by (created_by_id),
  INDEX idx_tickets_sla (sla_due_at),
  FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. Comentarios em chamados
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_internal TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comments_ticket (ticket_id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. Historico de mudancas em chamados (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(200) NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_value VARCHAR(200) DEFAULT NULL,
  new_value VARCHAR(200) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_history_ticket (ticket_id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. Anexos em chamados (futuro - prints, fotos)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_path VARCHAR(300) NOT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  size_bytes INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
