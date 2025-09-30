import GdhubLogo from '@/assets/images/gdhub-beta-logo.svg'
import { useTranslate } from '@tolgee/react'
import { Anchor, Col, Divider, Row, Space, Typography } from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.scss'

const { Title, Paragraph } = Typography

export const MainFooter = () => {
	const router = useRouter()
	const { t } = useTranslate()

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
							{t(
								'mainFooter.appShortDescription',
								'A community of game industry professionals whose members form teams to develop new games. Do you want to get a new experience or develop your own game? Join now!'
							)}
						</Paragraph>
					</Col>
					<Col xs={{ span: 12 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={6}>
							<Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>
								{t('mainFooter.platform', 'Platform')}
							</Title>
							<Anchor
								items={[
									{ href: '/projects', title: t('mainFooter.gameProjects', 'Game Projects'), key: 'projects' },
									{ href: '/vacancies', title: t('mainFooter.vacancies', 'Vacancies'), key: 'vacancies' },
									{ href: writeInternalLink('#about'), title: t('mainFooter.aboutUs', 'About us'), key: 'about' },
								]}
							/>
						</Space>
					</Col>
					<Col xs={{ span: 12 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={6}>
							<Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>
								{t('mainFooter.forUsers', 'For Users')}
							</Title>
							<Anchor
								items={[
									{
										href: writeInternalLink('#for-authors'),
										title: t('mainFooter.forAuthors', 'For Authors'),
										key: 'for-authors',
									},
									{
										href: writeInternalLink('#for-specialists'),
										title: t('mainFooter.forSpecialists', 'For Specialists'),
										key: 'for-specialists',
									},
								]}
							/>
						</Space>
					</Col>
					<Col xs={{ span: 12 }} sm={{ span: 8 }} lg={{ span: 4 }}>
						<Space direction="vertical" size={6}>
							<Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>
								{t('mainFooter.support', 'Support')}
							</Title>
							<Link href="/cookie-policy">{t('mainFooter.cookiePolicy', 'Cookie Policy')}</Link>
							<Link href="/terms">{t('mainFooter.termsOfUse', 'Terms of use')}</Link>
						</Space>
					</Col>
				</Row>

				<Divider style={{ margin: '16px 0' }} />

				<Paragraph className={styles.copyright}>
					© {new Date().getFullYear()} {t('mainFooter.copyright', 'VšĮ Žaidimų Kūrėjų Hubas. All rights reserved.')}{' '}
					<Link href="/legal-details" style={{ color: '#9f9f9f', fontWeight: 200, fontSize: 13 }}>
						{t('mainFooter.companyDetails', 'Legal details')}
					</Link>
				</Paragraph>
			</div>
		</div>
	)
}
