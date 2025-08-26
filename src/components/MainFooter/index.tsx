import GdhubLogo from '@/assets/images/gdhub-beta-logo.svg'
import { T } from '@tolgee/react'
import { Anchor, Col, Divider, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

export const MainFooter = () => {
	const router = useRouter()

	const writeInternalLink = (internalLink: string) => {
		return router.pathname == '/' ? internalLink : `/${internalLink}`
	}

	return (
		<div className={styles.section}>
			<div className={styles.container}>
				<Row
					gutter={[
						{ xs: 12, sm: 24, lg: 32 },
						{ xs: 8, sm: 12, lg: 16 },
					]}
					style={{ marginBottom: 12 }}
				>
					<Col xs={{ span: 24 }} lg={{ span: 12 }}>
						<GdhubLogo style={{ width: 'auto', height: '31px' }} />
						<Paragraph style={{ marginTop: 12, maxWidth: 510 }}>
							<T keyName="app-short-description">
								A community of game industry professionals whose members form teams to develop new games. Do you want to
								get a new experience or develop your own game? Join now!
							</T>
						</Paragraph>
					</Col>
					<Col xs={{ span: 12 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={6}>
							<Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>
								<T>Platform</T>
							</Title>
							<Anchor
								items={[
									{ href: '/projects', title: <T>Game Projects</T>, key: 'projects' },
									{ href: '/vacancies', title: <T>Vacancies</T>, key: 'vacancies' },
									{ href: writeInternalLink('#about'), title: <T>About us</T>, key: 'about' },
								]}
							/>
						</Space>
					</Col>
					<Col xs={{ span: 12 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={6}>
							<Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>
								<T>For Users</T>
							</Title>
							<Anchor
								items={[
									{ href: writeInternalLink('#for-authors'), title: <T>For Authors</T>, key: 'for-authors' },
									{
										href: writeInternalLink('#for-specialists'),
										title: <T>For Specialists</T>,
										key: 'for-specialists',
									},
								]}
							/>
						</Space>
					</Col>
					<Col xs={{ span: 12 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={6}>
							<Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>
								<T>Support</T>
							</Title>
							<Link href="/cookie-policy">
								<T>Cookie Policy</T>
							</Link>
							<Link href="/terms">
								<T>Terms of use</T>
							</Link>
						</Space>
					</Col>
				</Row>

				<Divider style={{ margin: '16px 0' }} />

				<Paragraph className={styles.copyright}>
					© 2023-2024 <T keyName="copyright">GDHub, All rights reserved.</T>
				</Paragraph>
			</div>
		</div>
	)
}
