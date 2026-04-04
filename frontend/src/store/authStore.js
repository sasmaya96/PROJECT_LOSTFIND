import { create } from 'zustand'
import { authAPI } from '@/services/api'

const useAuthStore = create((set) => ({
  user:            null,
  isAuthenticated: false,
  isLoading:       true,

  init: async () => {
    if (!localStorage.getItem('access')) { set({ isLoading: false }); return }
    try {
      const { data } = await authAPI.profile()
      set({ user: data, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.clear()
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('access',  data.access)
    localStorage.setItem('refresh', data.refresh)
    const { data: profile } = await authAPI.profile()
    set({ user: profile, isAuthenticated: true })
    return profile
  },

  register: async (formData) => {
    const { data } = await authAPI.register(formData)
    localStorage.setItem('access',  data.tokens.access)
    localStorage.setItem('refresh', data.tokens.refresh)
    set({ user: data.user, isAuthenticated: true })
    return data.user
  },

  logout: async () => {
    try { await authAPI.logout({ refresh: localStorage.getItem('refresh') }) } catch {}
    localStorage.clear()
    set({ user: null, isAuthenticated: false })
  },

  setUser: (u) => set((s) => ({ user: { ...s.user, ...u } })),
}))

export default useAuthStore
