import heroBgImage from '@/assets/images/landing/gdhub-hero-img.png'
import StarIcon from '@/assets/images/landing/star.svg'
import Icon from '@ant-design/icons'
import { T } from '@tolgee/react'
import { Button, Col, Grid, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'
import { HeroStats } from '../HeroStats'

const { Title, Text } = Typography

export const LandingHeroSection = ({
	stats,
}: {
	stats: { usersCount: number; specialitiesCount: number; projectsCount: number; vacanciesCount: number }
}) => {
	const screens = Grid.useBreakpoint()

	return (
		<div
			className={styles.section}
			style={{
				backgroundImage: screens.lg ? `url(${heroBgImage.src})` : undefined,
			}}
		>
			<div className={styles.container}>
				<Row gutter={[screens.lg ? 64 : 0, 64]}>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<Space size={[64, 64]} direction="vertical" className={styles.heroMain}>
							<div>
								<span>
									<Title>
										<T>Game Developers Hub</T>
									</Title>
								</span>
								<br />
								<span className={styles.subTitle}>
									<T>for everyone who wants to make</T>{' '}
									<span style={{ color: '#F15541' }}>
										<T>video games</T>
									</span>
								</span>
							</div>
							<ul>
								<li>
									<Space>
										<Icon
											component={StarIcon}
											style={{ fontSize: screens.md ? 32 : 19 }}
											onPointerEnterCapture={undefined}
											onPointerLeaveCapture={undefined}
										/>
										<Text>
											<T>
												We help Authors of new video games to assemble a team of game designers, programmers, artists,
												animators, etc.
											</T>
										</Text>
									</Space>
								</li>
								<li>
									<Space>
										<Icon
											component={StarIcon}
											style={{ fontSize: screens.md ? 32 : 19 }}
											onPointerEnterCapture={undefined}
											onPointerLeaveCapture={undefined}
										/>
										<Text>
											<T>
												We help game industry professionals find an interesting role for themselves in new projects.
											</T>
										</Text>
									</Space>
								</li>
							</ul>
							<Link href="/registration">
								<Button className={styles.heroButton} type="primary">
									<T>Get started</T>
								</Button>
							</Link>
						</Space>
					</Col>
					<Col xs={{ span: 24 }} lg={{ span: 12 }} style={{ position: 'relative' }}>
						<HeroStats stats={stats} />
					</Col>
				</Row>
			</div>
		</div>
	)
}
