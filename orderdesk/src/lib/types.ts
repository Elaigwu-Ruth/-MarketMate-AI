export type User = { username: string; avatar_url?: string; id: string; name: string; initials: string; color: string; public_key: string | null; demo: number };
export type Vendor = { id: string; owner_id: string; name: string; category: string; city: string; description: string; initials: string; color: string; accepting: number; published: number; address: string };
export type Product = { id: string; vendor_id: string; name: string; category: string; description: string; condition: string; attributes: string; price: number; available: number; archived: number; emoji: string; color: string; image_url?: string | null; image_credit?: string | null; image_source?: string | null };
export type Message = { id: string; thread_id: string; sender_id: string; kind: 'encrypted'|'system'|'order'|'transfer'; body: string; created_at: string };
export type Thread = { id: string; kind: string; vendor_id: string | null; name: string; initials: string; color: string; other_id: string; unread: number; latest: string; updated_at: string; members: User[]; avatar_url?:string };
export type CartItem = { product_id: string; quantity: number };
export type Order = { id: string; thread_id: string; customer_id: string; vendor_id: string; vendor_name: string; customer_name: string; items: string; subtotal: number; fee: number; total: number; fulfilment: string; address: string; zone_id: string | null; status: string; payment: string; created_at: string };
export type Zone = { id: string; vendor_id: string; name: string; fee: number };
export type Quote = { id: string; thread_id: string; vendor_id: string; items: {product_id: string; name: string; quantity: number; price: number; condition: string; attributes: string}[]; subtotal: number; fee: number; total: number; fulfilment: string; address: string; zone_id: string | null; expires_at: string };
export type Wallet = { balance: number; entries: {id: string; kind: string; amount: number; created_at: string; order_id: string | null; counterpart_name?: string; counterpart_username?: string; note?: string}[] };
export const money = (kobo: number) => new Intl.NumberFormat('en-NG', {style: 'currency', currency: 'NGN', minimumFractionDigits:kobo % 100 ? 2 : 0,maximumFractionDigits: 2}).format(kobo / 100);

export type Transfer = {id:string;sender_id:string;recipient_id:string;sender_name:string;recipient_name:string;sender_username:string;recipient_username:string;amount:number;note:string;thread_id:string;created_at:string};
