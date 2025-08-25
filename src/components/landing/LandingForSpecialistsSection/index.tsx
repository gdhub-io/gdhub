import Star2Icon from '@/assets/images/icons/star-2.svg'
import BgImageXS from '@/assets/images/landing/bg-image-for-specialists-section-xs.png'
import BgImage from '@/assets/images/landing/bg-image-for-specialists-section.png'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Button, Card, Grid, Space, Typography } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Text } = Typography

export const LandingForSpecialistsSection = () => {
	const screens = Grid.useBreakpoint()

	const { data: latestProjects } = useQuery(
		['latest-projects'],
		() =>
			axios
				.get<
					{ id: string; name: string; slug: string; coverImage: string; genre?: string; platform?: string }[]
				>('/api/projects/latest')
				.then((r) => r.data),
		{ staleTime: 1000 * 60 * 5 }
	)

	const gridColumns = screens.lg ? 5 : screens.md ? 3 : 1
	const visibleProjects = (latestProjects || []).slice(0, screens.lg ? 5 : 3)

	return (
		<div>
			<div
				id="for-specialists"
				className={styles.section}
				style={screens.md ? { backgroundImage: `url(${BgImage.src})` } : undefined}
			>
				<div className={styles.container}>
					<div className={styles.preTitle}>
						<T keyName="landing.specialist.pretitle">what are our advantages</T>
					</div>
					<Title level={2}>
						<T keyName="landing.specialist.title">FOR SPECIALISTS</T>
					</Title>

					<div className={styles.content}>
						<Space direction="vertical" size={screens.lg ? 46 : 32}>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>
									<T keyName="landing.specialist.text1">
										Each Specialist in the gaming industry has an opportunity to join one of the indie projects under
										development in order to gain experience and make new friends.
									</T>
								</Text>
							</Space>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>
									<T keyName="landing.specialist.text2">
										You can become a part of a new video game or share your expertise as a Mentor
									</T>
								</Text>
							</Space>

							{visibleProjects.length > 0 && (
								<div className={styles.latestProjectsList}>
									<Title level={3}>
										<T>Latest projects</T>
									</Title>

									<div
										className={styles.projectsGrid}
										style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
									>
										{visibleProjects.map((p, idx) => (
											<Card key={p.id || `${p.slug}-${idx}`} className={styles.projectCard} hoverable>
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
														<div className={styles.projectName}>{p.name}</div>
														<div className={styles.projectMeta}>
															{p.genre || ''}
															{p.platform ? ` · ${p.platform}` : ''}
														</div>
													</div>
												</div>
											</Card>
										))}
									</div>
								</div>
							)}

							<Link href="/registration?for=specialist">
								<Button className={styles.heroButton} type="primary">
									<T>Join the team</T>
								</Button>
							</Link>
						</Space>
					</div>
				</div>
			</div>
			{screens.md ? null : (
				<div className={styles.sectionImageXS}>
					<Image src={BgImageXS} alt="" fill />
				</div>
			)}
		</div>
	)
}
