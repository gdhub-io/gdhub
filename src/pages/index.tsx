import { useEffect, useState } from 'react'
import GdhubLogo from '@assets/images/gdhub-icon.svg'
import { useTelegram } from '@helpers/useTelegram'
import AirtableService from '@services/airtable'
import styles from '@styles/home.module.less'
import { Button, Card, Col, Row, Space, Statistic } from 'antd'
import { NextPage } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FcGoogle } from 'react-icons/fc'
import { authOptions } from './api/auth/[...nextauth]'

const Home: NextPage = ({ usersCount, specialitiesCount, projectsCount, vacanciesCount }: any) => {
	const router = useRouter()
	const [isOpenedInTelegram, telegramUser, telegramApp] = useTelegram()
	const [signInProcessing, setSignInProcessing] = useState(false)

	useEffect(() => {
		if (isOpenedInTelegram) {
			handleSignInTelegram()
		}
	}, [isOpenedInTelegram])

	const handleSignInTelegram = async () => {
		if (!isOpenedInTelegram) return

		try {
			setSignInProcessing(true)
			const res = await signIn('telegram-web-app', { redirect: false }, { username: telegramUser.username })

			if (!res?.ok) {
				if (res?.status == 401) {
					setSignInProcessing(false)
					return
				} else {
					throw new Error(`Error ${res?.status}. ${res?.error}`)
				}
			}

			router.push('/hub')
		} catch (error: any) {
			telegramApp.showAlert(error.message)
			setSignInProcessing(false)
		}
	}

	return (
		<>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				<Space direction="vertical" align="center" size="large">
					<div className="logo">
						<GdhubLogo style={{ width: '32px', height: '32px' }} /> Game Developers Hub
					</div>
					<p>
						Сообщество специалистов игровой индустрии, участники которого объединяются в команды, чтобы разрабатывать
						новые игры.
						<br />
						Хочешь получить новый опыт или разработать свою игру? Присоединяйся!
					</p>
					{isOpenedInTelegram ? (
						<>
							<Link href="https://gdhub.io" target="_blank">
								<Button type="primary" loading={signInProcessing}>
									{signInProcessing ? 'Авторизация...' : 'Перейти в браузер'}
								</Button>
							</Link>
						</>
					) : (
						<Button type="primary" onClick={() => signIn('google', {}, { prompt: 'select_account consent' })}>
							<Space className="login-button">
								<FcGoogle size={16} /> Войти с помощью Google
							</Space>
						</Button>
					)}
				</Space>

				<Row align="middle" gutter={[16, 16]} style={{ padding: '60px 20px' }}>
					<Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
						<Card>
							<Statistic title="Участников сообщества" value={usersCount} style={{ textAlign: 'center' }} />
						</Card>
					</Col>
					<Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
						<Card>
							<Statistic title="Специалистов" value={specialitiesCount} style={{ textAlign: 'center' }} />
						</Card>
					</Col>
					<Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
						<Card>
							<Statistic title="Проектов в работе" value={projectsCount} style={{ textAlign: 'center' }} />
						</Card>
					</Col>
					<Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
						<Card>
							<Statistic title="Вакансий на проектах" value={vacanciesCount} style={{ textAlign: 'center' }} />
						</Card>
					</Col>
				</Row>
			</div>
		</>
	)
}

export async function getServerSideProps(context: any) {
	const session: any = await unstable_getServerSession(context.req, context.res, authOptions)

	if (session?.user?.id) {
		return {
			redirect: {
				destination: '/hub',
				permanent: false,
			},
		}
	}

	const users = await AirtableService('Accounts').select({ fields: [] }).all()
	const specialities = await AirtableService('Specialities').select({ fields: [] }).all()
	const projects = await AirtableService('Project Ideas')
		.select({ fields: [], filterByFormula: `AND(Status = "Approved")` })
		.all()
	const vacancies = await AirtableService('Project Vacancies')
		.select({ fields: [], filterByFormula: `AND(Status = "Opened")` })
		.all()

	return {
		props: {
			usersCount: users.length,
			specialitiesCount: specialities.length,
			projectsCount: projects.length,
			vacanciesCount: vacancies.length,
		},
	}
}

export default Home
