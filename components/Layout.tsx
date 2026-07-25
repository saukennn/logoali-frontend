'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, removeToken } from '@/lib/auth'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface LayoutProps { children: React.ReactNode }

// Ícone como função que recebe className (SVG inline, sem dependência de MUI)
type IconFn = (cls: string) => React.ReactNode

const icons: Record<string, IconFn> = {
  dashboard: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  mesas: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 10l1.5 9h15L21 10M3 10l1-5h16l1 5" /></svg>,
  balcao: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7l1-3h16l1 3M3 7h18M3 7v13a1 1 0 001 1h16a1 1 0 001-1V7M9 11h6" /></svg>,
  historico: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  garcons: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z" /></svg>,
  estoque: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  financeiro: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  relatorios: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  caixa: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  produtos: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  contas: (c) => <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
}

const menuItems = [
  { text: 'Dashboard',  icon: 'dashboard',  path: '/dashboard',          adminOnly: false },
  { text: 'Mesas',      icon: 'mesas',      path: '/mesas',              adminOnly: false },
  { text: 'Balcão',     icon: 'balcao',     path: '/balcao',             adminOnly: false },
  { text: 'Histórico',  icon: 'historico',  path: '/historico-pedidos',  adminOnly: true },
  { text: 'Garçons',    icon: 'garcons',    path: '/garcons',            adminOnly: true },
  { text: 'Estoque',    icon: 'estoque',    path: '/estoque',            adminOnly: true },
  { text: 'Preços',     icon: 'financeiro', path: '/financeiro',         adminOnly: true },
  { text: 'Contas a Pagar', icon: 'contas', path: '/contas-pagar',       adminOnly: true },
  { text: 'Relatórios', icon: 'relatorios', path: '/relatorios',         adminOnly: true },
  { text: 'Caixa',      icon: 'caixa',      path: '/caixa',              adminOnly: true },
  { text: 'Produtos',   icon: 'produtos',   path: '/produtos',           adminOnly: true },
]

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // getUser() lê de um cookie (document.cookie), que não existe durante o SSR
  // — no servidor sempre retornaria null. Ler direto no render faria o server
  // renderizar "deslogado" e o client hidratar "logado" com o mesmo componente,
  // uma árvore DOM diferente em cada lado. O React descarta essa árvore inteira
  // e re-renderiza do zero no cliente ao detectar o mismatch — na prática, um
  // flash da página montando pela segunda vez, com o layout momentaneamente
  // quebrado (sidebar/conteúdo ainda não posicionados) até assentar de novo.
  // Por isso: sempre montar só depois do efeito rodar no cliente (mounted),
  // e só então ler o usuário — assim servidor e cliente concordam no primeiro
  // render (ambos mostram o skeleton), sem hydration mismatch.
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null)

  useEffect(() => {
    setMounted(true)
    setUser(getUser())
  }, [])

  useEffect(() => {
    if (mounted && !user) router.push('/login')
  }, [mounted, user, router])

  if (!mounted || !user) return null

  const filtered = menuItems.filter((item) => !item.adminOnly || user.tipo === 'ADMIN')

  const drawer = (
    <div className="flex flex-col h-full bg-surface">
      {/* Logo */}
      <div className="px-6 py-5 bg-gradient-to-br from-ink to-ink-light flex items-center min-h-[72px]">
        <span className="text-2xl font-black tracking-tight text-white">
          Logo<span className="text-brand-500">ali</span>
        </span>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filtered.map((item) => {
          const active = pathname === item.path
          return (
            <button
              key={item.text}
              onClick={() => { router.push(item.path); setMobileOpen(false) }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text'}
              `}
            >
              <span className={active ? 'text-brand-500' : 'text-text-subtle'}>
                {icons[item.icon]('w-5 h-5')}
              </span>
              <span className="flex-1 text-left">{item.text}</span>
              {active && <span className="w-1 h-5 rounded-full bg-brand-500" />}
            </button>
          )
        })}
      </nav>

      {/* Usuário no rodapé */}
      <div className="border-t border-border px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {user.nome.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text truncate leading-tight">{user.nome}</p>
          <p className="text-xs text-text-subtle">{user.tipo === 'ADMIN' ? 'Administrador' : 'Garçom'}</p>
        </div>
        <ThemeToggle />
        <button
          onClick={() => { removeToken(); router.push('/login') }}
          className="text-text-subtle hover:text-danger transition-colors p-1.5"
          title="Sair"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-alt md:flex">
      {/* AppBar mobile */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-ink border-b border-black/20 h-14 flex items-center px-4">
        <button onClick={() => setMobileOpen(true)} className="text-white p-1.5 -ml-1.5" aria-label="Abrir menu">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-2 text-lg font-black text-white tracking-tight flex-1">
          Logo<span className="text-brand-500">ali</span>
        </span>
        <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />
      </header>

      {/* Sidebar desktop — irmã do <main> no mesmo flex container (não usa
          position:fixed), então nunca pode sobrepor o conteúdo: o espaço que
          ela ocupa é sempre reservado pelo próprio fluxo do layout, sem
          depender de uma margem separada no <main> ficar sincronizada com a
          largura dela. */}
      <aside className="hidden md:flex md:w-60 md:flex-shrink-0 md:sticky md:top-0 md:h-screen border-r border-border z-20">
        {drawer}
      </aside>

      {/* Drawer mobile (overlay) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-60 shadow-xl">
            {drawer}
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 min-h-screen">
        {/* Padding horizontal cresce em telas médias (md/lg) para sempre dar
            respiro entre a borda da sidebar e o conteúdo — sem isso, o
            conteúdo (que também tem max-w-7xl mx-auto) só ganha espaço lateral
            quando a viewport é larga o bastante para sobrar folga de
            centralização; abaixo disso ficava colado direto na borda direita
            da sidebar. */}
        <div className="p-4 sm:p-6 md:px-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  )
}
