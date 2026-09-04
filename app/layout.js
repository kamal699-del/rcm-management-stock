import './globals.css';

export const metadata = {
  title: 'RCM – Management Stock',
  description: 'Sistem manajemen stok LC Rancamanyar',
  applicationName: 'RCM Management Stock',
  manifest: '/manifest.webmanifest',
  themeColor: '#ffffff',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/apple-touch-icon.png'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff'
};

export default function RootLayout({children}){
  return <html lang="id"><body>{children}</body></html>
}
