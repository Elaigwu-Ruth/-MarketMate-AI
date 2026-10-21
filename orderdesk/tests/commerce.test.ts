import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.ORDERDESK_DB=':memory:';
const {db,one,many,run,openThread,createQuote,checkout,topUp,transition,balance,member}=await import('../src/lib/db');
const quoteFor=(thread:string,items=[{product_id:'cable',quantity:2}],fulfilment='pickup',zone_id?:string,address?:string)=>createQuote('ada',{thread_id:thread,items,fulfilment,zone_id,address});

test('personal conversations reuse one thread and enforce membership',()=>{
 const a=openThread('ada','tunde');const b=openThread('tunde','ada');assert.equal(a,b);assert.doesNotThrow(()=>member('ada',a));assert.throws(()=>member('tech',a));assert.throws(()=>quoteFor(a));
});
test('delivery is priced from the seller zone, mixed sellers and invalid quantities are rejected',()=>{
 const t=openThread('ada','tech','circuit');const q=quoteFor(t,[{product_id:'cable',quantity:2}],'delivery','circuit-central','12 Market Street');assert.equal(q.subtotal,400000);assert.equal(q.fee,50000);assert.equal(q.total,450000);assert.throws(()=>quoteFor(t,[{product_id:'tote',quantity:1}]));assert.throws(()=>quoteFor(t,[{product_id:'cable',quantity:0}]));assert.throws(()=>quoteFor(t,[{product_id:'cable',quantity:1.5}]));assert.throws(()=>quoteFor(t,[{product_id:'cable',quantity:1}],'delivery','pepper-central','12 Market Street'));
});
test('checkout retries create exactly one order, debit, and chat card; another key cannot consume the quote',()=>{
 const t=openThread('ada','tech','circuit'),q=quoteFor(t);const before=balance('ada');const a=checkout('ada',q.id,'checkout-once'),b=checkout('ada',q.id,'checkout-once');assert.deepEqual(a,b);assert.equal(balance('ada'),before-q.total);assert.equal(one<{n:number}>("SELECT COUNT(*) n FROM messages WHERE body=? AND kind='order'",a.order_id)!.n,1);assert.throws(()=>checkout('ada',q.id,'another-key'));const other=quoteFor(t);assert.throws(()=>checkout('ada',other.id,'checkout-once'));
});
test('unfunded, expired, non-owner and changed-price quotes leave wallet and orders untouched',()=>{
 const t=openThread('ada','tech','circuit');const expensive=quoteFor(t,[{product_id:'phone',quantity:99}]);const before=balance('ada');assert.throws(()=>checkout('ada',expensive.id,'no-money'));assert.equal(balance('ada'),before);const q=quoteFor(t);assert.throws(()=>checkout('tunde',q.id,'wrong-owner'));run('UPDATE products SET price=price+100 WHERE id=?','cable');assert.throws(()=>checkout('ada',q.id,'stale-price'));run('UPDATE products SET price=price-100 WHERE id=?','cable');run('UPDATE quotes SET expires_at=? WHERE id=?','2000-01-01T00:00:00.000Z',q.id);assert.throws(()=>checkout('ada',q.id,'expired'));assert.equal(balance('ada'),before);
});
test('cancellation refunds once and cannot race into acceptance',()=>{
 const t=openThread('ada','tech','circuit'),q=quoteFor(t);const before=balance('ada');const o=checkout('ada',q.id,'cancel-order');transition('ada',o.order_id,'cancelled','cancel-once');transition('ada',o.order_id,'cancelled','cancel-once');assert.equal(balance('ada'),before);assert.throws(()=>transition('tech',o.order_id,'accepted','accept-too-late'));assert.throws(()=>transition('ada',o.order_id,'cancelled','cancel-twice'));
});
test('only the seller fulfils; completion settles once and delivery follows its own path',()=>{
 topUp('ada',1000000,'test-more');const t=openThread('ada','tech','circuit'),q=quoteFor(t,[{product_id:'cable',quantity:1}],'delivery','circuit-campus','Campus gate');const o=checkout('ada',q.id,'delivery-order');const before=balance('vendor:circuit');assert.throws(()=>transition('tunde',o.order_id,'accepted','outsider'));assert.throws(()=>transition('ada',o.order_id,'accepted','customer-accept'));transition('tech',o.order_id,'accepted','seller-accept');assert.throws(()=>transition('ada',o.order_id,'cancelled','late-cancel'));transition('tech',o.order_id,'preparing','pack');transition('tech',o.order_id,'ready','ready');assert.throws(()=>transition('tech',o.order_id,'completed','skip-delivery'));transition('tech',o.order_id,'out_for_delivery','dispatch');transition('tech',o.order_id,'completed','complete');transition('tech',o.order_id,'completed','complete');assert.equal(balance('vendor:circuit'),before+q.total);assert.equal(balance('clearing:'+o.order_id),0);assert.throws(()=>transition('tech',o.order_id,'completed','another-complete'));
});
test('top-up keys reject changed input, ledger balances reconcile, and entries are immutable',()=>{
 const before=balance('tunde');topUp('tunde',100000,'fund-once');topUp('tunde',100000,'fund-once');assert.equal(balance('tunde'),before+100000);assert.throws(()=>topUp('tunde',200000,'fund-once'));const sums=many<{sum:number}>('SELECT SUM(amount) sum FROM ledger GROUP BY operation_id');assert.ok(sums.every(s=>s.sum===0));const accounts=many<{id:string;balance:number;actual:number}>('SELECT a.id,a.balance,COALESCE(SUM(l.amount),0) actual FROM accounts a LEFT JOIN ledger l ON l.account_id=a.id GROUP BY a.id');for(const a of accounts)assert.equal(a.balance,a.actual,a.id);assert.throws(()=>db.exec('UPDATE ledger SET amount=0'));assert.throws(()=>db.exec('DELETE FROM ledger'));
});

test('payment usernames are exact, unique, permanent and case-insensitive',async()=>{
 const {resolveRecipient,assignUsername,normaliseUsername}=await import('../src/lib/db');assert.equal(resolveRecipient('@TUNDE').id,'tunde');assert.equal(resolveRecipient('chidi').name,'Chidi Nwosu');assert.throws(()=>resolveRecipient('tund'));assert.throws(()=>normaliseUsername('аda'));assert.throws(()=>normaliseUsername('support'));assert.throws(()=>assignUsername('ada','another_ada'));assert.throws(()=>run('UPDATE usernames SET username=? WHERE user_id=?','different','ada'));
});
test('person-to-person transfers debit and credit atomically with one shared receipt on retries',async()=>{
 const {sendMoney}=await import('../src/lib/db');const beforeSender=balance('ada'),beforeReceiver=balance('tunde');const input={recipient_id:'tunde',recipient_username:'@TUNDE',amount:123450,note:'For lunch'};const a=sendMoney('ada',input,'friend-transfer'),b=sendMoney('ada',input,'friend-transfer');assert.deepEqual(a,b);assert.equal(balance('ada'),beforeSender-123450);assert.equal(balance('tunde'),beforeReceiver+123450);assert.equal(one<{n:number}>('SELECT COUNT(*) n FROM transfers WHERE id=?',a.transfer_id)!.n,1);assert.equal(one<{n:number}>("SELECT COUNT(*) n FROM messages WHERE kind='transfer' AND body=?",a.transfer_id)!.n,1);assert.equal(many<{sum:number}>('SELECT SUM(amount) sum FROM ledger WHERE operation_id=?',a.transfer_id)[0].sum,0);assert.doesNotThrow(()=>member('tunde',a.thread_id));assert.throws(()=>sendMoney('ada',{...input,amount:123451},'friend-transfer'));
});
test('invalid recipients, self-transfers, insufficient funds and invalid amounts leave balances untouched',async()=>{
 const {sendMoney}=await import('../src/lib/db');const before=balance('ada'),count=one<{n:number}>('SELECT COUNT(*) n FROM transfers')!.n;
 for(const [i,input] of [
 {recipient_id:'ada',recipient_username:'ada',amount:10000},
 {recipient_id:'tech',recipient_username:'tunde',amount:10000},
 {recipient_id:'tunde',recipient_username:'not_a_user',amount:10000},
 {recipient_id:'tunde',recipient_username:'tunde',amount:100000000},
 {recipient_id:'tunde',recipient_username:'tunde',amount:-100},
 {recipient_id:'tunde',recipient_username:'tunde',amount:100.5},
 {recipient_id:'tunde',recipient_username:'tunde',amount:NaN},
 ].entries())assert.throws(()=>sendMoney('ada',input,'invalid-'+i));
 assert.equal(balance('ada'),before);assert.equal(one<{n:number}>('SELECT COUNT(*) n FROM transfers')!.n,count);
 const accounts=many<{id:string;balance:number;actual:number}>('SELECT a.id,a.balance,COALESCE(SUM(l.amount),0) actual FROM accounts a LEFT JOIN ledger l ON l.account_id=a.id GROUP BY a.id');for(const a of accounts)assert.equal(a.balance,a.actual,a.id);
});
