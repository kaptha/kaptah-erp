-- cfdi-receiver-api: tabla de solicitudes de descarga masiva (fase 8, tanda 2). Idempotente.
CREATE TABLE IF NOT EXISTS sat_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_uid varchar(128) NOT NULL,
  rfc varchar(13) NOT NULL,
  id_solicitud varchar(36) NOT NULL UNIQUE,
  tipo varchar(10) NOT NULL,
  tipo_solicitud varchar(10) NOT NULL,
  fecha_inicial varchar(19) NOT NULL,
  fecha_final varchar(19) NOT NULL,
  estado varchar(15) NOT NULL DEFAULT 'ENVIADA',
  estado_solicitud_sat smallint,
  codigo_estado_sat integer,
  numero_cfdis integer NOT NULL DEFAULT 0,
  paquetes jsonb NOT NULL DEFAULT '[]'::jsonb,
  origen varchar(10) NOT NULL DEFAULT 'MANUAL',
  intentos_verificacion integer NOT NULL DEFAULT 0,
  ultima_verificacion timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sat_solicitudes_cuenta_estado ON sat_solicitudes (cuenta_uid, estado);
CREATE INDEX IF NOT EXISTS idx_sat_solicitudes_params ON sat_solicitudes (cuenta_uid, tipo, tipo_solicitud, fecha_inicial, fecha_final);
