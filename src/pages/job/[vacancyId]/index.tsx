/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react'
import SpecialitySelectModal from '@/components/modals/SpecialitySelectModal'
import { PublicLayout } from '@/layouts/PublicLayout'
import { ArrowLeftOutlined } from '@ant-design/icons'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useMutation } from '@tanstack/react-query'
import { T, useTranslate } from '@tolgee/react'
import { Button, Card, Flex, Space, Spin, Alert, Row, Col, Typography, message } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import router from 'next/router'
import { getSession, useSession } from 'next-auth/react'
import Markdown from 'react-markdown'
import styles from './styles.module.scss'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

const { Text, Title, Paragraph } = Typography

interface PageProps {
	vacancy: prismaClient.TeamVacancy & {
		team: { project: prismaClient.Project }
		promisePercentage: number
		promiseStep: prismaClient.ProjectWorkflowStep
		myTeamMemberId: string
	}
	pageCover: string
	isAuthenticated: boolean
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (context) => {
	const vacancyId = context.params?.vacancyId as string
	const session = await getSession(context)

	if (!vacancyId) {
		return {
			notFound: true,
		}
	}

	try {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
		const { data: vacancy } = await axios.get(`${baseUrl}/api/project/vacancy`, {
			params: { id: vacancyId },
			headers: {
				cookie: context.req.headers.cookie,
			},
		})

		return {
			props: {
				vacancy,
				pageCover: vacancy.team?.project?.coverImage || null,
				isAuthenticated: !!session,
				isTeamMember: !!vacancy.myTeamMemberId,
			},
		}
	} catch (error) {
		console.error('Error fetching post:', error)
		return {
			notFound: true,
		}
	}
}

export default function VancancyPage({ vacancy, pageCover, isAuthenticated }: PageProps) {
	const { t } = useTranslate()
	const { data: session } = useSession()
	const [showPitchVideo, setShowPitchVideo] = useState(false)
	const [showSpecialitySelectModal, setShowSpecialitySelectModal] = useState(false)

	const { mutateAsync: withdrawApply } = useMutation({
		mutationFn: (data: { teamMemberId: string }) => axios.put<void>('/api/user/project/vacancy/withdraw', data),
	})

	const { mutateAsync: vacancyApply } = useMutation({
		mutationFn: (data: { specialityId: string; contactType: string[]; telegramNickname?: string; vacancyId: string }) =>
			axios.post<void>('/api/user/project/vacancy/apply', data),
	})

	const handleCoverClick = () => setShowPitchVideo(true)

	const withdrawApplyHandler = async (data: { teamMemberId: string }) => {
		try {
			await withdrawApply(data)

			router.reload()

			message.success(t('page.vacancy.withdrawSuccess', 'Your response is withdrawn'))
		} catch (error: any) {
			console.log(error)
			message.error(error.response?.data.message || error.message)
		}
	}

	const functionOkButton = async () => {
		if (!session) {
			router.push('/signin?callbackUrl=' + router.asPath)
		}

		return vacancy?.myTeamMemberId
			? withdrawApplyHandler({ teamMemberId: vacancy.myTeamMemberId })
			: setShowSpecialitySelectModal(true)
	}

	const statusOkButton = () => {
		if (!session) {
			return t('signin', 'Signin')
		}

		return vacancy?.myTeamMemberId
			? t('modal.vacancy.cancelMyResponse', 'Cancel my response')
			: t('modal.vacancy.apply', 'Respond')
	}

	const handleSpecialitySelect = async ({
		specialityId,
		contactType,
		telegramNickname,
	}: {
		specialityId: any
		contactType: string[]
		telegramNickname?: string
	}) => {
		if (!vacancy) return

		try {
			await vacancyApply({
				specialityId,
				contactType,
				telegramNickname,
				vacancyId: vacancy.id,
			})

			router.reload()

			message.success(t('page.vacancy.applySuccess', 'Your response is sent'))
			setShowSpecialitySelectModal(false)
			setTimeout(() => setShowSpecialitySelectModal(false), 600)
		} catch (error: any) {
			console.log(error)
			message.error(error.response?.data.message || error.message)
		}
	}

	return (
		<>
			<PublicLayout
				title={
					<div className={styles.titleContainer}>
						<Link href={`/jobs`}>
							<Button
								type="text"
								size="small"
								className={styles.projectTitle}
								onMouseEnter={(e) => {
									const button = e.currentTarget
									const arrow = button.querySelector('.arrow') as HTMLElement
									if (arrow) {
										arrow.style.width = '16px'
										arrow.style.marginRight = '8px'
										arrow.style.opacity = '1'
									}
									button.style.paddingLeft = '8px'
									button.style.paddingRight = '8px'
								}}
								onMouseLeave={(e) => {
									const button = e.currentTarget
									const arrow = button.querySelector('.arrow') as HTMLElement
									if (arrow) {
										arrow.style.width = '0'
										arrow.style.marginRight = '0'
										arrow.style.opacity = '0'
									}
									button.style.paddingLeft = '0'
									button.style.paddingRight = '0'
								}}
							>
								<Space size={0}>
									<ArrowLeftOutlined
										className="arrow"
										style={{
											width: 0,
											marginRight: 0,
											opacity: 0,
											transition: 'all 0.3s ease',
											overflow: 'hidden',
											color: '#ff4d4f',
										}}
									/>
									<span style={{ color: '#ff4d4f' }}>{t('page.vacancy.title', 'Jobs')}</span>
								</Space>
							</Button>
						</Link>
						<Title className={styles.title}>{t('page.vacancy.title', vacancy.title)}</Title>
					</div>
				}
				subTitle={`The open vacancy from ${vacancy.team?.project?.name} project`}
				backgroundImage={pageCover || undefined}
				seo={{
					title: `${vacancy.title}`,
				}}
				styles={{ content: { padding: 0 }, layoutBackground: { padding: 0 } }}
				ogImageType="job"
				ogImageParams={{
					p: vacancy.team?.project?.name,
					vTerms: vacancy.promisePercentage?.toString() || '',
					vDate: dayjs(vacancy.finishedAt).format('ll'),
				}}
			>
				<div className={styles.container}>
					<Spin spinning={false}>
						{!!vacancy && (
							<Card
								actions={[
									session?.user ? (
										<Button
											key="action"
											type={Boolean(vacancy?.myTeamMemberId) ? 'default' : 'primary'}
											onClick={functionOkButton}
										>
											{statusOkButton()}
										</Button>
									) : null,
								]}
							>
								<Flex vertical gap={24}>
									<Row gutter={[24, 24]}>
										<Col xs={24} md={14}>
											<Space direction="vertical" style={{ width: '100%' }}>
												<div>
													<Text className={styles.fieldLabel}>{t('page.vacancy.section.project', 'Project')}</Text>
													<Title level={4} style={{ margin: '8px 0' }}>
														{vacancy.team?.project?.name}
													</Title>
												</div>

												{vacancy.team?.project?.description && (
													<div>
														<Text className={styles.fieldLabel}>
															{t('page.vacancy.section.projectDescription', 'Project description')}
														</Text>
														<Paragraph style={{ margin: '8px 0' }}>
															{vacancy.team.project.description.slice(0, 200)}
															{vacancy.team.project.description.length > 200 && '...'}
														</Paragraph>
													</div>
												)}
											</Space>
										</Col>

										<Col xs={24} md={10}>
											{!showPitchVideo && vacancy.team?.project?.coverImage && (
												<div className={styles.projectCover}>
													{vacancy.team?.project?.videoLink && (
														<div className={styles.coverButtonContainer}>
															<Button onClick={handleCoverClick} type="primary" size="small">
																{t('page.vacancy.section.watch', 'Watch')}
															</Button>
														</div>
													)}
													<Image
														src={vacancy.team?.project?.coverImage}
														alt="Project cover"
														fill
														style={{ objectFit: 'cover' }}
													/>
												</div>
											)}
											{showPitchVideo && vacancy.team.project.videoLink && (
												<div className={styles.videoContainer}>
													<iframe
														src={`https://www.youtube.com/embed/${vacancy.team.project.videoLink}?autoplay=1`}
														title="Project video"
														width="100%"
														height="200"
														style={{ border: 'none', borderRadius: '8px' }}
														onEnded={() => setShowPitchVideo(false)}
													/>
												</div>
											)}
										</Col>
									</Row>

									{/* Vacancy Description */}
									<Space direction="vertical" style={{ width: '100%' }}>
										<div>
											<Text className={styles.fieldLabel}>
												{t('page.vacancy.section.vacancyDescription', 'Vacancy description')}
											</Text>
											<Title level={4} style={{ margin: '8px 0' }}>
												<Markdown>{vacancy.description}</Markdown>
											</Title>
										</div>
									</Space>

									{/* Finished At */}
									<Space>
										<Text>{t('page.vacancy.section.theVacancyIsAcuteBefore', 'The vacancy is relevant to')}:</Text>
										<Text strong>{dayjs(vacancy.finishedAt).format('LL')}</Text>
									</Space>

									{/* Equity Promise */}
									{!!vacancy.promisePercentage && !!vacancy.promiseStep?.name && (
										<Flex vertical gap={8}>
											<Text className={styles.fieldLabel}>
												{t('page.vacancy.section.termsOfCooperation', 'Terms of cooperation')}
											</Text>

											<Alert
												type="success"
												message={`${t('page.vacancy.equityPromise', 'Equity Promise')}: ${vacancy.promisePercentage}% ${t(
													'page.vacancy.section.equityPromiseDescription',
													'of project equity will be allocated upon reaching the required workflow step {step}',
													{ step: vacancy.promiseStep.name }
												)}`}
											/>
										</Flex>
									)}

									{/* Status Alerts */}
									{vacancy.myTeamMemberId ? (
										<Alert
											type="warning"
											message={t('page.vacancy.applied', 'You have already responded to this vacancy')}
										/>
									) : null}

									{!session?.user && (
										<Alert
											type="error"
											message={
												<T
													keyName="page.vacancy.notAuth"
													defaultValue="Only registered users can respond to this vacancy. Please <register-link>register</register-link> or <signin-link>sign in</signin-link>."
													params={{
														'register-link': (chunks: React.ReactNode) => <a href="/registration">{chunks}</a>,
														'signin-link': (chunks: React.ReactNode) => <a href="/signin">{chunks}</a>,
													}}
												/>
											}
										/>
									)}
								</Flex>
							</Card>
						)}
					</Spin>
				</div>

				{Boolean(session) && (
					<SpecialitySelectModal
						open={showSpecialitySelectModal}
						onOk={handleSpecialitySelect}
						onCancel={() => setShowSpecialitySelectModal(false)}
					/>
				)}
			</PublicLayout>
		</>
	)
}
