-- Executar no banco configurado em MYSQL_DATABASE (MySQL 8+).
-- VARBINARY preserva a comparação exata, inclusive maiúsculas/minúsculas.
CREATE TABLE IF NOT EXISTS pcm_line_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    serial_number VARBINARY(2048) NOT NULL,
    entered_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pcm_line_entries_serial (serial_number)
) ENGINE=InnoDB;
