import { useEffect, useRef, useState } from 'react'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import AirtableService from '@/services/airtable'
import { UserRole } from '@prisma/client'
import { Spin } from 'antd'
import { GetServerSidePropsContext } from 'next'
import Head from 'next/head'
import { getServerSession } from 'next-auth'

const SeasonProjectIdeasPage: NextPageWithLayout = ({ season }: any) => {
	const ref = useRef<any>()
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (ref.current) {
			ref.current.src = `${season['Ideas Embed Link']}?backgroundColor=cyan&viewControls=on&layout=card`
		}
		ref.current?.addEventListener('load', handleLoadIframe)

		return () => {
			ref.current?.removeEventListener('load', handleLoadIframe)
		}
	}, [])

	const handleLoadIframe = () => setLoading(false)

	return (
		<>
			<Head>
				<title>Список идей проектов для {season.Name}</title>
			</Head>
			<h1>Список идей проектов для {season.Name}</h1>
			<div>
				<Spin spinning={loading}>
					<iframe
						ref={ref}
						className="airtable-embed"
						frameBorder="0"
						width="100%"
						height="533"
						style={{ background: 'transparent', border: '1px solid #ccc' }}
					></iframe>
				</Spin>
			</div>
		</>
	)
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const { seasonSlug }: any = context.params
	const session: any = await getServerSession(context.req, context.res, authOptions)

	if (session && !hasRole(UserRole.Mentor, session)) {
		return {
			notFound: true,
		}
	}

	const [season] = await AirtableService('Seasons')
		.select({
			fields: ['Name', 'Ideas Embed Link', 'Status'],
			maxRecords: 1,
			filterByFormula: `Slug = "${seasonSlug}"`,
		})
		.all()

	if (!season) {
		return {
			notFound: true,
		}
	}

	return {
		props: {
			season: season.fields,
		},
	}
}

SeasonProjectIdeasPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonProjectIdeasPage
