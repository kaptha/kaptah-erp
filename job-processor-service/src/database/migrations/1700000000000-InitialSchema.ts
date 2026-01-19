import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla email_logs
    await queryRunner.query(`
      CREATE TABLE "email_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" character varying NOT NULL,
        "organization_id" character varying NOT NULL,
        "email_type" character varying NOT NULL,
        "recipient" character varying NOT NULL,
        "subject" character varying(500) NOT NULL,
        "template_used" character varying,
        "status" character varying NOT NULL DEFAULT 'queued',
        "provider" character varying NOT NULL,
        "provider_message_id" character varying,
        "error_message" text,
        "retry_count" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "sent_at" TIMESTAMP,
        CONSTRAINT "PK_email_logs" PRIMARY KEY ("id")
      )
    `);

    // Crear índices para email_logs
    await queryRunner.query(`
      CREATE INDEX "IDX_email_logs_user_org" 
      ON "email_logs"("user_id", "organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_logs_status" 
      ON "email_logs"("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_logs_created_at" 
      ON "email_logs"("created_at")
    `);

    // Crear tabla scheduled_emails
    await queryRunner.query(`
      CREATE TABLE "scheduled_emails" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" character varying NOT NULL,
        "organization_id" character varying NOT NULL,
        "email_type" character varying NOT NULL,
        "recipient" character varying NOT NULL,
        "subject" character varying(500) NOT NULL,
        "template_data" jsonb NOT NULL,
        "scheduled_for" TIMESTAMP NOT NULL,
        "recurrence" character varying,
        "status" character varying NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP,
        CONSTRAINT "PK_scheduled_emails" PRIMARY KEY ("id")
      )
    `);

    // Crear índices para scheduled_emails
    await queryRunner.query(`
      CREATE INDEX "IDX_scheduled_emails_scheduled_for" 
      ON "scheduled_emails"("scheduled_for")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_scheduled_emails_status" 
      ON "scheduled_emails"("status")
    `);

    // Crear tabla email_tracking
    await queryRunner.query(`
      CREATE TABLE "email_tracking" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email_log_id" uuid NOT NULL,
        "event_type" character varying NOT NULL,
        "event_data" jsonb,
        "ip_address" character varying,
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_tracking" PRIMARY KEY ("id")
      )
    `);

    // Crear índices para email_tracking
    await queryRunner.query(`
      CREATE INDEX "IDX_email_tracking_email_log_id" 
      ON "email_tracking"("email_log_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_email_tracking_event_type" 
      ON "email_tracking"("event_type")
    `);

    // Crear tabla email_attachments
    await queryRunner.query(`
      CREATE TABLE "email_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email_log_id" uuid NOT NULL,
        "filename" character varying NOT NULL,
        "file_size" integer,
        "mime_type" character varying NOT NULL,
        "storage_path" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_attachments" PRIMARY KEY ("id")
      )
    `);

    // Crear foreign keys
    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      ADD CONSTRAINT "FK_email_tracking_email_log" 
      FOREIGN KEY ("email_log_id") 
      REFERENCES "email_logs"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "email_attachments" 
      ADD CONSTRAINT "FK_email_attachments_email_log" 
      FOREIGN KEY ("email_log_id") 
      REFERENCES "email_logs"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    await queryRunner.query(`
      ALTER TABLE "email_attachments" 
      DROP CONSTRAINT "FK_email_attachments_email_log"
    `);

    await queryRunner.query(`
      ALTER TABLE "email_tracking" 
      DROP CONSTRAINT "FK_email_tracking_email_log"
    `);

    // Eliminar tablas
    await queryRunner.query(`DROP TABLE "email_attachments"`);
    await queryRunner.query(`DROP TABLE "email_tracking"`);
    await queryRunner.query(`DROP TABLE "scheduled_emails"`);
    await queryRunner.query(`DROP TABLE "email_logs"`);
  }
}