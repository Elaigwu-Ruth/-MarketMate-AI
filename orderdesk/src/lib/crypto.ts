import type { User } from './types';
// OpenPGP.js handles message encryption and signing. Device trust, key backup,
// rotation and forward secrecy remain pending; this is not WhatsApp parity.
export async function prepareKeys(user:User) {
 const pgp=await import('openpgp');const name=`orderdesk-key:${user.id}`;const saved=localStorage.getItem(name);
 if(saved)return JSON.parse(saved) as {privateKey:string;publicKey:string};
 if(user.public_key)throw new Error('This profile has a messaging key in another browser. Use that browser for encrypted chats; linked devices are pending.');
 const {privateKey,publicKey}=await pgp.generateKey({type:'ecc',curve:'curve25519Legacy',userIDs:[{name:user.name}],format:'armored'});const pair={privateKey,publicKey};localStorage.setItem(name,JSON.stringify(pair));return pair;
}
export async function encryptText(content:string,members:User[],user:User) {
 const pgp=await import('openpgp');const own=await prepareKeys(user);
 if(members.some(m=>!m.public_key))throw new Error('The other person needs to open WhatsApp Marketplace once to set up their messaging key.');
 const encryptionKeys=await Promise.all(members.map(m=>pgp.readKey({armoredKey:m.public_key!})));const signingKey=await pgp.readPrivateKey({armoredKey:own.privateKey});
 return pgp.encrypt({message:await pgp.createMessage({text:content}),encryptionKeys,signingKeys:signingKey,format:'armored'});
}
export async function decryptText(body:string,sender:User|undefined,user:User) {
 const pgp=await import('openpgp');const saved=localStorage.getItem(`orderdesk-key:${user.id}`);if(!saved||!sender?.public_key)return '[Message key unavailable on this browser]';
 const pair=JSON.parse(saved);const result=await pgp.decrypt({message:await pgp.readMessage({armoredMessage:body}),decryptionKeys:await pgp.readPrivateKey({armoredKey:pair.privateKey}),verificationKeys:await pgp.readKey({armoredKey:sender.public_key}),expectSigned:true,format:'utf8'});await Promise.all(result.signatures.map(s=>s.verified));return result.data;
}
