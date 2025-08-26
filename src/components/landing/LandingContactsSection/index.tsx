import EmailIcon from '@/assets/images/icons/email.svg'
import TelegramIcon from '@/assets/images/icons/telegram.svg'
import BgImage from '@/assets/images/landing/gdhub-contacts-image.png'
import { BiLogoLinkedin } from '@react-icons/all-files/bi/BiLogoLinkedin'
import { BiLogoYoutube } from '@react-icons/all-files/bi/BiLogoYoutube'
import { T } from '@tolgee/react'
import { Col, Grid, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Paragraph, Text } = Typography

export const LandingContactsSection = () => {
	const screens = Grid.useBreakpoint()

	return (
		<div id="contacts" className={styles.section} style={{ backgroundImage: `url(${BgImage.src})` }}>
			<div className={styles.container}>
				<div className={styles.preTitle}>
					<T>Contacts</T>
				</div>
				<Title level={2}>
					<T>Get in touch</T>
				</Title>
				<div className={styles.subTitle}>
					<T>Join us and become a part of new era in the gaming industry!</T>
				</div>
				<div className={styles.content}>
					<Row align="middle" justify="center">
						<Col>
							<Space style={{ width: '100%', justifyContent: 'center' }} size={screens.lg ? 56 : 24} wrap>
								<div className={styles.contactItem}>
									<Link href="mailto:info@gdhub.io" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<EmailIcon />
											</div>
											<Text>
												<T>Email</T>
											</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link href="https://t.me/gdhub_io" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<TelegramIcon />
											</div>
											<Text>
												<T>Telegram</T>
											</Text>
										</Space>
									</Link>
								</div>
								{/* <div className={styles.contactItem}>
									<Link href="https://discord.gg/WcUFD3tHqg" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<DiscordIcon />
											</div>
											<Text>
												<T>Discord</T>
											</Text>
										</Space>
									</Link>
								</div> */}
								<div className={styles.contactItem}>
									<Link href="https://www.youtube.com/@gamedev_hub" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<BiLogoYoutube size={100} style={{ width: 'initial', height: 'initial' }} />
											</div>
											<Text>
												<T>Youtube</T>
											</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link href="https://www.linkedin.com/company/game-developers-hub" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<BiLogoLinkedin size={100} style={{ width: 'initial', height: 'initial' }} />
											</div>
											<Text>
												<T>Linkedin</T>
											</Text>
										</Space>
									</Link>
								</div>
							</Space>
						</Col>
					</Row>
				</div>
			</div>
		</div>
	)
}
