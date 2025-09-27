import { useState } from 'react'
import DevlogPosts from '@/components/DevlogPosts'
import ProjectVacancies from '@/components/ProjectVacancies'
import TeamMembers from '@/components/TeamMembers'
import { PublicLayout } from '@/layouts/PublicLayout'
import { NextPageWithLayout } from '@/pages/_app'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { TbBrandTelegram } from '@react-icons/all-files/tb/TbBrandTelegram'
import { useTranslate } from '@tolgee/react'
import { Button, Col, Descriptions, Grid, Row, Space, Typography } from 'antd'
import { GetServerSidePropsContext } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { NextSeoProps } from 'next-seo'
import ReactMarkdown from 'react-markdown'
import YouTube from 'react-youtube'
import rehypeRaw from 'rehype-raw'
import { Options } from 'youtube-player/dist/types'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

type ProjectPageParams = {
	project: prismaClient.Project & {
		author: prismaClient.User & { profile: { tgNickname: prismaClient.Profile['tgNickname'] } }
		workflow: prismaClient.ProjectWorkflow & { currentStep: prismaClient.ProjectWorkflowStep }
	}
	seo?: { title: string; description?: string; image?: string }
}

const ProjectPage: NextPageWithLayout<ProjectPageParams> = ({ project, seo }) => {
	const { t } = useTranslate()
	const { data: session } = useSession()
	const screens = Grid.useBreakpoint()
	const [showPitchVideo, setShowPitchVideo] = useState(false)

	const seoParams: NextSeoProps = {
		title: seo?.title,
		description: seo?.description,
		openGraph: {
			description: seo?.description as string,
			images: seo?.image ? [{ url: seo.image as string, alt: project?.name + ' cover image' }] : undefined,
		},
	}

	const handleCoverClick = () => setShowPitchVideo(true)

	if (!project) return null

	const generalData = (
		<div className={styles.projectMeta}>
			<Descriptions size="small" layout={screens.md ? 'horizontal' : 'vertical'} column={1}>
				<Descriptions.Item label={t('page.project.genre', 'Genre')}>{project.genre}</Descriptions.Item>
				<Descriptions.Item label={t('page.project.setting', 'Game Setting')}>{project.setting}</Descriptions.Item>
				<Descriptions.Item label={t('page.project.audition', 'Audition')}>{project.audition}</Descriptions.Item>
				<Descriptions.Item label={t('page.project.platform', 'Platform')}>{project.platform}</Descriptions.Item>
				<Descriptions.Item label={t('page.project.visualStyle', 'Visual Style')}>
					{project.visualStyle}
				</Descriptions.Item>
			</Descriptions>
		</div>
	)

	const pitchVideoOptions: Options = { playerVars: { disablekb: 1, autoplay: showPitchVideo ? 1 : 0 } }

	return (
		<>
			<PublicLayout
				title={project?.name}
				subTitle={t('Author') + ' ' + project.author.name}
				backgroundImage={project.coverImage || undefined}
				seo={seoParams}
			>
				{/* <NextSeo {...seoParams} /> */}

				<div className={styles.container}>
					<Row gutter={[32, 16]}>
						<Col xs={{ span: 24, order: 1 }} md={{ span: 12, order: 0 }} lg={{ span: 16, order: 0 }}>
							<Space direction="vertical" size={64} style={{ width: '100%' }}>
								<div className="project-description">
									<Title level={2}>{t('page.project.aboutGame', 'About Game')}</Title>
									<Paragraph>
										<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{project.description || ''}</ReactMarkdown>
									</Paragraph>
									{!!project.workflow?.currentStep && (
										<Paragraph type="secondary">
											{t('page.project.developmentStage', 'Development stage')}: {project.workflow.currentStep.name}
										</Paragraph>
									)}
								</div>

								{!screens.md && generalData}

								<ProjectVacancies teamId={project.teamId} />

								<DevlogPosts projectId={project.id} />
							</Space>
						</Col>
						<Col xs={{ span: 24, order: 0 }} md={{ span: 12, order: 1 }} lg={{ span: 8, order: 1 }}>
							{!showPitchVideo && (
								<>
									{!!project.coverImage && (
										<div className={styles.cover}>
											{project.videoLink && (
												<div className={styles.coverButtonContainer}>
													<Button onClick={handleCoverClick} type="primary">
														{t('page.project.viewThePresentation', 'View the presentation')}
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
										<TbBrandTelegram size={16} /> {t('page.project.contactTheAuthor', 'Contact the author')}
									</Button>
								</Link>
							) : null}

							<div className="project-team">
								<TeamMembers teamId={project.teamId} />
							</div>
						</Col>
					</Row>
				</div>
			</PublicLayout>
		</>
	)
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
	const { projectSlug }: any = context.params

	const project = await prisma.project.findFirst({
		where: {
			slug: projectSlug,
			// status: { notIn: [prismaClient.ProjectStatus.Approved, prismaClient.ProjectStatus.Done] },
		},
		include: {
			author: { select: { name: true, profile: { select: { tgNickname: true } } } },
			workflow: { select: { currentStep: { select: { name: true } } } },
		},
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
				workflow: project.workflow
					? {
							...project.workflow,
							currentStep: project.workflow.currentStep || null,
						}
					: null,
			},
			seo: {
				title: project.name || null,
				description: project.description?.slice(0, 160) || null,
				image: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?t=${project.name}&st=Author%20${project.author.name}&img=${project.coverImage}`,
			},
		},
	}
}

export default ProjectPage
