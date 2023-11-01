import GdhubLogo from '@/assets/images/gdhub-logo.svg'
import { Anchor, Col, Divider, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

export const LandingFooter = () => {
	return (
		<div className={styles.section}>
			<div className={styles.container}>
				<Row gutter={[32, 32]} style={{ marginBottom: 32 }}>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<GdhubLogo style={{ width: '120px', height: '31px' }} />
						<Paragraph style={{ marginTop: 12, maxWidth: 510, fontSize: 14 }}>
							A community of game industry professionals whose members form teams to develop new games. Do you want to
							get a new experience or develop your own game? Join now!
						</Paragraph>
					</Col>
					<Col xs={{ span: 24 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={8}>
							<Title level={5}>Platform</Title>
							<Anchor
								items={[
									{ href: '/projects', title: 'Game Projects', key: 'projects' },
									{ href: '/vacancies', title: 'Vacancies', key: 'vacancies' },
									{ href: '/#about', title: 'About us', key: 'about' },
								]}
							/>
						</Space>
					</Col>
					<Col xs={{ span: 24 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={8}>
							<Title level={5}>For Users</Title>
							<Anchor
								items={[
									{ href: '/#for-authors', title: 'For Authors', key: 'for-authors' },
									{ href: '/#for-specialists', title: 'For Specialists', key: 'for-specialists' },
								]}
							/>
						</Space>
					</Col>
					<Col xs={{ span: 24 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={8}>
							<Title level={5}>Support</Title>
							<Link href="/cookie-policy">Cookie Policy</Link>
							<Link href="/terms">Terms of use</Link>
						</Space>
					</Col>
				</Row>

				<Divider />

				<Paragraph className={styles.copyright}>© 2023 GDHub, All rights reserved.</Paragraph>
			</div>
		</div>
	)
}
