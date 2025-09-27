import Star2Icon from '@/assets/images/icons/star-2.svg'
import BgImage from '@/assets/images/landing/gdhub-specialist-image.png'
import { useQuery } from '@tanstack/react-query'
import { useTranslate } from '@tolgee/react'
import { Button, Card, Col, Grid, Row, Space, Typography } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Text } = Typography

export const LandingForSpecialistsSection = () => {
	const screens = Grid.useBreakpoint()
	const { t } = useTranslate()

	const { data: latestProjects } = useQuery({
		queryKey: ['latest-projects'],
		queryFn: () =>
			axios
				.get<
					{ id: string; name: string; slug: string; coverImage: string; genre?: string; platform?: string }[]
				>('/api/projects/latest')
				.then((r) => r.data),
		staleTime: 1000 * 60 * 5,
	})

	const gridColumns = screens.md ? 2 : 1
	const visibleProjects = (latestProjects || []).slice(0, 4)

	return (
		<div>
			<div
				id="for-specialists"
				className={styles.section}
				style={screens.xl ? { backgroundImage: `url(${BgImage.src})` } : undefined}
			>
				<div className={styles.container}>
					<Row gutter={[24, 24]}>
						<Col xs={{ span: 24 }} lg={{ span: 12 }} />
						<Col xs={{ span: 24 }} lg={{ span: 12 }}>
							<div className={styles.preTitle}>{t('landing.specialist.pretitle', 'what are our advantages')}</div>
							<Title level={2}>{t('landing.specialist.title', 'FOR SPECIALISTS')}</Title>

							<div className={styles.content}>
								<Space direction="vertical" size={screens.lg ? 46 : 24}>
									<Space size={screens.lg ? 32 : 16} align="center">
										<div className={styles.star}>
											<Star2Icon />
										</div>
										<Text>
											{t(
												'landing.specialist.text1',
												'Each Specialist in the gaming industry has an opportunity to join one of the indie projects under development in order to gain experience and make new friends.'
											)}
										</Text>
									</Space>
									<Space size={screens.lg ? 32 : 16} align="center">
										<div className={styles.star}>
											<Star2Icon />
										</div>
										<Text>
											{t(
												'landing.specialist.text2',
												'You can become a part of a new video game or share your expertise as a Mentor'
											)}
										</Text>
									</Space>

									{visibleProjects.length > 0 && (
										<div className={styles.latestProjectsList}>
											<Space style={{ marginBottom: 16 }}>
												<Link href="/projects">
													<Button type="text" size="small">
														{t('component.landingForSpecialistsSection.latestProjects', 'Latest projects')}
													</Button>
												</Link>
											</Space>

											<div
												className={styles.projectsGrid}
												style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
											>
												{visibleProjects.map((p, idx) => (
													<Card key={p.id || `${p.slug}-${idx}`} className={styles.projectCard}>
														<div className={styles.projectCardBody}>
															<div className={styles.projectCover}>
																{p.coverImage ? (
																	<Image
																		src={p.coverImage}
																		alt={p.name}
																		width={96}
																		height={64}
																		style={{ objectFit: 'cover', borderRadius: 8 }}
																	/>
																) : (
																	<div className={styles.projectCoverPlaceholder} />
																)}
															</div>
															<div className={styles.projectInfo}>
																<Text className={styles.projectName} ellipsis={{ tooltip: true }}>
																	{p.name}
																</Text>
																<div className={styles.projectMeta}>
																	<Text ellipsis={{ tooltip: true }}>
																		{p.genre || ''}
																		{p.platform ? ` · ${p.platform}` : ''}
																	</Text>
																</div>
															</div>
														</div>
													</Card>
												))}
											</div>
										</div>
									)}

									{screens.md ? null : (
										<div className={styles.sectionImageXS}>
											<Image src={BgImage} alt="" fill style={{ objectFit: 'contain' }} />
										</div>
									)}

									<Link href="/registration?for=specialist">
										<Button className={styles.heroButton} type="primary">
											{t('component.landingForSpecialistsSection.joinTheTeam', 'Join the team')}
										</Button>
									</Link>
								</Space>
							</div>
						</Col>
					</Row>
				</div>
			</div>
			{/* remove standalone mobile image, now rendered above the button inside content */}
		</div>
	)
}
