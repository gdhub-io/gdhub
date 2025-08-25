import Star2Icon from '@/assets/images/icons/star-2.svg'
import BgImageXS from '@/assets/images/landing/bg-image-for-authors-section-xs.png'
import BgImage from '@/assets/images/landing/bg-image-for-authors-section.png'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Button, Card, Grid, Space, Typography } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import ReactNiceAvatar, { genConfig } from 'react-nice-avatar'
import styles from './style.module.scss'

const { Title, Text } = Typography

export const LandingForAuthorsSection = () => {
	const screens = Grid.useBreakpoint()

	const { data: latestSpecialists } = useQuery(
		['latest-specialists'],
		() =>
			axios
				.get<
					{ id: string; name: string; level: string; specialization: string; direction: { name: string } }[]
				>(' /api/specialists/latest'.replace(' ', ''))
				.then((r) => r.data),
		{ staleTime: 1000 * 60 * 5 }
	)

	const formatLevel = (level?: string) => {
		if (!level) return ''
		const pretty = level.replace(/_/g, ' ').toLowerCase()
		return pretty.charAt(0).toUpperCase() + pretty.slice(1)
	}

	const visibleCount = screens.lg ? 5 : 3
	const gridColumns = screens.lg ? 5 : screens.md ? 3 : 1
	const visibleSpecialists = (latestSpecialists || []).slice(0, visibleCount)

	return (
		<div>
			<div
				id="for-authors"
				className={styles.section}
				style={screens.md ? { backgroundImage: `url(${BgImage.src})` } : undefined}
			>
				<div className={styles.container}>
					<div className={styles.preTitle}>
						<T keyName="landing.author.pretitle">what are our advantages</T>
					</div>
					<Title level={2}>
						<T keyName="landing.author.title">FOR AUTHORS</T>
					</Title>

					<div className={styles.content}>
						<Space direction="vertical" size={screens.lg ? 46 : 32}>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>
									<T keyName="landing.author.text1">
										Our platform is actively used by more than 250 professionals from various fields - game designers,
										programmers, artists, animators, etc.
									</T>
								</Text>
							</Space>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>
									<T keyName="landing.author.text2">Specialists of your team will develop a video game for free</T>
								</Text>
							</Space>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>
									<T keyName="landing.author.text3">
										Each Author can choose the format of work on our portal: as a part of the Gamelab incubation program
										or work independently at his own pace
									</T>
								</Text>
							</Space>
							{visibleSpecialists.length > 0 && (
								<div className={styles.latestSpecialistsList}>
									<Title level={3}>
										<T>Latest specialists from Talent Pool</T>
									</Title>

									<div
										className={styles.specialistsGrid}
										style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
									>
										{visibleSpecialists.map((s, idx) => (
											<Card
												key={(s as any).id || `${s.name}-${s.direction?.name}-${idx}`}
												className={styles.specialistCard}
												hoverable
											>
												<div className={styles.specialistCardBody}>
													<div className={styles.specialistAvatar}>
														<ReactNiceAvatar style={{ width: 48, height: 48 }} {...genConfig(s.name)} />
													</div>
													<div className={styles.specialistInfo}>
														<div className={styles.specialistName}>
															{s.level} {s.name}
														</div>
														<div className={styles.specialistMeta}>{s.specialization}</div>
													</div>
												</div>
											</Card>
										))}
									</div>
								</div>
							)}
							<Link href="/registration?for=author">
								<Button className={styles.heroButton} type="primary">
									<T>Assemble a team</T>
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
