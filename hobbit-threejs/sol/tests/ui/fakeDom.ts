type Listener = (event: Event) => void;

export class FakeClassList {
  private readonly values = new Set<string>();

  add(...tokens: string[]) { tokens.forEach((token) => this.values.add(token)); }
  remove(...tokens: string[]) { tokens.forEach((token) => this.values.delete(token)); }
  toggle(token: string, force?: boolean) {
    const enabled = force ?? !this.values.has(token);
    if (enabled) this.values.add(token);
    else this.values.delete(token);
    return enabled;
  }
  contains(token: string) { return this.values.has(token); }
}

export class FakeElement {
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly classList = new FakeClassList();
  readonly listeners = new Map<string, Listener[]>();
  className = '';
  textContent: string | null = null;
  hidden = false;
  disabled = false;
  id = '';
  type = '';
  min = '';
  max = '';
  step = '';
  value = '';
  valueAsNumber = Number.NaN;

  constructor(readonly tagName: string) {}

  append(...nodes: FakeElement[]) { this.children.push(...nodes); }
  appendChild(node: FakeElement) { this.children.push(node); return node; }
  replaceChildren(...nodes: FakeElement[]) {
    this.children.splice(0, this.children.length, ...nodes);
  }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  remove() { this.hidden = true; }
  emit(type: string) {
    const event = { currentTarget: this, target: this } as unknown as Event;
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
  find(attribute: string, value: string): FakeElement | undefined {
    if (this.getAttribute(attribute) === value) return this;
    for (const child of this.children) {
      const match = child.find(attribute, value);
      if (match) return match;
    }
    return undefined;
  }
}

export class FakeDocument {
  createElement(tagName: string) { return new FakeElement(tagName.toUpperCase()); }
}

export function asElement(element: FakeElement): HTMLElement {
  return element as unknown as HTMLElement;
}

export function asDocument(documentRef: FakeDocument): Document {
  return documentRef as unknown as Document;
}
