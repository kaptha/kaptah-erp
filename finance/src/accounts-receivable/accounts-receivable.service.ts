import { Injectable, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Account } from 'src/shared/entities/account.entity';
import { Client } from 'src/shared/entities/client.entity';
import { CreateAccountReceivableDto } from './dto/create-account-receivable.dto/create-account-receivable.dto';
import { UpdateAccountReceivableDto } from './dto/create-account-receivable.dto/update-account-receivable.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { EmailClientService } from '../email-client/email-client.service';
@Injectable()
export class AccountsReceivableService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Client, 'mysql')
    private readonly clientRepository: Repository<Client>,
    private readonly emailClientService: EmailClientService,
  ) {}

  // Crear cuenta por cobrar
  // Mejora temporal en accounts-receivable.service.ts (método create)
async create(createAccountReceivableDto: CreateAccountReceivableDto, userId: string) {
  console.log('=== INICIO CREATE ACCOUNT RECEIVABLE ===');
  console.log('DTO recibido:', JSON.stringify(createAccountReceivableDto, null, 2));
  console.log('UserId para crear:', userId);
  
  // Validación de tipos
  console.log('Validación de tipos:');
  console.log('customerId tipo:', typeof createAccountReceivableDto.customerId, 'valor:', createAccountReceivableDto.customerId);
  console.log('customerName tipo:', typeof createAccountReceivableDto.customerName, 'valor:', createAccountReceivableDto.customerName);
  console.log('totalAmount tipo:', typeof createAccountReceivableDto.totalAmount, 'valor:', createAccountReceivableDto.totalAmount);
  
  let client = null;
  if (createAccountReceivableDto.customerId) {
    client = await this.clientRepository.findOne({
      where: { id: createAccountReceivableDto.customerId }
    });
    console.log('Cliente encontrado por ID:', client);

    if (!client && createAccountReceivableDto.customerRfc) {
      client = await this.clientRepository.findOne({
        where: { RFC: createAccountReceivableDto.customerRfc }
      });
      console.log('Cliente encontrado por RFC:', client);
    }
  }

  // ✅ CREAR OBJETO CON TIPOS CORRECTOS para la entidad Account
  const accountData: Partial<Account> = {
    userId,
    accountType: 'receivable' as const, // ✅ Tipo literal específico
    status: 'pending' as const, // ✅ Tipo literal específico
    partnerId: createAccountReceivableDto.customerId.toString(), // ✅ String como espera la entidad
    cfdiId: createAccountReceivableDto.documentId,
    totalAmount: createAccountReceivableDto.totalAmount,
    paidAmount: 0,
    creditDays: createAccountReceivableDto.creditDays,
    creditRemainingDays: createAccountReceivableDto.creditDays,
    dueDate: new Date(createAccountReceivableDto.dueDate),
    customerName: createAccountReceivableDto.customerName || client?.Nombre,
    customerRfc: createAccountReceivableDto.customerRfc || client?.RFC,
    documentType: createAccountReceivableDto.documentType,
    documentNumber: createAccountReceivableDto.documentNumber,
    documentReference: createAccountReceivableDto.documentReference,
    concept: createAccountReceivableDto.concept,
    issueDate: createAccountReceivableDto.issueDate ? new Date(createAccountReceivableDto.issueDate) : undefined,
    notes: createAccountReceivableDto.notes,
  };

  console.log('Datos para crear en BD:', JSON.stringify(accountData, null, 2));

  try {
    // ✅ CREAR Y GUARDAR CORRECTAMENTE
    const account = this.accountRepository.create(accountData);
    console.log('Entity creada:', account);
    
    const savedAccount = await this.accountRepository.save(account);
    console.log('Account guardado exitosamente:', savedAccount.id);
    console.log('=== FIN CREATE ACCOUNT RECEIVABLE (ÉXITO) ===');
    
    return this.enrichAccountWithClientInfo(savedAccount, client);
  } catch (error) {
    console.error('=== ERROR EN CREATE ACCOUNT RECEIVABLE ===');
    console.error('Error completo:', error);
    console.error('Stack trace:', error.stack);
    console.error('=== FIN ERROR ===');
    throw error;
  }
}

  // Listar cuentas por cobrar con información del cliente
  async findAll(userId: string) {
  console.log('🔍 userId recibido:', JSON.stringify(userId));
  console.log('🔍 cada caracter:', userId.split('').map((char, i) => `${i}: '${char}' (${char.charCodeAt(0)})`));
  
  // Hacer consulta directa con query builder para debug
  const rawQuery = await this.accountRepository.query(
    'SELECT user_id, customer_name FROM accounts WHERE user_id = $1',
    [userId]
  );
  console.log('🔍 Consulta directa SQL:', rawQuery);
    
  const accounts = await this.accountRepository.query(`
    SELECT * FROM accounts 
    WHERE POSITION($1 IN user_id) > 0 
    AND account_type = 'receivable' 
    ORDER BY created_at DESC
  `, [userId]);

  console.log('Consulta SQL directa encontró:', accounts.length);

  // Convertir los resultados a objetos Account
  const mappedAccounts = accounts.map(row => ({
    id: row.id,
    userId: row.user_id,
    accountType: row.account_type,
    partnerId: row.partner_id,
    customerRfc: row.customer_rfc,
    customerName: row.customer_name,
    totalAmount: parseFloat(row.total_amount),
    paidAmount: parseFloat(row.paid_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    creditDays: row.credit_days,
    dueDate: row.due_date,
  }));

  // 🔍 NUEVO: Debug de RFCs extraídos
  const clientRfcs = [...new Set(mappedAccounts
    .map(acc => acc.customerRfc)
    .filter(rfc => rfc && rfc !== 'N/A' && rfc.trim() !== '')
  )];
  
  console.log('🔍 RFCs extraídos de accounts:', clientRfcs);
  console.log('🔍 Primer account customerRfc:', mappedAccounts[0]?.customerRfc);
  
  let clients: Client[] = [];
  if (clientRfcs.length > 0) {
    clients = await this.clientRepository.find({
      where: { RFC: In(clientRfcs) }
    });
    console.log('🔍 Consulta MySQL ejecutada con RFCs:', clientRfcs);
    console.log('🔍 Clientes encontrados en MySQL:', clients.length);
    console.log('🔍 Primer cliente encontrado:', clients[0]);
  }
  
  const clientsMap = new Map(clients.map(client => [client.RFC, client]));

  return mappedAccounts.map(account => {
    const client = account.customerRfc ? clientsMap.get(account.customerRfc) : null;
    console.log(`🔍 Mapeando account ${account.id}: customerRfc=${account.customerRfc}, cliente encontrado=${!!client}`);
    return this.enrichAccountWithClientInfo(account, client);
  });
}

  // Obtener una cuenta específica con información del cliente
  async findOne(id: string, userId: string) {
    const account = await this.accountRepository.findOne({
      where: { id, userId, accountType: 'receivable' },
    });

    if (!account) throw new NotFoundException('Cuenta por cobrar no encontrada');

    // CORREGIDO: Buscar cliente por RFC en lugar de por ID
    let client = null;
    if (account.customerRfc && account.customerRfc !== 'N/A') {
      client = await this.clientRepository.findOne({
        where: { RFC: account.customerRfc }
      });
    }

    return this.enrichAccountWithClientInfo(account, client);
  }

  // Actualizar cuenta por cobrar
  async update(id: string, dto: UpdateAccountReceivableDto, userId: string) {
    const account = await this.accountRepository.findOne({ 
      where: { id, userId } 
    });
    
    if (!account) throw new NotFoundException('Cuenta por cobrar no encontrada');

    let client = null;
    if (dto.customerId && dto.customerId !== account.partnerId) {
      const customerIdAsNumber = parseInt(dto.customerId.toString());
      
      if (!isNaN(customerIdAsNumber)) {
        client = await this.clientRepository.findOne({
          where: { id: customerIdAsNumber }
        });
        
        if (!client) {
          throw new NotFoundException('Cliente no encontrado en la base de datos');
        }
      } else {
        if (account.customerRfc) {
          client = await this.clientRepository.findOne({
            where: { RFC: account.customerRfc }
          });
        }
      }
    }

    account.partnerId = dto.customerId?.toString() ?? account.partnerId;
    account.cfdiId = dto.documentId?.toString() ?? account.cfdiId;
    account.totalAmount = dto.totalAmount ?? account.totalAmount;
    account.creditDays = dto.creditDays ?? account.creditDays;
    account.creditRemainingDays = dto.creditRemainingDays ?? account.creditRemainingDays;
    account.dueDate = dto.dueDate ? new Date(dto.dueDate) : account.dueDate;
    account.issueDate = dto.issueDate ? new Date(dto.issueDate) : account.issueDate;
    account.notes = dto.notes ?? account.notes;

    const updatedAccount = await this.accountRepository.save(account);
    
    // CORREGIDO: Buscar cliente por RFC en lugar de por ID
    if (!client && updatedAccount.customerRfc && updatedAccount.customerRfc !== 'N/A') {
      client = await this.clientRepository.findOne({
        where: { RFC: updatedAccount.customerRfc }
      });
    }

    return this.enrichAccountWithClientInfo(updatedAccount, client);
  }

  // Eliminar cuenta por cobrar
  async remove(id: string, userId: string) {
    const account = await this.accountRepository.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Cuenta por cobrar no encontrada');

    await this.accountRepository.delete(id);
    return { message: 'Cuenta por cobrar eliminada correctamente' };
  }

  // Registrar un pago con información del cliente
  async registerPayment(id: string, paymentData: RegisterPaymentDto, userId: string) {
  console.log('=== INICIO REGISTER PAYMENT ===');
  console.log('Account ID recibido:', id);
  console.log('Payment data recibido:', JSON.stringify(paymentData, null, 2));
  console.log('User ID:', userId);
  
  // Validar que el ID sea un UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    console.error('ID inválido recibido:', id);
    throw new Error(`ID de cuenta inválido: ${id}`);
  }

  console.log('Buscando cuenta con ID:', id, 'y userId:', userId);
  
  const account = await this.accountRepository.findOne({ 
    where: { id, userId, accountType: 'receivable' } 
  });
  
  console.log('Cuenta encontrada:', account ? 'SÍ' : 'NO');
  if (!account) {
    console.log('Todas las cuentas del usuario:');
    const allUserAccounts = await this.accountRepository.find({ 
      where: { userId, accountType: 'receivable' } 
    });
    console.log('Total cuentas del usuario:', allUserAccounts.length);
    allUserAccounts.forEach(acc => {
      console.log(`- ID: ${acc.id}, Customer: ${acc.customerName}`);
    });
    throw new NotFoundException('Cuenta por cobrar no encontrada');
  }

  console.log('Datos actuales de la cuenta:');
  console.log('- Total Amount:', account.totalAmount);
  console.log('- Paid Amount:', account.paidAmount);
  console.log('- Status:', account.status);

  // Calcular nuevo monto pagado
  const newPaidAmount = Number(account.paidAmount) + Number(paymentData.amount);
  console.log('Nuevo monto pagado será:', newPaidAmount);

  account.paidAmount = newPaidAmount;

  // Actualizar status
  if (account.paidAmount >= account.totalAmount) {
    account.status = 'paid';
    console.log('Cambiando status a: paid');
  } else if (account.paidAmount > 0) {
    account.status = 'partial';
    console.log('Cambiando status a: partial');
  }

  try {
    const updated = await this.accountRepository.save(account);
    console.log('Cuenta actualizada exitosamente');

    // Buscar información del cliente
    let client = null;
    if (updated.customerRfc && updated.customerRfc !== 'N/A') {
      client = await this.clientRepository.findOne({
        where: { RFC: updated.customerRfc }
      });
      console.log('Cliente encontrado:', client ? 'SÍ' : 'NO');
    }

    console.log('=== FIN REGISTER PAYMENT (ÉXITO) ===');
    return this.enrichAccountWithClientInfo(updated, client);
  } catch (error) {
    console.error('=== ERROR EN REGISTER PAYMENT ===');
    console.error('Error completo:', error);
    console.error('=== FIN ERROR ===');
    throw error;
  }
}

  // Obtener resumen de cuentas por cobrar
  async getSummary(userId: string) {
    const accounts = await this.findAll(userId);
    
    const summary = {
      totalPorCobrar: 0,
      pendientes: 0,
      vencidos: 0,
      cobrados: 0,
      parciales: 0,
      totalCuentas: accounts.length
    };

    const today = new Date();

    accounts.forEach(account => {
      const dueDate = new Date(account.dueDate);
      const remainingAmount = account.totalAmount - account.paidAmount;

      switch (account.status) {
        case 'paid':
          summary.cobrados += account.totalAmount;
          break;
        case 'partial':
          summary.parciales += remainingAmount;
          summary.totalPorCobrar += remainingAmount;
          break;
        case 'pending':
          if (dueDate < today) {
            summary.vencidos += remainingAmount;
          } else {
            summary.pendientes += remainingAmount;
          }
          summary.totalPorCobrar += remainingAmount;
          break;
      }
    });

    return {
      summary,
      accounts: accounts.slice(0, 10)
    };
  }

  // Método privado para enriquecer la cuenta con información del cliente
  private enrichAccountWithClientInfo(account: Account, client: Client | null) {
    return {
      ...account,
      balance: Number(account.totalAmount) - Number(account.paidAmount),
      paymentDate: account.paidAmount > 0 ? account.updatedAt : null,
      clientInfo: client ? {
        id: client.id.toString(),
        rfc: client.RFC,
        razonSocial: client.Nombre,
        nombre: client.Nombre,
        email: client.Email,
        telefono: client.Telefono,
        direccion: null,
        codigoPostal: client.Cpostal,
        ciudad: null,
        estado: null,
        pais: null,
        regFiscal: client.RegFiscal,
        colonia: client.Colonia,
        fechaRegistro: client.Fecha_Registro,
        userId: client.userId,
        activo: true
      } : {
        id: account.partnerId,
        rfc: account.customerRfc || 'N/A',
        razonSocial: account.customerName || `Cliente ${account.partnerId}`,
        nombre: account.customerName || 'Cliente no encontrado',
        email: null,
        telefono: null,
        direccion: null,
        codigoPostal: null,
        ciudad: null,
        estado: null,
        pais: null,
        regFiscal: null,
        colonia: null,
        fechaRegistro: null,
        userId: null,
        activo: true
      }
    };
  }
  /**
 * Enviar recordatorio de pago al cliente
 */
async sendPaymentReminder(
  accountId: string,
  recipientEmail: string,
  customMessage: string,
  userId: string,
): Promise<{ jobId: string; logId: string; message: string }> {
  try {
    this.logger.log(`Enviando recordatorio de cuenta por cobrar ${accountId} a ${recipientEmail}`);

    // 1. Obtener la cuenta con información del cliente
    const account = await this.findOne(accountId, userId);

    if (!account) {
      throw new NotFoundException(`Cuenta por cobrar ${accountId} no encontrada`);
    }

    // 2. Verificar que la cuenta tenga saldo pendiente
    if (account.status === 'paid') {
      throw new HttpException(
        'Esta cuenta ya está pagada completamente',
        HttpStatus.BAD_REQUEST
      );
    }

    const dueAmount = Number(account.totalAmount) - Number(account.paidAmount);

    // 3. Preparar datos para el email
    const emailData = {
      userId,
      organizationId: userId, // Usar userId como organizationId
      recipientEmail,
      accountId: account.id,
      customerName: account.clientInfo?.nombre || account.customerName || 'Cliente',
      invoiceNumber: account.documentNumber || account.documentReference || `AR-${accountId.substring(0, 8)}`,
      totalAmount: Number(account.totalAmount),
      dueAmount,
      dueDate: new Date(account.dueDate).toISOString().split('T')[0],
      currency: 'MXN',
      customMessage: customMessage || `Le recordamos que tiene un pago pendiente por $${dueAmount.toFixed(2)} MXN`,
    };

    // 4. Enviar email usando el email-service
    const result = await this.emailClientService.sendPaymentReminder(emailData);

    this.logger.log(
      `Recordatorio enviado. JobId: ${result.jobId}, LogId: ${result.logId}`,
    );

    return {
      ...result,
      message: `Recordatorio de pago enviado exitosamente a ${recipientEmail}`,
    };
  } catch (error) {
    this.logger.error(
      `Error enviando recordatorio de pago: ${error.message}`,
      error.stack,
    );
    throw error;
  }
}

/**
 * Enviar recordatorios masivos de cuentas vencidas
 */
async sendOverdueReminders(userId: string): Promise<{
  sent: number;
  failed: number;
  results: any[];
}> {
  try {
    this.logger.log(`Enviando recordatorios masivos de cuentas vencidas para usuario ${userId}`);

    // 1. Obtener todas las cuentas vencidas
    const accounts = await this.findAll(userId);
    const today = new Date();
    
    const overdueAccounts = accounts.filter(account => {
      const dueDate = new Date(account.dueDate);
      return account.status !== 'paid' && dueDate < today;
    });

    this.logger.log(`${overdueAccounts.length} cuentas vencidas encontradas`);

    const results = [];
    let sent = 0;
    let failed = 0;

    // 2. Enviar recordatorio a cada cuenta vencida que tenga email
    for (const account of overdueAccounts) {
      try {
        const email = account.clientInfo?.email;
        
        if (!email) {
          this.logger.warn(`Cuenta ${account.id} sin email del cliente, omitiendo...`);
          failed++;
          results.push({
            accountId: account.id,
            customerName: account.customerName,
            status: 'skipped',
            reason: 'No email available',
          });
          continue;
        }

        const daysOverdue = Math.floor(
          (today.getTime() - new Date(account.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        const customMessage = `Estimado cliente, su pago está vencido desde hace ${daysOverdue} días. Por favor, regularice su situación a la brevedad.`;

        const result = await this.sendPaymentReminder(
          account.id,
          email,
          customMessage,
          userId,
        );

        sent++;
        results.push({
          accountId: account.id,
          customerName: account.customerName,
          email,
          status: 'sent',
          jobId: result.jobId,
        });

        this.logger.log(`✅ Recordatorio enviado a ${email}`);
      } catch (error) {
        failed++;
        results.push({
          accountId: account.id,
          customerName: account.customerName,
          status: 'failed',
          error: error.message,
        });
        this.logger.error(`❌ Error enviando a cuenta ${account.id}: ${error.message}`);
      }
    }

    return {
      sent,
      failed,
      results,
    };
  } catch (error) {
    this.logger.error(`Error en envío masivo: ${error.message}`);
    throw error;
  }
}

private readonly logger = new Logger(AccountsReceivableService.name); // <-- Agregar al inicio de la clase si no existe
}