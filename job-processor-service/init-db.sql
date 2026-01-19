-- init-db.sql
-- Script de inicialización de la base de datos

-- Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear extensión para JSONB
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Configuración de timezone
SET timezone = 'America/Mexico_City';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Base de datos inicializada correctamente para Email Service';
END $$;