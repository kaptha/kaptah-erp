export class CreateCheckoutDto {
  plan: string; // 'basico' | 'fiscal' | 'erp' | 'ilimitado'
  cicloFacturacion: string; // 'mensual' | 'anual'
  firebaseUid: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}
