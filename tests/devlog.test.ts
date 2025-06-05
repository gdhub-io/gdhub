import handler from '../src/pages/api/devlog/[projectReportId]'
import { createMocks } from 'node-mocks-http'
import { prisma } from '../src/services/prisma'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/services/prisma', () => ({
  prisma: {
    projectReport: { findUnique: vi.fn() },
  },
}))

describe('GET /api/devlog/[projectReportId]', () => {
  it('returns a devlog post', async () => {
    const mockPost = {
      id: 'post1',
      content: 'content',
      publishedAt: '2024-01-01',
      video: null,
      project: { name: 'Project', slug: 'project', description: 'desc', coverImage: null },
      author: { name: 'Author', image: null },
    }
    ;(prisma.projectReport.findUnique as any).mockResolvedValue(mockPost)
    const { req, res } = createMocks({ method: 'GET', query: { projectReportId: 'post1' } })
    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
    const json = JSON.parse(res._getData())
    expect(json.id).toBe('post1')
  })
})
