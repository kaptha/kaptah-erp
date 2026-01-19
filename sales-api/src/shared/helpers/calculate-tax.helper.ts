
export class TaxCalculator {
    static calculateIVA(amount: number, rate: number = 0.16): number {
      return amount * rate;
    }
  
    static calculateISR(amount: number, rate: number = 0.30): number {
      return amount * rate;
    }
  
    // Puedes añadir más métodos según tus necesidades
  }