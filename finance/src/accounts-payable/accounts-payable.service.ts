import { EmailClientService } from '../email-client/email-client.service';
import { Injectable, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Account } from 'src/shared/entities/account.entity';
import { CreateAccountPayableDto } from './dto/create-account-payable.dto/create-account-payable.dto';
import { UpdateAccountPayableDto } from './dto/create-account-payable.dto/update-account-payable.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';

@Injectable()
export class AccountsPayableService {
  private readonly logger = new Logger(AccountsPayableService.name);
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectDataSource() // PostgreSQL por defecto
    private readonly postgresDataSource: DataSource,
    @InjectDataSource('mysql') // ✅ Conexión MySQL
    private readonly mysqlDataSource: DataSource,
    private readonly emailClientService: EmailClientService,
  ) {}

  // Crear cuenta por pagar
  async create(createAccountPayableDto: CreateAccountPayableDto, userId: string) {
    const account = this.accountRepository.create({
      userId,
      accountType: 'payable',
      status: 'pending',
      partnerId: createAccountPayableDto.providerId.toString(),
      cfdiId: createAccountPayableDto.documentId?.toString(),
      totalAmount: createAccountPayableDto.totalAmount,
      paidAmount: 0,
      creditDays: createAccountPayableDto.creditDays,
      creditRemainingDays: createAccountPayableDto.creditDays,
      dueDate: createAccountPayableDto.dueDate,
      providerName: createAccountPayableDto.providerName,
      providerRfc: createAccountPayableDto.providerRfc,
      documentType: createAccountPayableDto.documentType,
      documentNumber: createAccountPayableDto.documentNumber,
      documentReference: createAccountPayableDto.documentReference,
      concept: createAccountPayableDto.concept,
      issueDate: createAccountPayableDto.issueDate,
      notes: createAccountPayableDto.notes,
    });

    return this.accountRepository.save(account);
  }

  // ✅ Listar cuentas por pagar CON información del proveedor desde MySQL
  async findAll(userId: string) {
  const accounts = await this.accountRepository.find({
    where: { userId, accountType: 'payable' },
  });

  console.log('📦 Accounts encontrados:', accounts.length);

  const accountsWithProviderInfo = await Promise.all(
    accounts.map(async (acc) => {
      let providerInfo = null;
      const providerId = parseInt(acc.partnerId);
      
      console.log('🔍 Buscando proveedor ID:', providerId);

      if (!isNaN(providerId)) {
        try {
          // ✅ Usar solo las columnas que existen en la tabla
          const providers = await this.mysqlDataSource.query(
            `SELECT ID, Nombre, RFC, razon_social, Email, Telefono, 
                    categoria, calle, Colonia, municipio, pais, estado
             FROM proveedores 
             WHERE ID = ?`,
            [providerId]
          );

          const provider = providers[0];
          console.log('✅ Provider encontrado:', provider);

          if (provider) {
            providerInfo = {
              id: provider.ID,
              nombre: provider.Nombre,
              rfc: provider.RFC,
              razonSocial: provider.razon_social || provider.Nombre,
              email: provider.Email,
              telefono: provider.Telefono,
              categoria: provider.categoria,
              calle: provider.calle,
              colonia: provider.Colonia,
              municipio: provider.municipio,
              pais: provider.pais,
              estado: provider.estado,
            };
          }
        } catch (error) {
          console.error(`❌ Error fetching provider ${providerId}:`, error.message);
        }
      }

      return {
        ...acc,
        balance: Number(acc.totalAmount) - Number(acc.paidAmount),
        paymentDate: acc.paidAmount > 0 ? acc.updatedAt : null,
        providerInfo,
      };
    })
  );

  console.log('✅ Accounts con providerInfo:', accountsWithProviderInfo.length);
  return accountsWithProviderInfo;
}

  // ✅ Obtener una cuenta específica CON información del proveedor
  async findOne(id: string, userId: string) {
  const account = await this.accountRepository.findOne({
    where: { id, userId, accountType: 'payable' },
  });

  if (!account) throw new NotFoundException('Cuenta por pagar no encontrada');

  let providerInfo = null;
  const providerId = parseInt(account.partnerId);
  
  if (!isNaN(providerId)) {
    try {
      const providers = await this.mysqlDataSource.query(
        `SELECT ID, Nombre, RFC, razon_social, Email, Telefono, 
                categoria, calle, Colonia, municipio, pais, estado
         FROM proveedores 
         WHERE ID = ?`,
        [providerId]
      );

      const provider = providers[0];

      if (provider) {
        providerInfo = {
          id: provider.ID,
          nombre: provider.Nombre,
          rfc: provider.RFC,
          razonSocial: provider.razon_social || provider.Nombre,
          email: provider.Email,
          telefono: provider.Telefono,
          categoria: provider.categoria,
          calle: provider.calle,
          colonia: provider.Colonia,
          municipio: provider.municipio,
          pais: provider.pais,
          estado: provider.estado,
        };
      }
    } catch (error) {
      console.error(`❌ Error fetching provider ${providerId}:`, error.message);
    }
  }

  return {
    ...account,
    balance: Number(account.totalAmount) - Number(account.paidAmount),
    paymentDate: account.paidAmount > 0 ? account.updatedAt : null,
    providerInfo,
  };
}

  // Actualizar cuenta por pagar
  async update(id: string, dto: UpdateAccountPayableDto, userId: string) {
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Cuenta por pagar no encontrada');

    account.partnerId = dto.providerId?.toString() ?? account.partnerId;
    account.providerName = dto.providerName ?? account.providerName;
    account.providerRfc = dto.providerRfc ?? account.providerRfc;
    account.cfdiId = dto.documentId?.toString() ?? account.cfdiId;
    account.totalAmount = dto.totalAmount ?? account.totalAmount;
    account.creditDays = dto.creditDays ?? account.creditDays;
    account.creditRemainingDays = dto.creditRemainingDays ?? account.creditRemainingDays;
    account.dueDate = dto.dueDate ? new Date(dto.dueDate) : account.dueDate;
    account.issueDate = dto.issueDate ? new Date(dto.issueDate) : account.issueDate;
    account.notes = dto.notes ?? account.notes;

    return this.accountRepository.save(account);
  }

  // Eliminar cuenta por pagar
  async remove(id: string, userId: string) {
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Cuenta por pagar no encontrada');

    await this.accountRepository.delete(id);
    return { message: 'Cuenta por pagar eliminada correctamente' };
  }

  // Registrar un pago
  async registerPayment(id: string, paymentData: RegisterPaymentDto, userId: string) {
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Cuenta por pagar no encontrada');

    account.paidAmount = Number(account.paidAmount) + Number(paymentData.amount);

    if (account.paidAmount >= account.totalAmount) {
      account.status = 'paid';
    } else if (account.paidAmount > 0) {
      account.status = 'partial';
    }

    const updated = await this.accountRepository.save(account);

    return {
      ...updated,
      balance: Number(updated.totalAmount) - Number(updated.paidAmount),
      paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : updated.updatedAt,
    };
  }
  /**
 * Enviar aviso de pago próximo a vencer
 */
async sendPaymentNotice(
  accountId: string,
  recipientEmail: string,
  customMessage: string,
  userId: string,
): Promise<{ jobId: string; logId: string; message: string }> {
  try {
    this.logger.log(`Enviando aviso de cuenta por pagar ${accountId} a ${recipientEmail}`);

    // 1. Obtener la cuenta con información del proveedor
    const account = await this.findOne(accountId, userId);

    if (!account) {
      throw new NotFoundException(`Cuenta por pagar ${accountId} no encontrada`);
    }

    // 2. Verificar que la cuenta tenga saldo pendiente
    if (account.status === 'paid') {
      throw new HttpException(
        'Esta cuenta ya está pagada completamente',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dueAmount = Number(account.totalAmount) - Number(account.paidAmount);
    const daysUntilDue = Math.floor(
      (new Date(account.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // 3. Preparar datos para el email
    const emailData = {
      userId,
      organizationId: userId,
      recipientEmail,
      accountId: account.id,
      providerName: account.providerInfo?.nombre || account.providerName || 'Proveedor',
      invoiceNumber: account.documentNumber || account.documentReference || `AP-${accountId.substring(0, 8)}`,
      totalAmount: Number(account.totalAmount),
      dueDate: new Date(account.dueDate).toISOString().split('T')[0],
      currency: 'MXN',
      customMessage: customMessage || `Recordatorio: Pago próximo a vencer en ${daysUntilDue} días`,
    };

    // 4. Enviar email
    const result = await this.emailClientService.sendPaymentNotice(emailData);

    this.logger.log(
      `Aviso enviado. JobId: ${result.jobId}, LogId: ${result.logId}`,
    );

    return {
      ...result,
      message: `Aviso de pago enviado exitosamente a ${recipientEmail}`,
    };
  } catch (error) {
    this.logger.error(
      `Error enviando aviso de pago: ${error.message}`,
      error.stack,
    );
    throw error;
  }
}
}