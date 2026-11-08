import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const post = vi.fn()
vi.mock('@/services/api', () => ({ api: { post: (...a: unknown[]) => post(...a), get: vi.fn() } }))
vi.mock('@/services/websocket', () => ({ wsService: { disconnect: vi.fn() } }))

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

const { useAuthStore } = await import('./auth')
const home = { id: 'u1', email: 'a@b.c', full_name: 'A', organization_id: 'home-org' }

beforeEach(() => {
  setActivePinia(createPinia())
  store.clear()
  post.mockReset()
})

describe('applyRememberedOrg after a fresh sign-in', () => {
  it('switches the session back to the org chosen earlier', async () => {
    store.set('selected_organization_id', 'vinfast-org')
    post.mockImplementation(async (url: string) =>
      url === '/auth/switch-org'
        ? { data: { data: { user: { ...home, organization_id: 'vinfast-org' } } } }
        : { data: { data: { user: home } } })

    const auth = useAuthStore()
    await auth.login('a@b.c', 'pw')

    expect(post).toHaveBeenCalledWith('/auth/switch-org', { organization_id: 'vinfast-org' })
    expect(auth.organizationId).toBe('vinfast-org')
    expect(store.get('selected_organization_id')).toBe('vinfast-org')
  })

  it('does nothing when no org was chosen', async () => {
    post.mockResolvedValue({ data: { data: { user: home } } })
    const auth = useAuthStore()
    await auth.login('a@b.c', 'pw')
    expect(post).toHaveBeenCalledTimes(1)
    expect(auth.organizationId).toBe('home-org')
  })

  it('forgets a choice the server refuses, so requests stop naming that org', async () => {
    store.set('selected_organization_id', 'gone-org')
    post.mockImplementation(async (url: string) => {
      if (url === '/auth/switch-org') throw new Error('403')
      return { data: { data: { user: home } } }
    })
    const auth = useAuthStore()
    await auth.login('a@b.c', 'pw')
    expect(store.has('selected_organization_id')).toBe(false)
    expect(auth.organizationId).toBe('home-org')
  })
})
