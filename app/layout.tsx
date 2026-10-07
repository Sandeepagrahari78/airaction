import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'AirAction | Pollution response workspace', description: 'Coordinate air-pollution incidents, field action and independent verification.', icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="en"><body>{children}</body></html>; }
