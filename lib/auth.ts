import Cookies from 'js-cookie'

const TOKEN_KEY = 'logoali_token'
const USER_KEY = 'logoali_user'

export interface User {
  id: string
  nome: string
  email: string
  tipo: 'ADMIN' | 'GARCOM'
}

export function setToken(token: string) {
  Cookies.set(TOKEN_KEY, token, { expires: 7 })
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function removeToken() {
  Cookies.remove(TOKEN_KEY)
  Cookies.remove(USER_KEY)
}

export function setUser(user: User) {
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7 })
}

export function getUser(): User | null {
  const userStr = Cookies.get(USER_KEY)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!getToken()
}



