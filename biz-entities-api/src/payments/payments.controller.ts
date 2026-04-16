import { Controller, Post, Body, Req, Headers, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Public } from '../decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout')
  async createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() req: any,
  ) {
    const user = req.user;
    this.logger.log(`Checkout solicitado por: ${user.email}`);

    return this.paymentsService.createCheckoutOrder(
      dto.plan,
      dto.cicloFacturacion,
      dto.customerName,
      dto.customerEmail,
      dto.customerPhone,
      dto.firebaseUid,
    );
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-conekta-signature') signature: string,
  ) {
    this.logger.log('Webhook Conekta recibido');
    return this.paymentsService.handleWebhook(req.body);
  }
}
