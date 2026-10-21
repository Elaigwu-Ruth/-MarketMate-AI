'use client';
import {useEffect,useRef,type RefObject} from 'react';
export function useDialogFocus(dialog:RefObject<HTMLElement|null>,onClose:()=>void,blocked=false){
 const close=useRef(onClose),pending=useRef(blocked);close.current=onClose;pending.current=blocked;
 useEffect(()=>{const before=document.activeElement as HTMLElement|null;const el=dialog.current;el?.querySelector<HTMLElement>('input,select,textarea')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!pending.current)close.current();if(e.key==='Tab'&&el){const items=Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select,textarea'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);before?.focus();};},[dialog]);
}
