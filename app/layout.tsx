import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Logoali - Sistema de Gestão de Bar',
  description: 'Sistema completo para gestão de bar com controle de mesas, pedidos e impressão',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-surface-alt text-text">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



