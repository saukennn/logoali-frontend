import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tokens semânticos de superfície/texto — apontam pra CSS variables (globals.css),
        // que trocam de valor conforme a classe `dark` no <html>. Use estes em vez de
        // bg-white/text-gray-900/border-gray-200 diretos para páginas/componentes que
        // precisam responder ao tema.
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          alt: 'rgb(var(--surface-alt) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--text-subtle) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
        },
        // Cor primária da marca (laranja Logoali) — fonte única da verdade
        primary: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12', DEFAULT: '#f97316',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#f97316',
        },
        // Tokens semânticos de estado
        success: { light: '#dcfce7', DEFAULT: '#16a34a', dark: '#15803d' },
        danger:  { light: '#fee2e2', DEFAULT: '#dc2626', dark: '#b91c1c' },
        warning: { light: '#fef3c7', DEFAULT: '#d97706', dark: '#b45309' },
        info:    { light: '#dbeafe', DEFAULT: '#2563eb', dark: '#1d4ed8' },
        // Tom escuro da sidebar
        ink: { DEFAULT: '#1a1a1a', light: '#2d2d2d' },
        // Alias para compatibilidade — 'orange' aponta para a cor da marca.
        // Permite migração incremental sem quebrar classes bg-orange-500 existentes.
        orange: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config



