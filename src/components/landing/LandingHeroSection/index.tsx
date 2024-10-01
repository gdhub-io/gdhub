import heroBgImage from '@/assets/images/landing/gdhub-hero-img.png'
import heroBgImageXS from '@/assets/images/landing/hero-bg-xs.png'
import StarIcon from '@/assets/images/landing/star.svg'
import Icon from '@ant-design/icons'
import { T } from '@tolgee/react'
import { Button, Col, Grid, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'
import { HeroStats } from '../HeroStats'

const { Title, Text, Paragraph } = Typography

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
				backgroundPosition: 'right',
				backgroundOrigin: 'content-box',
				backgroundSize: 'initial',
				backgroundImage: `url(${screens.lg ? heroBgImage.src : heroBgImageXS.src})`,
			}}
		>
			<div className={styles.container}>
				<Row gutter={[screens.xl ? 64 : 0, 64]}>
					<Col xs={{ span: 24 }} xl={{ span: 15 }}>
						<Space size={[64, 64]} direction="vertical" className={styles.heroMain}>
							<div>
								<span>
									<Title>
										<T>Game Developers Hub</T>
									</Title>
								</span>
								<br />
								<span style={{ fontSize: 52 }}>
									<T>for everyone who wants to make</T>
								</span>
								<br />
								<span style={{ fontSize: 52, color: '#F15541' }}>
									<T>video games</T>
								</span>
							</div>
							<ul>
								<li>
									<Space>
										<Icon component={StarIcon} rev="item" style={{ fontSize: screens.md ? 32 : 19 }} />
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
										<Icon component={StarIcon} rev="span" style={{ fontSize: screens.md ? 32 : 19 }} />
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
					<Col xs={{ span: 24 }} xl={{ span: 9 }} style={{ position: 'relative' }}>
						<HeroStats stats={stats} />
					</Col>
				</Row>
			</div>
		</div>
	)
}
