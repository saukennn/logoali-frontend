'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, removeToken } from '@/lib/auth'
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider,
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Menu, MenuItem, useMediaQuery, useTheme,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  AttachMoney as FinanceiroIcon,
  TableRestaurant as MesasIcon,
  PointOfSale as CaixaIcon,
  Restaurant as ProdutosIcon,
  Storefront as BalcaoIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Assessment as RelatoriosIcon,
  People as GarconsIcon,
} from '@mui/icons-material'

const DRAWER_WIDTH = 240

interface LayoutProps { children: React.ReactNode }

const menuItems = [
  { text: 'Dashboard',  icon: <DashboardIcon  sx={{ fontSize: 20 }} />, path: '/dashboard',  adminOnly: false },
  { text: 'Mesas',      icon: <MesasIcon       sx={{ fontSize: 20 }} />, path: '/mesas',      adminOnly: false },
  { text: 'Balcão',     icon: <BalcaoIcon      sx={{ fontSize: 20 }} />, path: '/balcao',     adminOnly: false },
  { text: 'Garçons',    icon: <GarconsIcon     sx={{ fontSize: 20 }} />, path: '/garcons',    adminOnly: true },
  { text: 'Estoque',    icon: <InventoryIcon   sx={{ fontSize: 20 }} />, path: '/estoque',    adminOnly: true },
  { text: 'Financeiro', icon: <FinanceiroIcon  sx={{ fontSize: 20 }} />, path: '/financeiro', adminOnly: true },
  { text: 'Relatórios', icon: <RelatoriosIcon  sx={{ fontSize: 20 }} />, path: '/relatorios', adminOnly: true },
  { text: 'Caixa',      icon: <CaixaIcon       sx={{ fontSize: 20 }} />, path: '/caixa',      adminOnly: true },
  { text: 'Produtos',   icon: <ProdutosIcon    sx={{ fontSize: 20 }} />, path: '/produtos',   adminOnly: true },
]

export default function Layout({ children }: LayoutProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl]     = useState<null | HTMLElement>(null)
  const user = getUser()

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  if (!user) return null

  const filtered = menuItems.filter(item => !item.adminOnly || user.tipo === 'ADMIN')

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{
        px: 3, py: 3,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        display: 'flex', alignItems: 'center', minHeight: 80,
      }}>
        <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-1px', color: '#fff', fontSize: '1.6rem' }}>
          Logo<span style={{ color: '#f97316' }}>ali</span>
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />

      {/* Menu */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {filtered.map((item) => {
          const active = pathname === item.path
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={active}
                onClick={() => { router.push(item.path); if (isMobile) setMobileOpen(false) }}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  px: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: '#fff7ed',
                    '&:hover': { backgroundColor: '#ffedd5' },
                  },
                  '&:hover': { backgroundColor: '#f9fafb' },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 36,
                  color: active ? '#f97316' : '#6b7280',
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#f97316' : '#374151',
                  }}
                />
                {active && (
                  <Box sx={{
                    width: 3, height: 18, borderRadius: 4,
                    backgroundColor: '#f97316', ml: 1,
                  }} />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      {/* Usuário no rodapé */}
      <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: '#f97316' }}>
          {user.nome.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.nome}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>
            {user.tipo === 'ADMIN' ? 'Administrador' : 'Garçom'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => { removeToken(); router.push('/login') }}
          sx={{ ml: 'auto', color: '#9ca3af', '&:hover': { color: '#ef4444' } }}
          title="Sair">
          <LogoutIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Topbar mobile */}
      <AppBar position="fixed" elevation={0} sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333',
        display: { md: 'none' },
      }}>
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <IconButton onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 1, color: '#fff' }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Logo<span style={{ color: '#f97316' }}>ali</span>
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer mobile */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid #e5e7eb', boxShadow: 'none' },
          }}
        >
          {drawer}
        </Drawer>

        {/* Drawer desktop — permanente */}
        <Drawer variant="permanent" open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid #e5e7eb', boxShadow: 'none' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Conteúdo principal */}
      <Box component="main" sx={{
        flexGrow: 1,
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        mt: { xs: '56px', md: 0 },
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        overflowX: 'hidden',
        p: { xs: 2, sm: 3 },
      }}>
        {children}
      </Box>
    </Box>
  )
}
