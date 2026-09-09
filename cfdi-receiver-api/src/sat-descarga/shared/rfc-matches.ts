import { RfcMatch } from './rfc-filter';

/**
 * Colección de RfcMatch sin vacíos ni duplicados.
 * Equivale a Shared/RfcMatches.php.
 * El límite de 5 receptores que impone el SAT se valida en QueryValidator.
 */
export class RfcMatches implements Iterable<RfcMatch> {
  private constructor(readonly items: ReadonlyArray<RfcMatch>) {}

  static create(...items: RfcMatch[]): RfcMatches {
    const map = new Map<string, RfcMatch>();
    for (const item of items) {
      if (!item.isEmpty() && !map.has(item.value)) {
        map.set(item.value, item);
      }
    }
    return new RfcMatches([...map.values()]);
  }

  static createFromValues(...values: string[]): RfcMatches {
    return RfcMatches.create(
      ...values.map((v) => (v.trim() === '' ? RfcMatch.empty() : RfcMatch.create(v))),
    );
  }

  static empty(): RfcMatches {
    return new RfcMatches([]);
  }

  get count(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  first(): RfcMatch {
    return this.items[0] ?? RfcMatch.empty();
  }

  [Symbol.iterator](): Iterator<RfcMatch> {
    return this.items[Symbol.iterator]();
  }

  toJSON(): string[] {
    return this.items.map((i) => i.value);
  }
}
