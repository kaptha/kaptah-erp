import { DOMParser, Document, Element, Node } from '@xmldom/xmldom';

/**
 * Funciones para leer XML por nombre local (ignorando prefijos de namespace).
 * Equivale a Internal/InteractsXmlTrait.php.
 *
 * El SAT devuelve prefijos variables (s:, o:, u:, h:); comparar por localName
 * en minúsculas evita el str_replace frágil del código original.
 */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const silentParser = new DOMParser({
  // Los errores de XML inválido se manejan como excepción en readXmlDocument
  onError: () => undefined,
});

export function readXmlDocument(source: string): Document {
  if (source === '') {
    throw new Error('No se puede cargar un XML con contenido vacío');
  }
  const doc = silentParser.parseFromString(source, 'text/xml');
  if (!doc || !doc.documentElement) {
    throw new Error('No se puede cargar un XML sin elemento raíz');
  }
  return doc;
}

export function readXmlElement(source: string): Element {
  const element = readXmlDocument(source).documentElement;
  if (!element) {
    throw new Error('No se puede cargar un XML sin elemento raíz');
  }
  return element;
}

function childElements(element: Element): Element[] {
  const out: Element[] = [];
  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children.item(i);
    if (child && child.nodeType === ELEMENT_NODE) {
      out.push(child as Element);
    }
  }
  return out;
}

function localNameOf(node: Element): string {
  return (node.localName ?? node.nodeName.split(':').pop() ?? '').toLowerCase();
}

/** Busca el elemento siguiendo la cadena de hijos (case-insensitive, sin prefijos) */
export function findElement(element: Element, ...names: string[]): Element | null {
  if (names.length === 0) return element;
  const [current, ...rest] = names;
  const target = current.toLowerCase();
  for (const child of childElements(element)) {
    if (localNameOf(child) === target) {
      return rest.length > 0 ? findElement(child, ...rest) : child;
    }
  }
  return null;
}

function extractElementContent(element: Element): string {
  const parts: string[] = [];
  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    const node = children.item(i) as Node | null;
    if (node && node.nodeType === TEXT_NODE) {
      parts.push((node.textContent ?? '').trim());
    }
  }
  return parts.join('');
}

export function findContent(element: Element, ...names: string[]): string {
  const found = findElement(element, ...names);
  return found ? extractElementContent(found) : '';
}

/** Todos los hijos directos llamados como el último nombre, bajo la ruta de los anteriores */
export function findElements(element: Element, ...names: string[]): Element[] {
  const current = (names.pop() ?? '').toLowerCase();
  const parent = findElement(element, ...names);
  if (!parent) return [];
  return childElements(parent).filter((c) => localNameOf(c) === current);
}

export function findContents(element: Element, ...names: string[]): string[] {
  return findElements(element, ...names).map(extractElementContent);
}

/** Atributos del elemento encontrado, con nombres en minúsculas */
export function findAttributes(element: Element, ...names: string[]): Record<string, string> {
  const found = findElement(element, ...names);
  if (!found) return {};
  const attrs: Record<string, string> = {};
  const list = found.attributes;
  for (let i = 0; i < list.length; i++) {
    const attr = list.item(i);
    if (attr) {
      const name = (attr.localName ?? attr.name).toLowerCase();
      attrs[name] = attr.value;
    }
  }
  return attrs;
}
