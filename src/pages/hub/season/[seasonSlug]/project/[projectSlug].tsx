import { useEffect, useState } from 'react'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import AirtableService from '@services/airtable'
import { NextPageWithLayout } from 'pages/_app'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { Col, Descriptions, Grid, Row } from 'antd'
import { GetServerSidePropsContext } from 'next'
import { unstable_getServerSession } from 'next-auth'
import Head from 'next/head'
import Image from 'next/image'
import styles from './style.module.less'

const SeasonProjectPage: NextPageWithLayout = ({ project }: any) => {
	const [loading, setLoading] = useState(false)
	const screens = Grid.useBreakpoint()

	useEffect(() => {
		//
	}, [])

	const handleLoadIframe = () => setLoading(false)

	const generalData = (
		<div className={styles.projectMeta}>
			<Descriptions size="small" layout={screens.md ? 'horizontal' : 'vertical'} column={1}>
				<Descriptions.Item label="Жанр">{project.Genre}</Descriptions.Item>
				<Descriptions.Item label="Сеттинг">{project.Setting}</Descriptions.Item>
				<Descriptions.Item label="Аудитория">{project.Audition}</Descriptions.Item>
				<Descriptions.Item label="Платформа">{project.Platform}</Descriptions.Item>
			</Descriptions>
			<Descriptions size="small" layout="vertical" column={1}>
				<Descriptions.Item label="Визуальный стиль">{project['Visual Style']}</Descriptions.Item>
			</Descriptions>
		</div>
	)

	return (
		<>
			<Head>
				<title>Проект &quot;{project.Name}&quot;</title>
			</Head>
			<div className={styles.container}>
				<Row>
					<Col xs={{ span: 24, order: 1 }} md={{ span: 12, order: 0 }}>
						<h1>{project.Name}</h1>
						<div className="project-author">
							<span>Автор</span>
							{project['Author Name']}
						</div>
						<div className="project-description">
							<span>Об игре</span>
							{project['Description']}
						</div>
						{!screens.md && generalData}
						<div className="project-vacancies">
							<h2>Вакансии</h2>
						</div>
					</Col>
					<Col xs={{ span: 24, order: 0 }} md={{ span: 11, offset: 1, order: 1 }}>
						<div className={styles.cover}>
							<Image src={project['Cover Image']} alt="cover" fill />
						</div>
						{screens.md && generalData}
					</Col>
				</Row>
			</div>
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
