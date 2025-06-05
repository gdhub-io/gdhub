import handler from '../src/pages/api/user/project/vacancy/[[...params]]'
import { createMocks } from 'node-mocks-http'
import { prisma } from '../src/services/prisma'
import { getServerSession } from 'next-auth/next'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/services/prisma', () => ({
  prisma: {
    teamVacancy: { create: vi.fn(), findUnique: vi.fn() },
    teamMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    profile: { update: vi.fn() },
    team: { findUnique: vi.fn() },
    equityAllocation: { upsert: vi.fn() },
  },
}))

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }))

describe('Vacancy API', () => {
  beforeEach(() => {
    ;(getServerSession as any).mockResolvedValue({ user: { id: 'user1' } })
  })

  it('creates a vacancy', async () => {
    ;(prisma.teamVacancy.create as any).mockResolvedValue({ id: 'v1' })
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Dev',
        description: 'desc',
        directionId: 'd1',
        status: 'Published',
        finishedAt: '2024-12-31',
        teamId: 't1',
      },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(prisma.teamVacancy.create).toHaveBeenCalled()
  })

  it('applies to a vacancy', async () => {
    ;(prisma.teamVacancy.findUnique as any) = vi.fn().mockResolvedValue({ teamId: 't1' })
    ;(prisma.teamMember.findFirst as any).mockResolvedValue(null)
    ;(prisma.teamMember.create as any).mockResolvedValue({ id: 'm1', user: { name: 'User' } })
    const { req, res } = createMocks({
      method: 'POST',
      url: '/apply',
      body: {
        specialityId: 's1',
        contactType: ['email'],
        vacancyId: 'v1',
      },
    })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })

  it('lists candidates for a team', async () => {
    ;(prisma.teamMember.findMany as any).mockResolvedValue([
      { id: 'm1', user: { id: 'user2', name: 'User2' }, vacancy: { id: 'v1' }, speciality: null },
    ])
    const listHandler = (await import('../src/pages/api/user/project/candidates')).default
    const { req, res } = createMocks({ method: 'GET', query: { teamId: 't1' } })
    await listHandler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toHaveLength(1)
  })

  it('accepts a candidate', async () => {
    ;(prisma.teamMember.update as any).mockResolvedValue({
      id: 'm1',
      user: { id: 'u2', email: 'u2@example.com' },
      team: { id: 't1', name: 'Team' },
      vacancy: {},
    })
    const { req, res } = createMocks({ method: 'PUT', url: '/candidate/hire', body: { id: 'm1' } })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(prisma.teamMember.update).toHaveBeenCalled()
  })

  it('rejects a candidate', async () => {
    ;(prisma.teamMember.update as any).mockResolvedValue({
      user: { id: 'u2', email: 'u2@example.com' },
      vacancy: { title: 'Dev' },
      team: { name: 'Team' },
    })
    const { req, res } = createMocks({ method: 'PUT', url: '/candidate/reject', body: { id: 'm1' } })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    expect(prisma.teamMember.update).toHaveBeenCalled()
  })
})
