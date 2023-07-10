import { useEffect, useState } from 'react'
import { Button, Card, Col, Image, Row, Space, Statistic, Typography } from 'antd'
import { NextPage } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import StartProjectImage from '@/assets/images/start-indie-game.jpg'
import TeamProjectImage from '@/assets/images/team-indie-game.jpg'
import { useTelegram } from '@/helpers/useTelegram'
import AirtableService, { getWorkedProjects } from '@/services/airtable'
import styles from '@/styles/home.module.scss'

const { Title, Text, Paragraph } = Typography

declare global {
	interface Window {
		$crisp?: any
	}
}

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
						<Title>Game Developers Hub</Title>
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
						<Link href="/signin">
							<Button type="primary">Вход / Регистрация</Button>
						</Link>
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
						<Card style={{ textAlign: 'center' }}>
							<Statistic title="Проектов в работе" value={projectsCount} style={{ textAlign: 'center' }} />
							<Link href="/projects" title="Проекты">
								<Button size="small" type="text">
									Все проекты
								</Button>
							</Link>
						</Card>
					</Col>
					<Col xs={{ span: 24 }} sm={{ span: 12 }} md={{ span: 6 }}>
						<Card style={{ textAlign: 'center' }}>
							<Statistic title="Вакансий на проектах" value={vacanciesCount} style={{ textAlign: 'center' }} />
							<Link href="/vacancies" title="Вакансии">
								<Button size="small" type="text">
									Все вакансии
								</Button>
							</Link>
						</Card>
					</Col>
				</Row>

				<Row gutter={[24, 24]} style={{ maxWidth: '1024px' }}>
					<Col xs={24} lg={12}>
						<Card
							cover={<Image preview={false} src={StartProjectImage.src} alt="start-project" />}
							actions={[
								<Link key="start-project" href="https://tally.so/r/w8zl5P" target="_blank">
									<Button>Запустить свой проект</Button>
								</Link>,
							]}
						>
							<Card.Meta
								title="Хочешь создать свою игру?"
								description="Каждый автор может выбрать формат работы на нашем сервисе. Проект можно разрабатывать как в формате
								инкубационной программы Gamelab, так и работая самостоятельно в своем темпе."
							/>
						</Card>
					</Col>
					<Col xs={24} lg={12}>
						<Card
							cover={<Image preview={false} src={TeamProjectImage.src} alt="start-project" />}
							actions={[
								<Link key="select-project" href="/projects">
									<Button>Смотреть проекты</Button>
								</Link>,
								<Link key="select-vecencies" href="/vacancies">
									<Button>Смотреть вакансии</Button>
								</Link>,
							]}
						>
							<Card.Meta
								title="Хочешь участвовать в разработке инди-игр?"
								description="Каждый специалист игровой индустрии (программист, художник, аниматор, саунд-дизайнер, smm-специалист и
									многие другие) имеет возможность присоединиться к одному из инди-проектов, находящихся в разработке."
							/>
						</Card>
					</Col>
				</Row>
			</div>
		</>
	)
}

export async function getStaticProps(context: any) {
	// const session: any = await getServerSession(context.req, context.res, authOptions)

	// if (session?.user?.id) {
	// 	return {
	// 		redirect: {
	// 			destination: '/hub',
	// 			permanent: false,
	// 		},
	// 	}
	// }

	const users = await AirtableService('Accounts').select({ fields: [] }).all()
	const specialities = await AirtableService('Specialities').select({ fields: [] }).all()
	const projects = await getWorkedProjects()
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
		revalidate: 60,
	}
}

export default Home
