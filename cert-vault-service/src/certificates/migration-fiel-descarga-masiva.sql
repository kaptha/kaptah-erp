-- cert-vault-service: soporte de descarga masiva con FIEL (fase 8, tanda 1). Idempotente.
ALTER TABLE fiel_certificates ADD COLUMN IF NOT EXISTS rfc varchar(13);
ALTER TABLE fiel_certificates ADD COLUMN IF NOT EXISTS password_encrypted text;
ALTER TABLE fiel_certificates ADD COLUMN IF NOT EXISTS descarga_masiva_autorizada boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_fiel_certificates_user_active ON fiel_certificates (user_id) WHERE status = 'active';
