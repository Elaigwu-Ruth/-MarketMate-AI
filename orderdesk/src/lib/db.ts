import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { User, Vendor, Product, CartItem, Quote, Order } from './types';

export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }
const filename = process.env.ORDERDESK_DB || resolve('data/orderdesk.sqlite');
if (filename !== ':memory:') mkdirSync(dirname(filename), {recursive: true});
export const db = new DatabaseSync(filename);
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, password TEXT, initials TEXT, color TEXT, public_key TEXT, demo INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), expires INTEGER);
CREATE TABLE IF NOT EXISTS contacts(owner_id TEXT REFERENCES users(id), user_id TEXT REFERENCES users(id), PRIMARY KEY(owner_id,user_id));
CREATE TABLE IF NOT EXISTS vendors(id TEXT PRIMARY KEY, owner_id TEXT UNIQUE REFERENCES users(id), name TEXT, category TEXT, city TEXT, description TEXT, initials TEXT, color TEXT, accepting INTEGER DEFAULT 1, published INTEGER DEFAULT 1, address TEXT);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, vendor_id TEXT REFERENCES vendors(id), name TEXT, category TEXT, description TEXT, condition TEXT, attributes TEXT, price INTEGER CHECK(price>=0), available INTEGER DEFAULT 1, archived INTEGER DEFAULT 0, emoji TEXT, color TEXT);
CREATE TABLE IF NOT EXISTS zones(id TEXT PRIMARY KEY, vendor_id TEXT REFERENCES vendors(id), name TEXT, fee INTEGER CHECK(fee>=0));
CREATE TABLE IF NOT EXISTS threads(id TEXT PRIMARY KEY, pair TEXT UNIQUE, kind TEXT CHECK(kind IN ('direct','business')), vendor_id TEXT REFERENCES vendors(id), updated_at TEXT);
CREATE TABLE IF NOT EXISTS members(thread_id TEXT REFERENCES threads(id), user_id TEXT REFERENCES users(id), read_seq INTEGER DEFAULT 0, PRIMARY KEY(thread_id,user_id));
CREATE TABLE IF NOT EXISTS messages(seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE, thread_id TEXT REFERENCES threads(id), sender_id TEXT REFERENCES users(id), kind TEXT, body TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS quotes(id TEXT PRIMARY KEY, customer_id TEXT REFERENCES users(id), thread_id TEXT REFERENCES threads(id), vendor_id TEXT REFERENCES vendors(id), items TEXT, subtotal INTEGER, fee INTEGER, total INTEGER, fulfilment TEXT, address TEXT, zone_id TEXT, expires_at TEXT, consumed TEXT);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, quote_id TEXT UNIQUE REFERENCES quotes(id), thread_id TEXT REFERENCES threads(id), customer_id TEXT REFERENCES users(id), vendor_id TEXT REFERENCES vendors(id), items TEXT, subtotal INTEGER, fee INTEGER, total INTEGER, fulfilment TEXT, address TEXT, zone_id TEXT, status TEXT, payment TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS order_events(id TEXT PRIMARY KEY, order_id TEXT REFERENCES orders(id), actor TEXT REFERENCES users(id), previous TEXT, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, balance INTEGER DEFAULT 0 CHECK(id='source' OR balance>=0));
CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), kind TEXT, key TEXT, input TEXT, result TEXT, created_at TEXT, UNIQUE(user_id,kind,key));
CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY, operation_id TEXT REFERENCES operations(id), account_id TEXT REFERENCES accounts(id), amount INTEGER, order_id TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS usernames(user_id TEXT PRIMARY KEY REFERENCES users(id), username TEXT UNIQUE COLLATE NOCASE NOT NULL);
CREATE TABLE IF NOT EXISTS transfers(id TEXT PRIMARY KEY REFERENCES operations(id), sender_id TEXT REFERENCES users(id), recipient_id TEXT REFERENCES users(id), amount INTEGER CHECK(amount>0), note TEXT, thread_id TEXT REFERENCES threads(id), created_at TEXT);
CREATE TRIGGER IF NOT EXISTS immutable_username_update BEFORE UPDATE ON usernames BEGIN SELECT RAISE(ABORT,'Payment addresses cannot be reassigned'); END;
CREATE TRIGGER IF NOT EXISTS immutable_username_delete BEFORE DELETE ON usernames BEGIN SELECT RAISE(ABORT,'Payment addresses cannot be reassigned'); END;
CREATE TRIGGER IF NOT EXISTS immutable_ledger_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS immutable_ledger_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
`);
export function one<T>(sql: string, ...args: (string|number|null)[]): T | undefined { return db.prepare(sql).get(...args) as T | undefined; }
export function many<T>(sql: string, ...args: (string|number|null)[]): T[] { return db.prepare(sql).all(...args) as T[]; }
export function run(sql: string, ...args: (string|number|null)[]) { return db.prepare(sql).run(...args); }
export const now = () => new Date().toISOString();
export const id = () => randomUUID();
export function transaction<T>(fn: () => T): T { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } }
export function requireValue(condition: unknown, message: string, status=400): asserts condition { if(!condition) throw new AppError(message,status); }
export function text(value: unknown, label: string, max=2000) { requireValue(typeof value==='string' && value.trim().length>0 && value.length<=max, `${label} is required (maximum ${max} characters).`); return value.trim(); }
export function integer(value: unknown, min: number, max: number, label: string) { requireValue(typeof value==='number' && Number.isSafeInteger(value) && value>=min && value<=max, `Invalid ${label}.`); return value; }
export function passwordHash(password: string) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
export function checkPassword(password: string, hash: string) { const [salt, value]=hash.split(':'); return timingSafeEqual(scryptSync(password,salt,64), Buffer.from(value,'hex')); }
export const publicUser = (u: User) => ({avatar_url:({ada:'/avatars/ada.png',tunde:'/avatars/tunde.png',tech:'/avatars/chidi.png',style:'/avatars/amaka.png',home:'/avatars/musa.png',fresh:'/avatars/grace.png',food:'/avatars/peter.png'} as Record<string,string>)[u.id],username:one<{username:string}>('SELECT username FROM usernames WHERE user_id=?',u.id)?.username||'',id:u.id,name:u.name,initials:u.initials,color:u.color,public_key:u.public_key,demo:u.demo});
export function member(user: string, thread: string) { requireValue(one('SELECT 1 FROM members WHERE thread_id=? AND user_id=?',thread,user),'Conversation not found.',404); }
function ensureThread(user: string, other: string, vendorId: string|null=null) {
 requireValue(user!==other,'Choose another person.'); requireValue(one('SELECT 1 FROM users WHERE id=?',other),'User not found.',404);
 if(vendorId) requireValue(one('SELECT 1 FROM vendors WHERE id=? AND owner_id=? AND published=1',vendorId,other),'Seller not found.',404);
 const pair=vendorId?`business:${user}:${vendorId}`:`direct:${[user,other].sort().join(':')}`;
 const old=one<{id:string}>('SELECT id FROM threads WHERE pair=?',pair); if(old) return old.id;
 const tid=id(); run('INSERT INTO threads VALUES(?,?,?,?,?)',tid,pair,vendorId?'business':'direct',vendorId,now());
 for(const uid of [user,other]) run('INSERT INTO members(thread_id,user_id) VALUES(?,?)',tid,uid);
 return tid;
}
export function openThread(user:string,other:string,vendorId:string|null=null){return transaction(()=>ensureThread(user,other,vendorId));}
export function message(thread:string,sender:string,kind:string,body:string) { const mid=id(); run('INSERT INTO messages(id,thread_id,sender_id,kind,body,created_at) VALUES(?,?,?,?,?,?)',mid,thread,sender,kind,body,now()); run('UPDATE threads SET updated_at=? WHERE id=?',now(),thread); return mid; }
export function balance(account:string) { return one<{balance:number}>('SELECT balance FROM accounts WHERE id=?',account)?.balance || 0; }
function account(account:string) { run('INSERT OR IGNORE INTO accounts(id) VALUES(?)',account); }
function transfer(op:string, from:string,to:string,amount:number,order:string|null=null) { account(from);account(to); requireValue(amount>=0 && Number.isSafeInteger(amount),'Invalid transfer.'); requireValue(from==='source'||balance(from)>=amount,'Insufficient test funds. Top up your demo wallet.',409); run('UPDATE accounts SET balance=balance-? WHERE id=?',amount,from);run('UPDATE accounts SET balance=balance+? WHERE id=?',amount,to); for(const [aid,n] of [[from,-amount],[to,amount]] as const) run('INSERT INTO ledger VALUES(?,?,?,?,?,?)',id(),op,aid,n,order,now()); }
function operation<T>(user:string,kind:string,key:string,input:unknown,fn:(oid:string)=>T):T { text(key,'Operation key',100); return transaction(()=>{ const body=JSON.stringify(input); const old=one<{input:string;result:string}>('SELECT input,result FROM operations WHERE user_id=? AND kind=? AND key=?',user,kind,key); if(old){requireValue(old.input===body,'This operation key was already used with different details.',409);return JSON.parse(old.result) as T;} const oid=id();run('INSERT INTO operations VALUES(?,?,?,?,?,?,?)',oid,user,kind,key,body,'null',now()); const result=fn(oid);run('UPDATE operations SET result=? WHERE id=?',JSON.stringify(result),oid);return result; }); }
export function topUp(user:string,amount:number,key:string) { integer(amount,10000,100000000,'top-up (₦100–₦1,000,000)');return operation(user,'topup',key,{amount},oid=>{transfer(oid,'source',user,amount);return {balance:balance(user)};}); }
export function normaliseUsername(value:unknown) { const username=text(value,'Username',25).replace(/^@/,'').toLowerCase();requireValue(/^[a-z][a-z0-9_]{2,23}$/.test(username),'Use 3–24 letters, numbers or underscores, starting with a letter.');requireValue(!['admin','support','whatsapp','whatsapp_marketplace','orderdesk','system','wallet','source','bank','verified'].includes(username),'This username is reserved.');return username; }
export function assignUsername(userId:string,requested?:string) {
 requireValue(!one('SELECT 1 FROM usernames WHERE user_id=?',userId),'This account already has a permanent payment address.',409);
 const username=requested?normaliseUsername(requested):`user_${userId.replaceAll('-','').slice(0,14)}`;
 requireValue(!one('SELECT 1 FROM usernames WHERE username=?',username),'This username is already taken.',409);run('INSERT INTO usernames VALUES(?,?)',userId,username);return username;
}
export function resolveRecipient(value:unknown) {const username=normaliseUsername(value);const u=one<User>('SELECT u.* FROM users u JOIN usernames n ON n.user_id=u.id WHERE n.username=?',username);requireValue(u,'No account found for that exact username.',404);return publicUser(u);}
export function sendMoney(sender:string,input:{recipient_id:string;recipient_username:string;amount:number;note?:string},key:string) {
 const amount=integer(input.amount,100,100000000,'transfer amount (₦1–₦1,000,000)');const username=normaliseUsername(input.recipient_username);const recipientId=text(input.recipient_id,'Recipient',100);requireValue(input.note===undefined||typeof input.note==='string','Invalid transfer note.');const note=(input.note||'').trim();requireValue(note.length<=140,'Keep the transfer note under 140 characters.');
 return operation(sender,'transfer',key,{recipientId,username,amount,note},oid=>{
  const recipient=resolveRecipient(username);requireValue(recipient.id===recipientId,'Recipient details changed. Look up the username again.',409);requireValue(recipient.id!==sender,'You cannot send money to yourself.');
  transfer(oid,sender,recipient.id,amount);const thread=ensureThread(sender,recipient.id);run('INSERT INTO transfers VALUES(?,?,?,?,?,?,?)',oid,sender,recipient.id,amount,note,thread,now());message(thread,sender,'transfer',oid);return {transfer_id:oid,thread_id:thread,balance:balance(sender)};
 });
}
export function createQuote(user:string,input:{thread_id:string;items:CartItem[];fulfilment:string;zone_id?:string;address?:string}) { return transaction(()=>{
 member(user,input.thread_id);const thread=one<{vendor_id:string;kind:string}>('SELECT * FROM threads WHERE id=?',input.thread_id)!;requireValue(thread.kind==='business','Orders belong in a seller conversation.');
 const v=one<Vendor>('SELECT * FROM vendors WHERE id=?',thread.vendor_id)!; requireValue(v.owner_id!==user,'You cannot buy from yourself.');requireValue(v.accepting && v.published,'This seller is not accepting orders.');
 requireValue(Array.isArray(input.items)&&input.items.length>0&&input.items.length<=30,'Choose 1–30 products.');const seen=new Set<string>();
 const items=input.items.map(item=>{requireValue(!seen.has(item.product_id),'Duplicate product.');seen.add(item.product_id); integer(item.quantity,1,99,'quantity');const p=one<Product>('SELECT * FROM products WHERE id=? AND vendor_id=? AND available=1 AND archived=0',item.product_id,thread.vendor_id);requireValue(p,'A product is unavailable or belongs to another seller.');return {product_id:p.id,name:p.name,quantity:item.quantity,price:p.price,condition:p.condition,attributes:p.attributes};});
 requireValue(['pickup','delivery'].includes(input.fulfilment),'Choose pickup or delivery.');let fee=0;let zone:string|null=null;let address='';
 if(input.fulfilment==='delivery'){const z=one<{fee:number}>('SELECT fee FROM zones WHERE id=? AND vendor_id=?',input.zone_id||'',thread.vendor_id);requireValue(z,'Choose a supported delivery zone.');fee=z.fee;zone=input.zone_id!;address=text(input.address,'Delivery address',500);}
 const subtotal=items.reduce((n,p)=>n+p.quantity*p.price,0);const quote:Quote={id:id(),thread_id:input.thread_id,vendor_id:thread.vendor_id,items,subtotal,fee,total:subtotal+fee,fulfilment:input.fulfilment,address,zone_id:zone,expires_at:new Date(Date.now()+300000).toISOString()};
 run('INSERT INTO quotes VALUES(?,?,?,?,?,?,?,?,?,?,?,?,NULL)',quote.id,user,quote.thread_id,quote.vendor_id,JSON.stringify(items),subtotal,fee,quote.total,quote.fulfilment,address,zone,quote.expires_at);return quote;
 }); }
export function checkout(user:string,quoteId:string,key:string) { return operation(user,'checkout',key,{quoteId},oid=>{
 const q=one<Omit<Quote,'items'> & {customer_id:string;consumed:string|null;items:string}>('SELECT * FROM quotes WHERE id=?',quoteId);requireValue(q&&q.customer_id===user,'Quote not found.',404);member(user,q.thread_id);requireValue(!q.consumed,'This quote has already been paid.',409);requireValue(q.expires_at>now(),'Quote expired. Review a fresh quote.',409);
 const v=one<Vendor>('SELECT * FROM vendors WHERE id=?',q.vendor_id)!;requireValue(v.accepting&&v.published,'Seller is not accepting orders.',409);const items=JSON.parse(q.items as unknown as string) as Quote['items'];
 for(const item of items){const p=one<Product>('SELECT * FROM products WHERE id=? AND vendor_id=?',item.product_id,q.vendor_id);requireValue(p&&p.available&&!p.archived&&p.price===item.price&&p.name===item.name&&p.condition===item.condition&&p.attributes===item.attributes,'Product details changed. Review a fresh quote.',409);}
 if(q.fulfilment==='delivery') requireValue(one<{fee:number}>('SELECT fee FROM zones WHERE id=? AND vendor_id=?',q.zone_id,q.vendor_id)?.fee===q.fee,'Delivery fee changed. Review a fresh quote.',409);
 const orderId=id();transfer(oid,user,`clearing:${orderId}`,q.total,orderId);
 run('INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',orderId,q.id,q.thread_id,user,q.vendor_id,JSON.stringify(items),q.subtotal,q.fee,q.total,q.fulfilment,q.address,q.zone_id,'submitted','held',now());
 run('UPDATE quotes SET consumed=? WHERE id=?',orderId,q.id);run('INSERT INTO order_events VALUES(?,?,?,?,?,?)',id(),orderId,user,null,'submitted',now());message(q.thread_id,user,'order',orderId);return {order_id:orderId,balance:balance(user)};
 }); }
export function transition(user:string,orderId:string,next:string,key:string) { return operation(user,'transition',key,{orderId,next},oid=>{
 const o=one<Order>('SELECT * FROM orders WHERE id=?',orderId);requireValue(o,'Order not found.',404);const v=one<Vendor>('SELECT * FROM vendors WHERE id=?',o.vendor_id)!;requireValue(user===o.customer_id||user===v.owner_id,'Order not found.',404);
 if(next==='cancelled') requireValue(user===o.customer_id&&o.status==='submitted','Only the customer can cancel before acceptance.',409);
 else {requireValue(user===v.owner_id,'Only the seller can fulfil this order.',403);const transitions:Record<string,string[]>={submitted:['accepted','rejected'],accepted:['preparing'],preparing:['ready'],ready:[o.fulfilment==='pickup'?'completed':'out_for_delivery'],out_for_delivery:['completed']};requireValue(transitions[o.status]?.includes(next),'This order status can no longer make that transition.',409);}
 let payment=o.payment;if(['rejected','cancelled'].includes(next)){transfer(oid,`clearing:${orderId}`,o.customer_id,o.total,orderId);payment='refunded';}if(next==='completed'){transfer(oid,`clearing:${orderId}`,`vendor:${o.vendor_id}`,o.total,orderId);payment='settled';}
 run('UPDATE orders SET status=?,payment=? WHERE id=?',next,payment,orderId);run('INSERT INTO order_events VALUES(?,?,?,?,?,?)',id(),orderId,user,o.status,next,now());run('UPDATE threads SET updated_at=? WHERE id=?',now(),o.thread_id);return {status:next,payment};
 }); }

function seed() { if(one('SELECT 1 FROM users LIMIT 1')) return;transaction(()=>{
 const people=[['ada','Ada Okafor','AO','#bd6c57'],['tunde','Tunde Bello','TB','#547f9c'],['tech','Chidi · Circuit House','CH','#486c7b'],['style','Amaka · Everyday Studio','ES','#92739a'],['home','Musa · The Living Room','LR','#b48d55'],['fresh','Grace · Fresh Basket','FB','#749267'],['food','Peter · Pepper & Co.','PC','#bd7959']];
 for(const [uid,name,initials,color] of people){run('INSERT INTO users(id,name,initials,color,demo) VALUES(?,?,?,?,1)',uid,name,initials,color);account(uid);}
 const vendors=[['circuit','tech','Circuit House','Electronics','Thoughtful tech for your everyday. Accessories, essentials, and honest product details.','CH','#486c7b'],['everyday','style','Everyday Studio','Fashion','Wear what feels like you. Clothing and accessories, made for everyday life.','ES','#92739a'],['living','home','The Living Room','Home & Living','Small things that make your space feel like home.','LR','#b48d55'],['basket','fresh','Fresh Basket','Groceries','Fresh ingredients and pantry favourites from your neighbourhood.','FB','#749267'],['pepper','food','Pepper & Co.','Food & Drinks','Comfort food, big flavour. Prepared fresh for pickup or local delivery.','PC','#bd7959']];
 for(const [vid,owner,name,category,description,initials,color] of vendors){run('INSERT INTO vendors VALUES(?,?,?,?,?,?,?,?,1,1,?)',vid,owner,name,category,'Otukpo',description,initials,color,'Market Road, Otukpo · fictional demo');run('INSERT INTO zones VALUES(?,?,?,?)',`${vid}-central`,vid,'Otukpo Central',50000);run('INSERT INTO zones VALUES(?,?,?,?)',`${vid}-campus`,vid,'Campus area',80000);account(`vendor:${vid}`);}
 const products=[['cable','circuit','Braided USB-C cable','Electronics','A durable 1 m USB-C to USB-C charging cable. Check your device port before ordering.','New','USB-C to USB-C · 1 m',200000,'🔌','#e4e9df'],['headphones','circuit','Everyday wireless headphones','Electronics','Over-ear wireless headphones with a soft, comfortable fit. Battery runtime not supplied.','New','Bluetooth · Sage green',2850000,'🎧','#e6eadf'],['phone','circuit','Pocket smartphone','Electronics','A compact pre-owned phone. Inspect condition with the seller before purchase.','Used','128 GB · Unlocked',11500000,'📱','#e8e3ee'],['tote','everyday','The everyday canvas tote','Fashion','Your take-everywhere tote, with room for the little things.','New','Natural cotton · One size',450000,'👜','#eee4d7'],['sneakers','everyday','Off-duty sneakers','Fashion','A comfortable everyday pair in a clean neutral colour.','New','EU 42 · Cream',1800000,'👟','#e5e8e0'],['shirt','everyday','Relaxed cotton shirt','Fashion','An easy cotton shirt for warm afternoons.','New','Large · Olive',850000,'👕','#e3e8d8'],['lamp','living','Little desk light','Home & Living','A warm pool of light for your favourite corner.','New','USB-C powered · 3 brightness levels',1850000,'💡','#eee6d9'],['plant','living','A little green companion','Home & Living','A small potted plant for a brighter windowsill.','Not applicable','Pot included · Approx. 20 cm',550000,'🪴','#e2e8d9'],['basket-goods','basket','Pantry essentials basket','Groceries','An illustrative selection of rice, pasta, and pantry staples. Confirm contents with seller.','Not applicable','One bundle',1200000,'🧺','#ede7d5'],['tomatoes','basket','Fresh tomatoes','Groceries','A basket of locally sourced tomatoes.','Not applicable','One small basket',350000,'🍅','#f0dfd6'],['rice','pepper','Jollof & chicken combo','Food & Drinks','A portion of jollof rice served with chicken. Ask seller about ingredients and allergens.','Not applicable','One portion',250000,'🍛','#efe2d5'],['drink','pepper','Fresh citrus drink','Food & Drinks','A refreshing citrus drink.','Not applicable','500 ml',100000,'🍊','#f0e6cf']];
 for(const [pid,vid,name,cat,desc,condition,attrs,price,emoji,color] of products)run('INSERT INTO products VALUES(?,?,?,?,?,?,?,?,1,0,?,?)',pid,vid,name,cat,desc,condition,attrs,price,emoji,color);
 });
 topUp('ada',1500000,'initial-demo-funds');topUp('tunde',500000,'initial-demo-funds');
 const thread=openThread('ada','tunde');message(thread,'tunde','system','Your personal conversation is ready. Send a message to try WhatsApp Marketplace.');
}
seed();

// Add payment handles to existing databases without replacing users, keys or balances.
transaction(()=>{const handles:Record<string,string>={ada:"ada",tunde:"tunde",tech:"chidi",style:"amaka",home:"musa",fresh:"grace",food:"peter"};for(const u of many<{id:string}>("SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM usernames)"))assignUsername(u.id,handles[u.id]);});

transaction(()=>{for(const [uid,name] of Object.entries({tech:"Chidi Nwosu",style:"Amaka Eze",home:"Musa Adamu",fresh:"Grace Odeh",food:"Peter Oche"}))run("UPDATE users SET name=? WHERE id=? AND demo=1",name,uid);});

// Refresh the seeded system welcome after the presentation rebrand.
run("UPDATE messages SET body=? WHERE kind='system' AND body=?", "Your personal conversation is ready. Send a message to try WhatsApp Marketplace.", "Your personal conversation is ready. Send a message to try OrderDesk.");
