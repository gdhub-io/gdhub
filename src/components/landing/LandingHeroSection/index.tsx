import heroBgImage from '@/assets/images/landing/gdhub-hero-image.png'
import StarIcon from '@/assets/images/landing/star.svg'
import Icon from '@ant-design/icons'
import { useTolgee } from '@tolgee/react'
import { Button, Col, Grid, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'
import { HeroStats } from '../HeroStats'

const { Title, Text } = Typography

export const LandingHeroSection = ({
	stats,
}: {
	stats: {
		usersCount: number | null
		specialitiesCount: number | null
		projectsCount: number | null
		vacanciesCount: number | null
	}
}) => {
	const screens = Grid.useBreakpoint()
	const { t } = useTolgee()

	const hasEmptyStats =
		!stats ||
		stats?.usersCount === null ||
		stats?.specialitiesCount === null ||
		stats?.projectsCount === null ||
		stats?.vacanciesCount === null

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
							<Title>{t('landing.hero.title', 'Community-driven platform for video game creators')}</Title>

							<ul>
								<li>
									<Space>
										<Icon component={StarIcon} style={{ fontSize: screens.md ? 32 : 19 }} />
										<Text>
											{t(
												'landing.hero.text1',
												'We help Authors of new video games to assemble a team of game designers, programmers, artists, animators, etc.'
											)}
										</Text>
									</Space>
								</li>
								<li>
									<Space>
										<Icon component={StarIcon} style={{ fontSize: screens.md ? 32 : 19 }} />
										<Text>
											{t(
												'landing.hero.text2',
												'We help game industry professionals find an interesting role for themselves in new projects.'
											)}
										</Text>
									</Space>
								</li>
							</ul>
							<Space direction="vertical">
								<Link href="/registration">
									<Button className={styles.heroButton} type="primary">
										{t('landing.hero.getStartedForFree', 'Get started for free')}
									</Button>
								</Link>
								<Text type="secondary">{t('landing.hero.noCreditCardRequired', 'No credit card required')}</Text>
							</Space>
						</Space>
					</Col>
					<Col xs={{ span: 24 }} lg={{ span: 12 }} style={{ position: 'relative' }}>
						{!hasEmptyStats && <HeroStats stats={stats} />}
					</Col>
				</Row>
			</div>
		</div>
	)
}
