import { AppError, integer, requireValue } from './db';
import type { CartItem, Product } from './types';

export type AssistantSuggestion = {
  items: CartItem[];
  note: string;
  mode: string;
  warning?: string;
};

/** Validate the editable cart sent with an assistant request. Unknown products are dropped. */
export function normaliseDraft(value: unknown, products: Product[]): CartItem[] {
  if (value === undefined) return [];
  requireValue(Array.isArray(value), 'Invalid current cart.');
  requireValue(value.length <= 30, 'Too many cart items.');
  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const raw of value) {
    requireValue(raw && typeof raw === 'object' && !Array.isArray(raw), 'Invalid current cart.');
    const product_id = (raw as { product_id?: unknown }).product_id;
    const quantity = (raw as { quantity?: unknown }).quantity;
    requireValue(typeof product_id === 'string', 'Invalid current cart.');
    requireValue(!seen.has(product_id), 'Duplicate cart item.');
    seen.add(product_id);
    integer(quantity, 1, 99, 'quantity');
    if (products.some(p => p.id === product_id)) items.push({ product_id, quantity: quantity as number });
  }
  return items;
}

/** Validate a model proposal. Only products from the current seller catalogue are accepted. */
export function validateProposal(value: unknown, products: Product[]): CartItem[] {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Invalid AI response.');
  const proposal = value as { items?: unknown };
  requireValue(Array.isArray(proposal.items) && proposal.items.length <= 30, 'Invalid AI response.');
  const seen = new Set<string>();
  return proposal.items.map(raw => {
    requireValue(raw && typeof raw === 'object' && !Array.isArray(raw), 'Invalid AI response.');
    const product_id = (raw as { product_id?: unknown }).product_id;
    const quantity = (raw as { quantity?: unknown }).quantity;
    requireValue(typeof product_id === 'string' && products.some(p => p.id === product_id), 'Unknown product returned.');
    requireValue(!seen.has(product_id), 'Duplicate AI items.');
    seen.add(product_id);
    integer(quantity, 1, 99, 'quantity');
    return { product_id, quantity: quantity as number };
  });
}

/** Deterministic catalogue matching used when live AI is not configured or cannot be used. */
export function localSuggestion(prompt: string, products: Product[], draft: CartItem[]) {
  const q = prompt.toLowerCase();
  const words = q.match(/[a-z0-9]+/g) || [];
  const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  // Prefer a quantity word ("two cables") and ignore digits that belong to a budget ("under ₦6,000").
  const wordNumber = words.map(w => numberWords[w]).find(Boolean);
  const withoutMoney = q.replace(/₦\s*\d[\d,]*(?:\.\d+)?\s*k?/g, ' ');
  const digitNumber = Number(withoutMoney.match(/\b(\d{1,2})\b/)?.[1] || 0);
  const number = digitNumber || wordNumber || 1;
  const relevant = products.filter(p => p.name.toLowerCase().split(/\W+/).some(w => w.length > 3 && words.some(x => x.startsWith(w) || w.startsWith(x))));
  const correction = /\b(more|extra|total|make it|instead)\b/.test(q);
  let items: CartItem[] = draft.map(i => ({ ...i }));
  let note = '';
  if (correction && items.length === 1 && !relevant.length) {
    items[0].quantity = /\b(more|extra)\b/.test(q) ? items[0].quantity + number : number;
  } else if (relevant.length === 1) {
    const old = items.find(i => i.product_id === relevant[0].id);
    const quantity = old && /\b(more|extra)\b/.test(q) ? old.quantity + number : number;
    items = items.filter(i => i.product_id !== relevant[0].id);
    items.push({ product_id: relevant[0].id, quantity });
  } else if (relevant.length > 1) {
    items = [];
    note = 'Several products match. Please select the exact product in the catalogue.';
  } else {
    items = [];
    note = 'Please name a product from this seller’s catalogue, or add it manually.';
  }
  if (items.some(i => i.quantity < 1 || i.quantity > 99)) {
    items = [];
    note = 'Choose a quantity between 1 and 99.';
  }
  note ||= 'Here is an editable suggestion from the saved catalogue. Confirm the exact product attributes and choose fulfilment before requesting a quote.';
  return { items, note };
}

/** A transparent budget caveat appended to the suggestion note when the subtotal exceeds the request. */
export function budgetWarning(prompt: string, items: CartItem[], products: Product[]) {
  const total = items.reduce((n, i) => n + (products.find(p => p.id === i.product_id)?.price || 0) * i.quantity, 0);
  const budget = prompt.toLowerCase().replaceAll(',', '').match(/(?:under|below|budget(?: of)?)\s*₦?\s*(\d+(?:\.\d+)?)\s*(k?)/);
  if (budget && total > Number(budget[1]) * (budget[2] ? 1000 : 1) * 100) return ' This product subtotal exceeds your stated budget.';
  return '';
}

export function providerTimeout(env: Record<string, string | undefined> = process.env) {
  const value = Number(env.AI_TIMEOUT_MS || 12000);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1000), 60000) : 12000;
}

export function assistantError(error: unknown) {
  if (error instanceof AppError) return error.message;
  return 'The order assistant could not complete that request.';
}
