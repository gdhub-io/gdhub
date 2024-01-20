import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { T } from '@tolgee/react'
import { Typography, Space, Button } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const { Paragraph, Title } = Typography

export const OnboardingCompleted = () => {
	return (
		<div
			className={`${styles.container}`}
			style={{ backgroundImage: `url(${RegistrationBgImage.src})`, alignItems: 'center' }}
		>
			<div className={styles.completedBox}>
				<div className="completed-content" style={{ textAlign: 'center' }}>
					<Space direction="vertical" size={56}>
						<Title>
							<T>Registration completed successfully!</T>
						</Title>
						<Paragraph>
							<T>Welcome to the community where games are made.</T>
						</Paragraph>
						<Link href="/hub">
							<Button style={{ width: '300px' }}>
								<T>Go to GDHub</T>
							</Button>
						</Link>
					</Space>
				</div>
			</div>
		</div>
	)
}
