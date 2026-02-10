import type { Metadata } from 'next'
import './globals.css'
import ThemeRegistry from '@/components/ThemeRegistry'

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
    <html lang="pt-BR">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}



