import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  /**
   * Estendendo o objeto User
   */
  interface User {
    id: string
    name: string
    email: string
    role: string
    companyId?: string
    company?: string
    position?: string
    phone?: string
    isNewModel?: boolean
  }

  /**
   * Estendendo o objeto Session
   */
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      companyId?: string
      company?: string
      position?: string
      phone?: string
      isNewModel?: boolean
    } & DefaultSession['user']
  }

  /**
   * Estendendo o objeto JWT
   */
  interface JWT {
    id: string
    role: string
    companyId?: string
    company?: string
    position?: string
    phone?: string
    isNewModel?: boolean
  }
}
