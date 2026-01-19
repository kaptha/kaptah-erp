import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleNotesController } from './sale-notes.controller';
import { NoteVerificationController } from './note-verification.controller';
import { SaleNotesService } from './sale-notes.service';
import { NoteVerificationService } from './note-verification.service';
import { SaleNote } from './entities/sale-note.entity';
import { SucursalesModule } from '../sucursales/sucursales.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { EmailClientModule } from '../email-client/email-client.module';
import { DatabaseModule } from '../../database/database.module';
import { FirebaseModule } from '../../firebase/firebase.module';
import { LogoClientModule } from '../logo-client/logo-client.module';
import { QrGeneratorService } from '../cfdi/services/qr-generator.service';
import { QueueClientModule } from '../queue-client/queue-client.module';
@Module({
  imports: [TypeOrmModule.forFeature([SaleNote]), SucursalesModule, UsuariosModule, EmailClientModule, DatabaseModule, FirebaseModule, LogoClientModule, QueueClientModule],
  controllers: [SaleNotesController, NoteVerificationController],
  providers: [SaleNotesService, QrGeneratorService, NoteVerificationService],
  exports: [SaleNotesService]
})
export class SaleNotesModule {}
