import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import AirtableService from '@services/airtable'
import { NextPageWithLayout } from 'pages/_app'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { GetServerSidePropsContext } from 'next'
import { unstable_getServerSession } from 'next-auth'
import Head from 'next/head'
import Image from 'next/image'
import styles from './style.module.less'
import { Col, Row } from 'antd'

const SeasonProjectPage: NextPageWithLayout = ({ project }: any) => {
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		//
	}, [])

	const handleLoadIframe = () => setLoading(false)

	return (
		<>
			<Head>
				<title>Проект &quot;{project.Name}&quot;</title>
			</Head>
			<Row>
				<Col>
					<h1>{project.Name}</h1>
					<div>
						<span>Автор</span>
						{project['Author Name']}
					</div>
				</Col>
				<Col style={{ width: '100%' }}>
					<div className={styles.cover}>
						<Image src={project['Cover Image']} alt="cover" fill />
					</div>
				</Col>
			</Row>
		</>
	)
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const { projectSlug }: any = context.params
	const session: any = await unstable_getServerSession(context.req, context.res, authOptions)

	if (session && !session.user.hasRole('member')) {
		return {
			notFound: true,
		}
	}

	const [project] = await AirtableService('Project Ideas')
		.select({
			// fields: ['Name', 'Ideas Embed Link', 'Status'],
			maxRecords: 1,
			filterByFormula: `Slug = "${projectSlug}"`,
		})
		.all()

	if (!project) {
		return {
			notFound: true,
		}
	}

	return {
		props: {
			project: project.fields,
		},
	}
}

SeasonProjectPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonProjectPage
