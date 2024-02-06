import RegistrationBgImage from '@/assets/images/registration-bg.jpg'
import { T } from '@tolgee/react'
import { Space, Button, Typography, Grid } from 'antd'
import styles from './style.module.scss'

const { Paragraph, Title } = Typography

export const OnboardingWelcome = ({ onNext }: { onNext: () => void }) => {
	const screens = Grid.useBreakpoint()

	return (
		<div
			className={`${styles.container} bright-container`}
			style={{ backgroundImage: screens.lg ? `url(${RegistrationBgImage.src})` : undefined }}
		>
			<div className="onboarding-box">
				<div className="onboarding-content">
					<Space direction="vertical" size={56}>
						<Title>
							<T>Добро пожаловать в сообщество Game Developers Hub!</T>
						</Title>
						<Paragraph>
							<T>
								Мы рады, что вы с нами! Еще немного и вы сможете использовать все доступные на сегодня возможности
								нашего портала. Для того, чтобы он был вам полезен, вам необходимо рассказать немного о себе и своих
								интересах.
							</T>
						</Paragraph>

						<Button style={{ width: '300px' }} onClick={() => onNext()}>
							<T>Заполнить профиль</T>
						</Button>
					</Space>
				</div>
			</div>
		</div>
	)
}
