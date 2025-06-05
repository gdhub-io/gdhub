import handler from '../src/pages/api/user/project'
import { createMocks } from 'node-mocks-http'
import { prisma } from '../src/services/prisma'
import { getServerSession } from 'next-auth/next'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/services/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    project: { findUnique: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))

describe('POST /api/user/project', () => {
  beforeEach(() => {
    ;(getServerSession as any).mockResolvedValue({ user: { id: 'user1' } })
  })

  it('creates a new project', async () => {
    ;(prisma.user.findUnique as any).mockResolvedValue({
      id: 'user1',
      specialities: [{ id: 'spec1' }],
      memberInTeams: [],
    })
    ;(prisma.project.findUnique as any).mockResolvedValue(null)
    ;(prisma.project.create as any).mockResolvedValue({
      id: 'p1',
      slug: 'test-project',
      author: { roles: [] },
    })
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'Test Project', agree: true },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(prisma.project.create).toHaveBeenCalled()
  })
})
