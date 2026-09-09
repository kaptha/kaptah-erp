/**
 * UUID (folio fiscal) en minúsculas. Permite vacío = sin filtro.
 * Equivale a Shared/Uuid.php.
 */
export class Uuid {
  private static readonly PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

  private constructor(readonly value: string) {}

  static create(value: string): Uuid {
    const v = value.trim().toLowerCase();
    if (!Uuid.PATTERN.test(v)) {
      throw new Error(`UUID con formato incorrecto: "${value}"`);
    }
    return new Uuid(v);
  }

  static empty(): Uuid {
    return new Uuid('');
  }

  static check(value: string): boolean {
    return Uuid.PATTERN.test(value.trim().toLowerCase());
  }

  isEmpty(): boolean {
    return this.value === '';
  }

  toJSON(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
