import { useEffect } from 'react'
import ProjectVacancies from '@components/ProjectVacancies'
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

const SeasonProjectPage: NextPageWithLayout = ({ pageUrl, project }: any) => {
	const screens = Grid.useBreakpoint()

	useEffect(() => {
		//
	}, [])

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
				<title>{project.Name}</title>
				<meta name="description" content={project.Description}></meta>
				<meta property="og:title" content={project.Name} />
				<meta property="og:type" content="website" />
				<meta property="og:url" content={pageUrl} />
				{!!project['Cover Image'] && <meta property="og:image" content={project['Cover Image']} />}
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
					</Col>
					<Col xs={{ span: 24, order: 0 }} md={{ span: 11, offset: 1, order: 1 }}>
						{!!project['Cover Image'] && (
							<div className={styles.cover}>
								<Image src={project['Cover Image']} alt="cover" fill />
							</div>
						)}
						{screens.md && generalData}
					</Col>
				</Row>

				<div className="project-vacancies">
					<ProjectVacancies project={project} />
				</div>
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
			filterByFormula: `OR(Slug = "${projectSlug}", RECORD_ID() = "${projectSlug}")`,
		})
		.all()

	if (!project) {
		return {
			notFound: true,
		}
	}

	return {
		props: {
			pageUrl: process.env.NEXT_PUBLIC_APP_URI + context.resolvedUrl,
			project: { ...project.fields, id: project.id },
		},
	}
}

SeasonProjectPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonProjectPage
