# Logoali Frontend

Frontend Next.js para sistema de gestão de bar.

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Hook Form
- Axios
- JWT Authentication

## 🚀 Início Rápido com Docker

```bash
chmod +x start.sh
./start.sh
```

**⚠️ Importante:** O Backend deve estar rodando primeiro em http://localhost:3001

O script cria automaticamente o arquivo `.env.local` se não existir.

## 📦 Instalação Manual

```bash
npm install
```

## ⚙️ Configuração

1. Crie o arquivo `.env.local` (ou use o script `start.sh` que cria automaticamente):

```bash
# O script start.sh cria automaticamente, ou crie manualmente:
```

2. Configure a variável de ambiente:

- `NEXT_PUBLIC_API_URL`: URL do backend (padrão: http://localhost:3001)

## Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm run start
```

## Estrutura

- `app/`: Páginas do Next.js (App Router)
  - `login/`: Página de login
  - `dashboard/`: Dashboard principal
  - `mesas/`: Gestão de mesas
  - `caixa/`: Controle de caixa
  - `produtos/`: Gestão de produtos
- `components/`: Componentes reutilizáveis
- `lib/`: Utilitários e configurações
  - `auth.ts`: Gerenciamento de autenticação
  - `api.ts`: Cliente Axios configurado

## Funcionalidades

- Login com JWT
- Dashboard com estatísticas
- Gestão de mesas (até 23 mesas)
- Abertura de sessões de mesa
- Criação de contas por cliente
- Adição de pedidos
- Fechamento de contas
- Controle de caixa (depósitos e sangrias)
- Gestão de produtos

