import heroBgImageXS from '@/assets/images/landing/hero-bg-xs.png'
import heroBgImage from '@/assets/images/landing/hero-bg.png'
import StarIcon from '@/assets/images/landing/star.svg'
import Icon from '@ant-design/icons'
import { Button, Col, Grid, Row, Space, Typography, theme } from 'antd'
import styles from './style.module.scss'
import { HeroStats } from '../HeroStats'

const { Title, Text, Paragraph } = Typography

export const LandingHeroSection = ({
	stats,
}: {
	stats: { usersCount: number; specialitiesCount: number; projectsCount: number; vacanciesCount: number }
}) => {
	const screens = Grid.useBreakpoint()
	const { token } = theme.useToken()

	return (
		<div
			className={styles.section}
			style={{ backgroundImage: `url(${screens.lg ? heroBgImage.src : heroBgImageXS.src})` }}
		>
			<div className={styles.container}>
				<Row gutter={[screens.xs ? 0 : 64, 64]}>
					<Col xs={{ span: 24 }} xl={{ span: 15 }}>
						<Space size={[64, 64]} direction="vertical" className={styles.heroMain}>
							<Title>
								Game Developers Hub for everyone who wants to make{' '}
								<span style={{ color: token.colorPrimary }}>video games</span>
							</Title>
							<ul>
								<li>
									<Space>
										<Icon component={StarIcon} rev="item" style={{ fontSize: screens.md ? 32 : 19 }} />
										<Text>
											We help Authors of new video games to assemble a team of game designers, programmers, artists,
											animators, etc.
										</Text>
									</Space>
								</li>
								<li>
									<Space>
										<Icon component={StarIcon} rev="span" style={{ fontSize: screens.md ? 32 : 19 }} />
										<Text>
											We help game industry professionals find an interesting role for themselves in new projects.
										</Text>
									</Space>
								</li>
							</ul>
							<Button className={styles.heroButton} type="primary">
								Get started
							</Button>
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
