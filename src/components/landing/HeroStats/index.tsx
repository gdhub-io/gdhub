import heroStatsImage1 from '@/assets/images/landing/hero-stats-member-1.png'
import heroStatsImage2 from '@/assets/images/landing/hero-stats-member-2.png'
import heroStatsImage3 from '@/assets/images/landing/hero-stats-member-3.png'
import heroStatsImage4 from '@/assets/images/landing/hero-stats-member-4.png'
import heroStatsImage5 from '@/assets/images/landing/hero-stats-member-5.png'
import { T } from '@tolgee/react'
import { Avatar, Divider, Grid, Space, Typography } from 'antd'
import styles from './style.module.scss'

const { Text } = Typography

export const HeroStats = ({
	stats,
}: {
	stats: { usersCount: number; specialitiesCount: number; projectsCount: number; vacanciesCount: number }
}) => {
	const screen = Grid.useBreakpoint()

	return (
		<div className={styles.container}>
			<Space direction="vertical" className={styles.component}>
				<Space style={{ width: '100%' }} size="large" className={styles.members}>
					<Space direction="vertical" align="center">
						<Text strong>{stats?.usersCount}+</Text>
						<Text>
							<T>community members</T>
						</Text>
					</Space>

					<Avatar.Group size={screen.md ? 72 : 56}>
						<Avatar src={heroStatsImage1.src} />
						<Avatar src={heroStatsImage2.src} />
						<Avatar src={heroStatsImage3.src} />
						<Avatar src={heroStatsImage4.src} />
						<Avatar src={heroStatsImage5.src} />
					</Avatar.Group>
				</Space>
				<Divider style={{ margin: '24px 0' }} className="divider" />
				<Space className={styles.stats}>
					<Space direction="vertical" align="center">
						<Text strong>{stats?.specialitiesCount}+</Text>
						<Text>
							<T>qualified specialists</T>
						</Text>
					</Space>
					<Divider type="vertical" style={{ height: 52, margin: '0 16px' }} />
					<Space direction="vertical" align="center">
						<Text strong>{stats?.projectsCount}</Text>
						<Text>
							<T>current projects</T>
						</Text>
					</Space>
					<Divider type="vertical" style={{ height: 52, margin: '0 16px' }} />
					<Space direction="vertical" align="center">
						<Text strong>{stats?.vacanciesCount}+</Text>
						<Text>
							<T>actual vacancies</T>
						</Text>
					</Space>
				</Space>
			</Space>
		</div>
	)
}
