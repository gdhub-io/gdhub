import DiscordIcon from '@/assets/images/icons/discord.svg'
import EmailIcon from '@/assets/images/icons/email.svg'
import TelegramIcon from '@/assets/images/icons/telegram.svg'
import BgImage from '@/assets/images/landing/bg-image-for-contacts-section.png'
import { Col, Grid, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import { BiLogoLinkedin, BiLogoYoutube } from 'react-icons/bi'
import styles from './style.module.scss'

const { Title, Paragraph, Text } = Typography

export const LandingContactsSection = () => {
	const screens = Grid.useBreakpoint()

	return (
		<div id="contacts" className={styles.section} style={{ backgroundImage: `url(${BgImage.src})` }}>
			<div className={styles.container}>
				<div className={styles.preTitle}>Contacts</div>
				<Title level={2}>Get in touch</Title>
				<div className={styles.subTitle}>Join us and become a part of new era in the gaming industry!</div>
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
											<Text>Email</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link href="https://t.me/gdhub_io" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<TelegramIcon />
											</div>
											<Text>Telegram</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link href="https://discord.gg/WcUFD3tHqg" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<DiscordIcon />
											</div>
											<Text>Discord</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link href="https://www.youtube.com/@gamedev_hub" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<BiLogoYoutube size={100} style={{ width: 'initial', height: 'initial' }} />
											</div>
											<Text>Youtube</Text>
										</Space>
									</Link>
								</div>
								<div className={styles.contactItem}>
									<Link href="https://www.linkedin.com/company/game-developers-hub" target="_blank">
										<Space direction="vertical" size={32}>
											<div className={styles.contactIcon}>
												<BiLogoLinkedin size={100} style={{ width: 'initial', height: 'initial' }} />
											</div>
											<Text>Linkedin</Text>
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
