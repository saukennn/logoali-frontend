'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, removeToken } from '@/lib/auth'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
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
} from '@mui/icons-material'

const DRAWER_WIDTH = 280

interface LayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', adminOnly: false },
  { text: 'Mesas', icon: <MesasIcon />, path: '/mesas', adminOnly: false },
  { text: 'Balcao', icon: <BalcaoIcon />, path: '/balcao', adminOnly: false },
  { text: 'Estoque', icon: <InventoryIcon />, path: '/estoque', adminOnly: true },
  { text: 'Financeiro', icon: <FinanceiroIcon />, path: '/financeiro', adminOnly: true },
  { text: 'Relatórios', icon: <RelatoriosIcon />, path: '/relatorios', adminOnly: true },
  { text: 'Caixa', icon: <CaixaIcon />, path: '/caixa', adminOnly: true },
  { text: 'Produtos', icon: <ProdutosIcon />, path: '/produtos', adminOnly: true },
]

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const user = getUser()

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    removeToken()
    handleMenuClose()
    router.push('/login')
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  if (!user) {
    return null
  }

  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || user.tipo === 'ADMIN'
  )

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          backgroundColor: '#000000',
          color: '#FF6B35',
          minHeight: '64px !important',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
          Logo<span style={{ color: '#FF6B35' }}>ali</span>
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: '#000000', borderWidth: 2 }} />
      <List sx={{ px: 1, py: 2 }}>
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  '& .MuiListItemIcon-root': {
                    color: isActive ? '#FF6B35' : '#000000',
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#FF6B35' : '#000000',
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: '#000000',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user.nome}
            </Typography>
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                p: 0,
                '&:hover': {
                  backgroundColor: 'rgba(255, 107, 53, 0.1)',
                },
              }}
            >
              <Avatar
                sx={{
                  bgcolor: '#FF6B35',
                  width: 40,
                  height: 40,
                  fontSize: '1rem',
                }}
              >
                {user.nome.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="body2">{user.nome}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user.tipo === 'ADMIN' ? 'Administrador' : 'Garçom'}
                  </Typography>
                </ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Sair</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '2px solid #000000',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '2px solid #000000',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          backgroundColor: '#FFFFFF',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
