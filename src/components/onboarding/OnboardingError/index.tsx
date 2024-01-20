import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { T } from '@tolgee/react'
import { Space, Button, Typography } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const { Paragraph, Title } = Typography

export const OnboardingError = ({ error }: { error: string }) => {
	return (
		<div
			className={`${styles.container}`}
			style={{ backgroundImage: `url(${RegistrationBgImage.src})`, alignItems: 'center' }}
		>
			<div className={styles.completedBox}>
				<div className="completed-content" style={{ textAlign: 'center' }}>
					<Space direction="vertical" size={56}>
						<Title>
							<T>Error!</T>
						</Title>
						<Paragraph>
							<T>{error}</T>
						</Paragraph>
						<Link href="/registration">
							<Button style={{ width: '300px' }}>
								<T>Go to registration</T>
							</Button>
						</Link>
					</Space>
				</div>
			</div>
		</div>
	)
}
