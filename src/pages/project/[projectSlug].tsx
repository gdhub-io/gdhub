import { useState } from 'react'
import ProjectReports from '@/components/ProjectReports'
import ProjectVacancies from '@/components/ProjectVacancies'
import TeamMembers from '@/components/TeamMembers'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import { Profile, Project, ProjectStatus, User } from '@prisma/client'
import { T, useTolgee } from '@tolgee/react'
import { Button, Col, Descriptions, Grid, Row, Typography } from 'antd'
import { GetServerSidePropsContext } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { TbBrandTelegram } from 'react-icons/tb'
import ReactMarkdown from 'react-markdown'
import YouTube from 'react-youtube'
import rehypeRaw from 'rehype-raw'
import { Options } from 'youtube-player/dist/types'
import styles from './style.module.scss'

const { Title, Paragraph, Text } = Typography

type ProjectPageParams = {
	project: Project & { author: User & { profile: { tgNickname: Profile['tgNickname'] } } }
}

const ProjectPage: NextPageWithLayout<ProjectPageParams> = ({ project }) => {
	const router = useRouter()
	const { t } = useTolgee()
	const { data: session } = useSession()
	const screens = Grid.useBreakpoint()
	const [showPitchVideo, setShowPitchVideo] = useState(false)

	const handleCoverClick = () => setShowPitchVideo(true)

	if (!project) return null

	const generalData = (
		<div className={styles.projectMeta}>
			<Descriptions size="small" layout={screens.md ? 'horizontal' : 'vertical'} column={1}>
				<Descriptions.Item label={<T>Genre</T>}>{project.genre}</Descriptions.Item>
				<Descriptions.Item label={<T>Game Setting</T>}>{project.setting}</Descriptions.Item>
				<Descriptions.Item label={<T>Audition</T>}>{project.audition}</Descriptions.Item>
				<Descriptions.Item label={<T>Platform</T>}>{project.platform}</Descriptions.Item>
			</Descriptions>
			<Descriptions size="small" layout="vertical" column={1}>
				<Descriptions.Item label={<T>Visual Style</T>}>{project.visualStyle}</Descriptions.Item>
			</Descriptions>
		</div>
	)

	const pitchVideoOptions: Options = { playerVars: { disablekb: 1, autoplay: showPitchVideo ? 1 : 0 } }

	return (
		<PublicLayout
			title={project.name}
			subTitle={t('Author') + ' ' + project.author.name}
			backgroundImage={project.coverImage || undefined}
			seo={{
				description: project.description as string,
				openGraph: {
					description: project.description as string,
					images: project.coverImage ? [{ url: project.coverImage as string }] : undefined,
				},
			}}
		>
			<div className={styles.container}>
				<Row gutter={[32, 16]}>
					<Col xs={{ span: 24, order: 1 }} md={{ span: 12, order: 0 }} lg={{ span: 16, order: 0 }}>
						<div className="project-description">
							<Title level={2}>
								<T>About Game</T>
							</Title>
							<Paragraph>
								<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{project.description || ''}</ReactMarkdown>
							</Paragraph>
						</div>
						{!screens.md && generalData}

						<div className="project-team">
							<TeamMembers teamId={project.teamId} />
						</div>
					</Col>
					<Col xs={{ span: 24, order: 0 }} md={{ span: 12, order: 1 }} lg={{ span: 8, order: 1 }}>
						{!showPitchVideo && (
							<>
								{!!project.coverImage && (
									<div className={styles.cover}>
										{project.videoLink && (
											<div className={styles.coverButtonContainer}>
												<Button onClick={handleCoverClick} type="primary">
													<T>View the presentation</T>
												</Button>
											</div>
										)}
										<Image src={project.coverImage} alt="cover" fill />
									</div>
								)}
							</>
						)}
						{showPitchVideo && project.videoLink && (
							<YouTube
								className={styles.videoCover}
								videoId={project.videoLink}
								opts={pitchVideoOptions}
								onEnd={() => setShowPitchVideo(false)}
							/>
						)}
						{screens.md && generalData}
						{session && project.author.profile.tgNickname ? (
							<Link
								href={`https://t.me/${project.author.profile.tgNickname}`}
								target="_blank"
								style={{ display: 'block', width: 'fit-content' }}
							>
								<Button shape="round" type="dashed" className={styles.writeToAuthorButton}>
									<TbBrandTelegram size={16} /> <T>Contact the author</T>
								</Button>
							</Link>
						) : null}
					</Col>
				</Row>

				<div className="project-vacancies">
					<ProjectVacancies teamId={project.teamId} />
				</div>

				<div className="project-reports">
					<ProjectReports projectId={project.id} projectStartedAt={project.createdAt} />
				</div>
			</div>
		</PublicLayout>
	)
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const { projectSlug }: any = context.params

	const project = await prisma.project.findFirst({
		where: { slug: projectSlug, status: { in: [ProjectStatus.Approved, ProjectStatus.Done] } },
		include: { author: { select: { name: true, profile: { select: { tgNickname: true } } } } },
	})

	if (!project) {
		return {
			notFound: true,
		}
	}

	return {
		props: {
			project: {
				...project,
				createdAt: project.createdAt.toISOString(),
				updatedAt: project.updatedAt.toISOString(),
				startedAt: project.startedAt?.toISOString(),
				finishedAt: project.finishedAt ? project.finishedAt.toISOString() : null,
			},
		},
	}
}

export default ProjectPage
