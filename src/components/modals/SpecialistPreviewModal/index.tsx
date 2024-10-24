import { useEffect } from 'react'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { TbBrandTelegram } from '@react-icons/all-files/tb/TbBrandTelegram'
import { TbMail } from '@react-icons/all-files/tb/TbMail'
import { useQuery } from '@tanstack/react-query'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Col, Descriptions, Modal, Row, Space, Spin, Statistic, Tag, Typography, theme } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import styles from './style.module.scss'

const { Paragraph, Text } = Typography

const SpecialistPreviewModal = ({ specialistId, open, onOk, onCancel }: any) => {
	const { token } = theme.useToken()
	const { t } = useTolgee()
	const {
		data: specialist,
		refetch: fetchSpecialist,
		isLoading,
	} = useQuery(
		['specialist', specialistId],
		() =>
			axios.get<
				prismaClient.Speciality & {
					availableProjects: (prismaClient.MatchingSpecialistAndProject & { project: { name: string } })[]
					direction: prismaClient.WorkDirection
					user: prismaClient.User & { profile: prismaClient.Profile & { [key: string]: any } }
				}
			>('/api/specialist', { params: { id: specialistId } }),
		{ staleTime: Infinity, enabled: open }
	)

	useEffect(() => {
		if (open && specialistId) {
			fetchSpecialist()
		}
	}, [open])

	const handleCancel = () => {
		onCancel()
	}

	const calculateMatcinhColor = (percent: number) => {
		if (percent >= 60 && percent < 80) {
			return token.colorWarning
		}

		if (percent >= 80) {
			return token.colorSuccess
		}

		return token.colorError
	}

	return (
		<>
			<Modal
				centered
				title={t('Specialist card')}
				width={800}
				destroyOnClose
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
						<Space direction="vertical">
							<div className={styles.specialityTitle}>
								<h1>{specialist?.data.name}</h1>({specialist?.data.level})
							</div>

							<Card>
								<Descriptions layout="horizontal" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
									{!!specialist.data.portfolioUrl && (
										<Descriptions.Item label={t('Summary/portfolio')}>
											<Link href={specialist.data.portfolioUrl} target="_blank">
												<Button size="small">
													<T>Go</T>
												</Button>
											</Link>
										</Descriptions.Item>
									)}
									<Descriptions.Item label={t('Free time')}>
										<T
											keyName="fromTo"
											defaultValue="from {fromDate} to {toDate} hours a week"
											params={{
												fromDate: specialist.data.user.profile.timeForWork[0],
												toDate: specialist.data.user.profile.timeForWork[1],
											}}
										/>
									</Descriptions.Item>
									{!!specialist.data.user.profile.country && (
										<Descriptions.Item label={t('Place of residence')}>
											{[specialist.data.user.profile.country, specialist.data.user.profile.city].join(', ')}
										</Descriptions.Item>
									)}
								</Descriptions>
							</Card>

							<Card>
								<Descriptions layout="vertical" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
									<Descriptions.Item label={t('Specialization')}>{specialist.data.specialization}</Descriptions.Item>
									<Descriptions.Item label={t('Skills')}>{specialist.data.skills}</Descriptions.Item>
									<Descriptions.Item label={t('I use it in work')}>
										{specialist.data.tools || t('(tools are not indicated)')}
									</Descriptions.Item>
									<Descriptions.Item label={t('Experience')}>
										{specialist.data.jobs || t('(places of work are not indicated)')}
									</Descriptions.Item>
									<Descriptions.Item label={t('Where I received knowledge')}>
										{specialist.data.schools || t('(places of training are not indicated)')}
									</Descriptions.Item>
								</Descriptions>
							</Card>

							<Card title={t('Preferences in games')}>
								<Descriptions layout="vertical" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
									<Descriptions.Item label={t('I prefer genres')}>
										{specialist.data.user.profile.preferredGenres ? (
											specialist.data.user.profile.preferredGenres.map((r: any) => r.name).join(', ')
										) : (
											<T>(not pointed)</T>
										)}
									</Descriptions.Item>
									<Descriptions.Item label={t('I prefer game settings')}>
										{specialist.data.user.profile.preferredSettings ? (
											specialist.data.user.profile.preferredSettings.map((r: any) => r.name).join(', ')
										) : (
											<T>(not pointed)</T>
										)}
									</Descriptions.Item>
									<Descriptions.Item label={t('I prefer games of the following complexitylexity')}>
										{specialist.data.user.profile.preferredLevels ? (
											specialist.data.user.profile.preferredLevels.map((r: any) => r.name).join(', ')
										) : (
											<T>(not pointed)</T>
										)}
									</Descriptions.Item>
								</Descriptions>
							</Card>

							{specialist.data?.availableProjects?.map((record) => (
								<Card
									key={record.id}
									title={t('Suitable for the project') + ' ' + record.project.name}
									extra={
										<Tag style={{ padding: '8px 12px' }} color={calculateMatcinhColor(record.avgScore)}>
											{record.avgScore}%
										</Tag>
									}
									className={styles.matchingBlock}
								>
									<Space direction="vertical">
										<Row gutter={16}>
											<Col span={8}>
												<Card bordered={false}>
													<Statistic
														title={t('Compliance with the project')}
														value={record.projectScore}
														valueStyle={{ fontSize: 24, color: calculateMatcinhColor(record.projectScore) }}
														suffix="%"
													/>
												</Card>
											</Col>
											<Col span={8}>
												<Card bordered={false}>
													<Statistic
														title={t('Compliance with the author')}
														value={record.authorScore}
														valueStyle={{ fontSize: 24, color: calculateMatcinhColor(record.authorScore) }}
														suffix="%"
													/>
												</Card>
											</Col>
											<Col span={8}>
												<Card bordered={false}>
													<Statistic
														title={t('Compliance with the team')}
														value={record.teamScore}
														valueStyle={{
															fontSize: 24,
															color: calculateMatcinhColor(record.teamScore),
														}}
														suffix="%"
													/>
												</Card>
											</Col>
										</Row>

										<Text strong>
											<T>Comment</T>
										</Text>

										<Paragraph>{record.summary}</Paragraph>
									</Space>
								</Card>
							))}

							<Card title={<T>Contacts</T>}>
								<Space wrap>
									{!!specialist.data.user.profile.tgNickname && (
										<Link target="_blank" href={'https://t.me/' + specialist.data.user.profile.tgNickname}>
											<Button icon={<TbBrandTelegram size={16} />}>Telegram</Button>
										</Link>
									)}
									{!!!specialist.data.user.profile.tgNickname && (
										<Link target="_blank" href={'mailto:' + specialist.data.user.email}>
											<Button icon={<TbMail size={16} />}>Email</Button>
										</Link>
									)}
								</Space>
							</Card>
						</Space>
					)}
				</Spin>
			</Modal>
		</>
	)
}

export default SpecialistPreviewModal
