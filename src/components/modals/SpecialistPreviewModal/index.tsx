import { useEffect } from 'react'
import { MatchingSpecialistAndProject, Profile, Speciality, User, WorkDirection } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Col, Descriptions, Modal, Row, Space, Spin, Statistic, Tag, Typography, theme } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { TbBrandTelegram, TbMail } from 'react-icons/tb'
import styles from './style.module.scss'

const { Paragraph, Text } = Typography

const SpecialistPreviewModal = ({ specialistId, open, onOk, onCancel }: any) => {
	const { token } = theme.useToken()
	const {
		data: specialist,
		refetch: fetchSpecialist,
		isLoading,
	} = useQuery(
		['specialist', specialistId],
		() =>
			axios.get<
				Speciality & {
					availableProjects: (MatchingSpecialistAndProject & { project: { name: string } })[]
					direction: WorkDirection
					user: User & { profile: Profile & { [key: string]: any } }
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
				title="Карточка специалиста"
				width={800}
				destroyOnClose
				maskClosable={false}
				open={open}
				onCancel={handleCancel}
				footer={[
					<Space key="form-buttons" wrap>
						<Button key="close" onClick={handleCancel} disabled={isLoading}>
							Закрыть
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
										<Descriptions.Item label="Резюме/портфолио">
											<Link href={specialist.data.portfolioUrl} target="_blank">
												<Button size="small">Перейти</Button>
											</Link>
										</Descriptions.Item>
									)}
									<Descriptions.Item label="Свободное время">
										от {specialist.data.user.profile.timeForWork[0]} до {specialist.data.user.profile.timeForWork[1]}{' '}
										часов в неделю
									</Descriptions.Item>
									{!!specialist.data.user.profile.country && (
										<Descriptions.Item label="Место проживания">
											{[specialist.data.user.profile.country, specialist.data.user.profile.city].join(', ')}
										</Descriptions.Item>
									)}
								</Descriptions>
							</Card>

							<Card>
								<Descriptions layout="vertical" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
									<Descriptions.Item label="Специализация">{specialist.data.specialization}</Descriptions.Item>
									<Descriptions.Item label="Навыки">{specialist.data.skills}</Descriptions.Item>
									<Descriptions.Item label="Использую в работе">
										{specialist.data.tools || '(инструменты не указаны)'}
									</Descriptions.Item>
									<Descriptions.Item label="Опыт работы">
										{specialist.data.jobs || '(места работ не указаны)'}
									</Descriptions.Item>
									<Descriptions.Item label="Где получал знания">
										{specialist.data.schools || '(места обучения не указаны)'}
									</Descriptions.Item>
								</Descriptions>
							</Card>

							<Card title="Предпочтения в играх">
								<Descriptions layout="vertical" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
									<Descriptions.Item label="Предпочитаю жанры">
										{specialist.data.user.profile.preferredGenres
											? specialist.data.user.profile.preferredGenres.map((r: any) => r.name).join(', ')
											: '(не указано)'}
									</Descriptions.Item>
									<Descriptions.Item label="Предпочитаю сеттинги">
										{specialist.data.user.profile.preferredSettings
											? specialist.data.user.profile.preferredSettings.map((r: any) => r.name).join(', ')
											: '(не указано)'}
									</Descriptions.Item>
									<Descriptions.Item label="Предпочитаю игры следующей сложности">
										{specialist.data.user.profile.preferredLevels
											? specialist.data.user.profile.preferredLevels.map((r: any) => r.name).join(', ')
											: '(не указано)'}
									</Descriptions.Item>
								</Descriptions>
							</Card>

							{specialist.data?.availableProjects?.map((record) => (
								<Card
									key={record.id}
									title={'Подходит для проекта ' + record.project.name}
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
														title="Соответствие проекту"
														value={record.projectScore}
														valueStyle={{ fontSize: 24, color: calculateMatcinhColor(record.projectScore) }}
														suffix="%"
													/>
												</Card>
											</Col>
											<Col span={8}>
												<Card bordered={false}>
													<Statistic
														title="Соответствие автору"
														value={record.authorScore}
														valueStyle={{ fontSize: 24, color: calculateMatcinhColor(record.authorScore) }}
														suffix="%"
													/>
												</Card>
											</Col>
											<Col span={8}>
												<Card bordered={false}>
													<Statistic
														title="Соответствие команде"
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

										<Text strong>Комментарий</Text>

										<Paragraph>{record.summary}</Paragraph>
									</Space>
								</Card>
							))}

							<Card title="Контакты">
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
