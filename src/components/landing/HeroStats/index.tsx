import heroStatsImage1 from '@/assets/images/landing/hero-stats-member-1.png'
import heroStatsImage2 from '@/assets/images/landing/hero-stats-member-2.png'
import heroStatsImage3 from '@/assets/images/landing/hero-stats-member-3.png'
import heroStatsImage4 from '@/assets/images/landing/hero-stats-member-4.png'
import heroStatsImage5 from '@/assets/images/landing/hero-stats-member-5.png'
import { Avatar, Divider, Space, Typography } from 'antd'
import styles from './style.module.scss'

const { Text } = Typography

export const HeroStats = () => {
	return (
		<div className={styles.container}>
			<Space direction="vertical" align="center" className={styles.component}>
				<Space style={{ width: '100%' }} size="large" className={styles.members}>
					<Space direction="vertical" align="center">
						<Text strong style={{ fontSize: 24 }}>
							500+
						</Text>
						<Text>community members</Text>
					</Space>

					<Avatar.Group size={72}>
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
						<Text strong>250+</Text>
						<Text>qualified specialists</Text>
					</Space>
					<Divider type="vertical" style={{ height: 52, margin: '0 16px' }} />
					<Space direction="vertical" align="center">
						<Text strong>8+</Text>
						<Text>current projects</Text>
					</Space>
					<Divider type="vertical" style={{ height: 52, margin: '0 16px' }} />
					<Space direction="vertical" align="center">
						<Text strong>10+</Text>
						<Text>actual vacancies</Text>
					</Space>
				</Space>
			</Space>
		</div>
	)
}
