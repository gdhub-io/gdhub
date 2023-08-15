import { useState } from 'react'
import { Button, Col, Descriptions, Grid, Row, Space, Typography } from 'antd'
import { GetStaticPropsContext } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { TbBrandTelegram } from 'react-icons/tb'
import YouTube from 'react-youtube'
import { Options } from 'youtube-player/dist/types'
import styles from './style.module.scss'
import ProjectReports from '@/components/ProjectReports'
import ProjectVacancies from '@/components/ProjectVacancies'
import TeamMembers from '@/components/TeamMembers'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { NextPageWithLayout } from '@/pages/_app'
import AirtableService from '@/services/airtable'

const { Title, Paragraph, Text } = Typography

const SeasonProjectPage: NextPageWithLayout = ({ pageUrl, project }: any) => {
	const router = useRouter()
	const screens = Grid.useBreakpoint()
	const [showPitchVideo, setShowPitchVideo] = useState(false)

	const handleCoverClick = () => setShowPitchVideo(true)

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

	const pitchVideoOptions: Options = { playerVars: { disablekb: 1, autoplay: showPitchVideo ? 1 : 0 } }

	return (
		<>
			<Head>
				<title>{project.Name}</title>
				<meta name="description" content={project.Description}></meta>
				<meta property="og:title" content={project.Name} />
				<meta property="og:description" content={project.Description} />
				<meta property="og:type" content="website" />
				<meta property="og:url" content={router.route} />
				{!!project['Cover Image'] && <meta property="og:image" content={project['Cover Image']} />}
			</Head>
			<div className={styles.container}>
				<Row gutter={[32, 16]}>
					<Col xs={{ span: 24, order: 1 }} md={{ span: 12, order: 0 }} lg={{ span: 16, order: 0 }}>
						<Title>{project.Name}</Title>
						<Space className="project-author" align="center">
							<span>Автор</span>
							<Text>{project['Author Name']}</Text>
						</Space>
						<div className="project-description">
							<Title level={5}>Об игре</Title>
							<Paragraph>{project['Description']}</Paragraph>
						</div>
						{!screens.md && generalData}

						<div className="project-team">
							<TeamMembers project={project} />
						</div>
					</Col>
					<Col xs={{ span: 24, order: 0 }} md={{ span: 12, order: 1 }} lg={{ span: 8, order: 1 }}>
						{!showPitchVideo && (
							<>
								{!!project['Cover Image'] && (
									<div className={styles.cover}>
										{project['Youtube Video ID'] && (
											<div className={styles.coverButtonContainer}>
												<Button onClick={handleCoverClick} type="primary">
													Смотреть презентацию
												</Button>
											</div>
										)}
										<Image src={project['Cover Image']} alt="cover" fill />
									</div>
								)}
							</>
						)}
						{showPitchVideo && project['Youtube Video ID'] && (
							<YouTube
								className={styles.videoCover}
								videoId={project['Youtube Video ID']}
								opts={pitchVideoOptions}
								onEnd={() => setShowPitchVideo(false)}
							/>
						)}
						{screens.md && generalData}
						{project['Author Telegram Nickname'] ? (
							<Link
								href={`https://t.me/${project['Author Telegram Nickname']}`}
								target="_blank"
								style={{ display: 'block', width: 'fit-content' }}
							>
								<Button shape="round" type="dashed" className={styles.writeToAuthorButton}>
									<TbBrandTelegram size={16} /> Написать автору
								</Button>
							</Link>
						) : null}
					</Col>
				</Row>

				<div className="project-vacancies">
					<ProjectVacancies project={project} />
				</div>

				<div className="project-reports">
					<ProjectReports project={project} />
				</div>
			</div>
		</>
	)
}

export async function getStaticPaths() {
	const projectsSlugs = await AirtableService('Project Ideas')
		.select({
			fields: ['Slug'],
			filterByFormula: `OR(Status = "Approved", Status = "Done")`,
		})
		.all()

	const paths = projectsSlugs.map((post) => ({
		params: { projectSlug: post.get('Slug') },
	}))

	return { paths, fallback: 'blocking' }
}

export const getStaticProps = async (context: GetStaticPropsContext) => {
	const { projectSlug }: any = context.params

	const [project] = await AirtableService('Project Ideas')
		.select({
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
			project: { ...project.fields, id: project.id },
		},
		revalidate: 60,
	}
}

SeasonProjectPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default SeasonProjectPage
