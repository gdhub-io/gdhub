import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { T } from '@tolgee/react'
import { Typography, Space, Button } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title } = Typography

export const OnboardingCompleted = () => {
	return (
		<div
			className={`${styles.container}`}
			style={{ backgroundImage: `url(${RegistrationBgImage.src})`, alignItems: 'center' }}
		>
			<div className="onboarding-box">
				<div className="onboarding-content">
					<Space direction="vertical" size={56}>
						<Title>
							<T>Your profile was successfully completed!</T>
						</Title>
						<Link href="/hub">
							<Button style={{ width: '300px' }}>
								<T>Let&apos;s go</T>
							</Button>
						</Link>
					</Space>
				</div>
			</div>
		</div>
	)
}
