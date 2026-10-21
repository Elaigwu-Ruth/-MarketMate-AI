'use client';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, MessageCircleMore, Plus, ShieldCheck, ShoppingBag, ShoppingBasket, Sparkles, Store, Wallet, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDialogFocus } from '@/lib/use-dialog-focus';

type Step = { icon: LucideIcon; title: string; where: string; body: string };

const steps: Step[] = [
  { icon: MessageCircleMore, title: 'Chats', where: 'Left rail · Chats', body: 'Open a conversation, add a contact or send a private message. Text is encrypted in your browser before it is stored.' },
  { icon: ShoppingBag, title: 'Marketplace', where: 'Left rail · Marketplace', body: 'Start with a niche or search directly. Open a listing to see the seller, price, condition and pickup details.' },
  { icon: Plus, title: 'Sell something', where: 'Top bar · Sell something', body: 'Publish a listing in a few fields. Your first listing creates a seller profile automatically — no separate shop signup.' },
  { icon: ShoppingBasket, title: 'Orders', where: 'Top bar · basket icon', body: 'Track orders and receipts in one place. Sellers accept, prepare, dispatch or complete each order from here or Business tools.' },
  { icon: Wallet, title: 'Wallet', where: 'Left rail · Wallet', body: 'See your balance, add simulated credit and send funds to any @username. Order payments stay held until fulfilment or an eligible refund.' },
  { icon: Store, title: 'Business tools', where: 'Left rail · Business tools', body: 'Manage your shop, change prices or availability, and move incoming orders through fulfilment.' },
  { icon: Sparkles, title: 'Order assistant', where: 'Seller chat · sparkle button', body: 'Describe what you need in plain language. The assistant suggests catalogue items; you review and edit the order before paying.' },
];

export function WelcomePrompt({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  return <div className="welcome-prompt" role="region" aria-label="Getting started">
    <div className="welcome-prompt-head">
      <span className="welcome-prompt-icon"><Compass size={18}/></span>
      <div>
        <span className="welcome-kicker">START HERE</span>
        <strong>A quick map of your marketplace.</strong>
        <small>Chats, shopping, wallet and seller tools — see where everything lives in sixty seconds.</small>
      </div>
    </div>
    <div className="welcome-prompt-actions">
      <button className="primary small" onClick={onStart}>Take the tour <ArrowRight size={14}/></button>
      <button className="text-button" onClick={onDismiss}>Maybe later</button>
    </div>
  </div>;
}

export function WelcomeTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(dialog, onClose);
  const current = steps[step];
  const Icon = current.icon;
  const last = step === steps.length - 1;

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="modal welcome-tour" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="tour-title" onClick={event => event.stopPropagation()}>
      <aside className="tour-rail">
        <span className="tour-rail-kicker">YOUR QUICK MAP</span>
        <ol className="tour-list">
          {steps.map((item, index) => <li key={item.title}>
            <button className={index === step ? 'active' : ''} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}>
              <span className="tour-index">{index + 1}</span>
              <span><strong>{item.title}</strong><small>{item.where}</small></span>
            </button>
          </li>)}
        </ol>
        <p className="tour-rail-note"><ShieldCheck size={13}/> Wallet balances are simulated. No real money moves.</p>
      </aside>
      <div className="tour-content">
        <button className="modal-close" aria-label="Close tour" onClick={onClose}><X size={20}/></button>
        <div className="tour-progress">
          <span>STEP {step + 1} OF {steps.length}</span>
          <div className="tour-dots" aria-hidden="true">
            {steps.map((item, index) => <span key={item.title} className={index === step ? 'current' : index < step ? 'done' : ''}/>)}
          </div>
        </div>
        <span className="tour-icon"><Icon size={26}/></span>
        <h2 id="tour-title">{current.title}<span>.</span></h2>
        <p className="tour-where"><Compass size={13}/> {current.where}</p>
        <p className="tour-body">{current.body}</p>
        <div className="tour-actions">
          <button className="text-button" onClick={onClose}>Skip tour</button>
          <div>
            {step > 0 && <button className="secondary small" onClick={() => setStep(step - 1)}><ArrowLeft size={15}/> Back</button>}
            <button className="primary small" onClick={() => last ? onClose() : setStep(step + 1)}>
              {last ? <>Start exploring <Check size={15}/></> : <>Next <ArrowRight size={15}/></>}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
