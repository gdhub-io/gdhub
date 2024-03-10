import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import dayjs from 'dayjs'
import { GetServerSidePropsContext } from 'next'

const websiteUrl = process.env.NEXT_PUBLIC_APP_URI as string

class SiteMapXML {
	xml: string[] = []

	constructor() {
		this.xml.push(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`)
		this.xml.push(`
			<url>
				<loc>${websiteUrl}</loc>
				<lastmod>${dayjs().format('YYYY-MM-DD')}</lastmod>
				<changefreq>monthly</changefreq>
				<priority>0.8</priority>
			</url>
		`)
		this.xml.push(`</urlset>`)
	}

	add({
		localUrl,
		updatedAt,
		freq = 'monthly',
		priority = 0.8,
	}: {
		localUrl: string
		updatedAt?: string
		freq?: string
		priority?: number
	}) {
		this.xml.splice(
			this.xml.length - 1,
			0,
			`
			<url>
				<loc>${websiteUrl}${localUrl}</loc>
				<lastmod>${updatedAt}</lastmod>
				<changefreq>${freq}</changefreq>
				<priority>${priority}</priority>
			</url>`
		)
	}
}

function SiteMap() {
	// getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
	const projects = await prisma.project.findMany({
		where: {
			status: { in: [ProjectStatus.Approved, ProjectStatus.Done] },
		},
		include: { vacancies: true },
		orderBy: { updatedAt: 'desc' },
	})

	const vacancies = await prisma.teamVacancy.findMany({
		where: {
			status: 'Published',
		},
		orderBy: { updatedAt: 'desc' },
	})

	const sitemap = new SiteMapXML()

	// static pages
	sitemap.add({ localUrl: '/signin', priority: 0.4, updatedAt: dayjs().format('YYYY-MM-DD') })
	sitemap.add({ localUrl: '/registration', priority: 0.4, updatedAt: dayjs().format('YYYY-MM-DD') })
	sitemap.add({ localUrl: '/projects', updatedAt: dayjs(projects[0].updatedAt).format('YYYY-MM-DD') })
	sitemap.add({ localUrl: '/vacancies', updatedAt: dayjs(vacancies[0].updatedAt).format('YYYY-MM-DD') })

	// dynamic pages
	projects.forEach((project) => {
		sitemap.add({
			localUrl: `/project/${project.slug}`,
			updatedAt: dayjs(project.updatedAt).format('YYYY-MM-DD'),
			priority: 0.7,
			freq: 'weekly',
		})
	})

	res.setHeader('Content-Type', 'text/xml')
	res.write(sitemap.xml.join(''))
	res.end()

	return {
		props: {},
	}
}

export default SiteMap
