import { useEffect } from 'react'
import DividerIcon from '@assets/images/icons/divider.svg'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { stagesConfig } from 'config/stages'
import { NextPageWithLayout } from 'pages/_app'
import { Button, Card, Collapse, Space, Spin } from 'antd'
import { DateTime } from 'luxon'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import styles from './style.module.less'

const fetcher = (url: string) => fetch(url, { method: 'post' }).then((res) => res.json())

const HubPage: NextPageWithLayout = () => {
	const router = useRouter()
	const { data: session }: any = useSession()
	const { data, error } = useSWR('/api/seasons', fetcher)

	useEffect(() => console.log(router), [])

	const hasRole = (roleName: string) => {
		if (!session?.user) {
			return false
		}

		const role = session.user.roles.find((role: string) => role === roleName.toLowerCase())

		return role ? true : false
	}

	const isPassiveSeason = (season: any) => {
		return ['Planning', 'Done'].includes(season.Stage)
	}

	const isActiveSeason = (season: any) => {
		return !isPassiveSeason(season)
	}

	return (
		<>
			<Head>
				<title>Game Developers Hub</title>
			</Head>
			<div className={styles.container}>
				{!hasRole('member') && (
					<Space direction="vertical">
						<p>
							Для того, чтобы стать участников Хаба, необходимо заполнить данные о себе, указать ваши специальности,
							предпочтения в играх, а также указать время, которое вы готовы использовать на участие в проектах. Для
							этого перейдите в ваш Профиль и укажите требуемые данные.
						</p>
						<Link href="/profile">
							<Button>Мой профиль</Button>
						</Link>
					</Space>
				)}

				{hasRole('member') && (
					<Spin spinning={!data}>
						<div className="seasons-container">
							{data?.seasons.map((season: any, idx: number) => (
								<Card
									className={`season-container ${isPassiveSeason(season) ? 'not-active' : ''}`}
									key={`gamelab-season-${idx}`}
									title={
										<Space align="center">
											<div className="title">{season.Name}</div>
											{isPassiveSeason(season) && (
												<>
													<DividerIcon className="divider" />
													<span>{stagesConfig[season.Stage]?.title}</span>
												</>
											)}
										</Space>
									}
								>
									{isActiveSeason(season) && (
										<Collapse defaultActiveKey={[season.Stage]} onChange={() => {}} bordered={false}>
											{season['Season Stages']
												.filter((s: any) => ['Planning', 'Done'].includes(s.Name) === false)
												.map((stage: any) => (
													<Collapse.Panel
														header={
															<Space align="center">
																<strong>{stagesConfig[stage.Name]?.title}</strong>
																{stage.Status === 'Active' && !!stage['Started At'] && (
																	<>
																		<DividerIcon className="divider" />
																		<span>
																			{DateTime.fromISO(stage['Started At']).toFormat('dd LLL', {
																				locale: router.locale,
																			}) +
																				' - ' +
																				DateTime.fromISO(stage['Finished At']).toFormat('dd LLL yyyy', {
																					locale: router.locale,
																				})}
																		</span>
																	</>
																)}
															</Space>
														}
														key={stage.Name}
														collapsible={stage.Status === 'Active' ? 'header' : 'disabled'}
													>
														{stagesConfig[stage.Name]?.description}
														{stagesConfig[stage.Name]?.materials}
														{stagesConfig[stage.Name]?.actions}
													</Collapse.Panel>
												))}
										</Collapse>
									)}
								</Card>
							))}
						</div>
					</Spin>
				)}
			</div>
		</>
	)
}

HubPage.getLayout = (page) => <ProtectedLayout>{page}</ProtectedLayout>

export default HubPage
