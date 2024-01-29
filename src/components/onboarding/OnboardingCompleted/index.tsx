import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { T } from '@tolgee/react'
import { Typography, Space, Button } from 'antd'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title } = Typography

export const OnboardingCompleted = () => {
	const router = useRouter()

	const handleGoToApp = () => {
		router.push('/hub')
	}

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
						<Button style={{ width: '300px' }} onClick={handleGoToApp}>
							<T>Let&apos;s go</T>
						</Button>
					</Space>
				</div>
			</div>
		</div>
	)
}
