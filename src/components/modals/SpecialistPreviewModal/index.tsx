import { useEffect } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { TbBrandTelegram } from '@react-icons/all-files/tb/TbBrandTelegram'
import { TbClock } from '@react-icons/all-files/tb/TbClock'
import { TbFileText } from '@react-icons/all-files/tb/TbFileText'
import { TbMail } from '@react-icons/all-files/tb/TbMail'
import { TbMapPin } from '@react-icons/all-files/tb/TbMapPin'
import { TbQuote } from '@react-icons/all-files/tb/TbQuote'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Col, Divider, Modal, Progress, Row, Space, Spin, Tag, Typography, theme } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import styles from './style.module.scss'

const { Paragraph, Text, Title } = Typography

const SpecialistPreviewModal = ({ specialistId, open, onOk, onCancel }: any) => {
	const { token } = theme.useToken()
	const { t } = useTolgee()
	const {
		data: specialist,
		refetch: fetchSpecialist,
		isLoading,
	} = useQuery({
		queryKey: ['specialist', specialistId],
		queryFn: () =>
			axios.get<
				prismaClient.Speciality & {
					availableProjects: (prismaClient.MatchingSpecialistAndProject & { project: { name: string } })[]
					direction: prismaClient.WorkDirection
					user: prismaClient.User & { profile: prismaClient.Profile & { [key: string]: any } }
				}
			>('/api/specialist', { params: { id: specialistId } }),
		staleTime: Infinity,
		enabled: open,
	})

	useEffect(() => {
		if (open && specialistId) {
			fetchSpecialist()
		}
	}, [open])

	const handleCancel = () => {
		onCancel()
	}

	const calculateMatchColor = (percent: number) => {
		if (percent >= 60 && percent < 80) {
			return token.colorWarning
		}

		if (percent >= 80) {
			return token.colorSuccess
		}

		return token.colorError
	}

	const renderSkillTags = (skills: string | null) => {
		if (!skills) return <T>(not pointed)</T>
		return skills.split(',').map((skill, index) => (
			<Tag key={index} className={styles.skillTag}>
				{skill.trim()}
			</Tag>
		))
	}

	return (
		<>
			<Modal
				centered
				title={null}
				width={800}
				destroyOnHidden
				maskClosable={false}
				open={open}
				onCancel={handleCancel}
				footer={[
					<Space key="form-buttons" wrap>
						<Button key="close" onClick={handleCancel} disabled={isLoading}>
							<T>Close</T>
						</Button>
					</Space>,
				]}
			>
				<Spin spinning={isLoading}>
					{!!specialist?.data && (
						<Space direction="vertical" style={{ width: '100%' }}>
							<div className={styles.cardHeader}>
								<Text type="secondary" className={styles.cardType}>
									<T>Specialist card</T>
								</Text>
								<div className={styles.specialityTitle}>
									<Title level={2} style={{ margin: 0 }}>
										{specialist?.data.name}
									</Title>
									<span className={styles.levelBadge}>{specialist?.data.level}</span>
								</div>
							</div>

							<Row gutter={[24, 24]}>
								<Col xs={24} md={16}>
									<Card className={styles.cardWrapper} bordered={false}>
										<Row gutter={[24, 16]} className={styles.profileInfo}>
											{!!specialist.data.user.profile.country && (
												<Col xs={24} sm={12}>
													<Space>
														<TbMapPin size={18} style={{ color: token.colorPrimary }} />
														<Text>
															{[specialist.data.user.profile.country, specialist.data.user.profile.city].join(', ')}
														</Text>
													</Space>
												</Col>
											)}
											<Col xs={24} sm={12}>
												<Space>
													<TbClock size={18} style={{ color: token.colorPrimary }} />
													<Text>
														<T
															keyName="fromTo"
															defaultValue="from {fromDate} to {toDate} hours a week"
															params={{
																fromDate: specialist.data.user.profile.timeForWork[0],
																toDate: specialist.data.user.profile.timeForWork[1],
															}}
														/>
													</Text>
												</Space>
											</Col>
											{!!specialist.data.portfolioUrl && (
												<Col span={24}>
													<Space>
														<TbFileText size={18} style={{ color: token.colorPrimary }} />
														<Link href={specialist.data.portfolioUrl} target="_blank">
															<Button type="text" ghost size="small">
																<T>Summary/portfolio</T>
															</Button>
														</Link>
													</Space>
												</Col>
											)}
										</Row>
									</Card>
								</Col>

								<Col xs={24} md={8}>
									{(specialist.data.user.profile.tgNickname || specialist.data.user.email) && (
										<Card
											className={styles.cardWrapper}
											title={<T>Contacts</T>}
											bordered={false}
											style={{ height: '100%' }}
										>
											<div className={styles.contactButtons}>
												{!!specialist.data.user.profile.tgNickname && (
													<Link target="_blank" href={'https://t.me/' + specialist.data.user.profile.tgNickname}>
														<Button type="primary" icon={<TbBrandTelegram size={16} />} size="middle">
															Telegram
														</Button>
													</Link>
												)}
												{!!!specialist.data.user.profile.tgNickname && !!specialist.data.user.email && (
													<Link target="_blank" href={'mailto:' + specialist.data.user.email}>
														<Button type="primary" icon={<TbMail size={16} />} size="middle">
															Email
														</Button>
													</Link>
												)}
											</div>
										</Card>
									)}
								</Col>
							</Row>

							{specialist.data.user.profile.about && (
								<Card className={styles.cardWrapper} title={<T>About me</T>} bordered={false}>
									<Row>
										<Col span={24}>
											<div className={styles.quoteBlock}>
												<TbQuote size={24} style={{ color: token.colorPrimary, marginRight: 8 }} />
												<Paragraph>{specialist.data.user.profile.about}</Paragraph>
											</div>
										</Col>
									</Row>
								</Card>
							)}

							<Card className={styles.cardWrapper} title={<T>Professional info</T>} bordered={false}>
								<Row gutter={[24, 24]}>
									<Col xs={24} md={12}>
										<div>
											<Text type="secondary" className={styles.fieldLabel}>
												<T>Specialization</T>
											</Text>
											<Paragraph>{specialist.data.specialization}</Paragraph>
										</div>

										{specialist.data.tools && (
											<div style={{ marginTop: 16 }}>
												<Text type="secondary" className={styles.fieldLabel}>
													<T>I use it in work</T>
												</Text>
												<Paragraph>{specialist.data.tools}</Paragraph>
											</div>
										)}
									</Col>

									<Col xs={24} md={12}>
										{specialist.data.jobs && (
											<div>
												<Text type="secondary" className={styles.fieldLabel}>
													<T>Experience</T>
												</Text>
												<Paragraph>{specialist.data.jobs}</Paragraph>
											</div>
										)}

										{specialist.data.schools && (
											<div style={{ marginTop: 16 }}>
												<Text type="secondary" className={styles.fieldLabel}>
													<T>Where I received knowledge</T>
												</Text>
												<Paragraph>{specialist.data.schools}</Paragraph>
											</div>
										)}
									</Col>
								</Row>
								<Row gutter={[24, 24]}>
									<Col span={24}>
										{specialist.data.skills && (
											<div style={{ marginTop: 16 }}>
												<Text type="secondary" className={styles.fieldLabel}>
													<T>Skills</T>
												</Text>
												<div style={{ marginTop: 4 }}>{renderSkillTags(specialist.data.skills)}</div>
											</div>
										)}
									</Col>
								</Row>
							</Card>

							{(specialist.data.user.profile.preferredGenres?.length > 0 ||
								specialist.data.user.profile.preferredSettings?.length > 0 ||
								specialist.data.user.profile.preferredLevels?.length > 0) && (
								<Card className={styles.cardWrapper} title={<T>Preferences in games</T>} bordered={false}>
									<Row gutter={[24, 24]}>
										{specialist.data.user.profile.preferredGenres?.length > 0 && (
											<Col xs={24} md={8}>
												<Text type="secondary" className={styles.fieldLabel}>
													<T>I prefer genres</T>
												</Text>
												<div style={{ marginTop: 4 }}>
													{specialist.data.user.profile.preferredGenres.map((r: any, index: number) => (
														<Tag key={index} className={styles.skillTag}>
															{r.name}
														</Tag>
													))}
												</div>
											</Col>
										)}

										{specialist.data.user.profile.preferredSettings?.length > 0 && (
											<Col xs={24} md={8}>
												<Text type="secondary" className={styles.fieldLabel}>
													<T>I prefer game settings</T>
												</Text>
												<div style={{ marginTop: 4 }}>
													{specialist.data.user.profile.preferredSettings.map((r: any, index: number) => (
														<Tag key={index} className={styles.skillTag}>
															{r.name}
														</Tag>
													))}
												</div>
											</Col>
										)}

										{specialist.data.user.profile.preferredLevels?.length > 0 && (
											<Col xs={24} md={8}>
												<Text type="secondary" className={styles.fieldLabel}>
													<T>I prefer games of the following complexity</T>
												</Text>
												<div style={{ marginTop: 4 }}>
													{specialist.data.user.profile.preferredLevels.map((r: any, index: number) => (
														<Tag key={index} className={styles.skillTag}>
															{r.name}
														</Tag>
													))}
												</div>
											</Col>
										)}
									</Row>
								</Card>
							)}

							{specialist.data?.availableProjects?.length > 0 && (
								<>
									{specialist.data.availableProjects.map((record) => (
										<Card
											key={record.id}
											className={styles.cardWrapper}
											bordered={false}
											title={
												<Row justify="space-between" align="middle" style={{ width: '100%' }}>
													<Col>
														<Text strong>{t('Suitable for the project') + ' ' + record.project.name}</Text>
													</Col>
													<Col>
														<Tag
															style={{
																padding: '4px 12px',
																borderRadius: '16px',
																color: 'white',
																background: calculateMatchColor(record.avgScore),
															}}
														>
															{record.avgScore}%
														</Tag>
													</Col>
												</Row>
											}
										>
											<Space direction="vertical" style={{ width: '100%' }}>
												<Row gutter={16}>
													<Col xs={24} sm={8}>
														<Card className={styles.statCard} bordered={false}>
															<div style={{ textAlign: 'center' }}>
																<Progress
																	type="circle"
																	percent={record.projectScore}
																	size={80}
																	strokeColor={calculateMatchColor(record.projectScore)}
																/>
																<div style={{ marginTop: 12 }}>
																	<Text type="secondary" className={styles.fieldLabel}>
																		<T>Compliance with the project</T>
																	</Text>
																</div>
															</div>
														</Card>
													</Col>
													<Col xs={24} sm={8}>
														<Card className={styles.statCard} bordered={false}>
															<div style={{ textAlign: 'center' }}>
																<Progress
																	type="circle"
																	percent={record.authorScore}
																	size={80}
																	strokeColor={calculateMatchColor(record.authorScore)}
																/>
																<div style={{ marginTop: 12 }}>
																	<Text type="secondary" className={styles.fieldLabel}>
																		<T>Compliance with the author</T>
																	</Text>
																</div>
															</div>
														</Card>
													</Col>
													<Col xs={24} sm={8}>
														<Card className={styles.statCard} bordered={false}>
															<div style={{ textAlign: 'center' }}>
																<Progress
																	type="circle"
																	percent={record.teamScore}
																	size={80}
																	strokeColor={calculateMatchColor(record.teamScore)}
																/>
																<div style={{ marginTop: 12 }}>
																	<Text type="secondary" className={styles.fieldLabel}>
																		<T>Compliance with the team</T>
																	</Text>
																</div>
															</div>
														</Card>
													</Col>
												</Row>

												{record.summary && (
													<div style={{ marginTop: 24 }}>
														<Divider />
														<Text type="secondary" className={styles.fieldLabel}>
															<T>Comment</T>
														</Text>
														<Paragraph>{record.summary}</Paragraph>
													</div>
												)}
											</Space>
										</Card>
									))}
								</>
							)}
						</Space>
					)}
				</Spin>
			</Modal>
		</>
	)
}

export default SpecialistPreviewModal
