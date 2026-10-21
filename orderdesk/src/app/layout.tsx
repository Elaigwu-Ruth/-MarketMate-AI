import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './globals.css';
export const metadata:Metadata={title:'WhatsApp Marketplace — Prototype',description:'Chat, discover, and shop. A messaging-first marketplace with an integrated demo wallet.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
