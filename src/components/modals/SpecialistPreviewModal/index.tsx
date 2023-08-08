import { useEffect } from 'react'
import { Profile, Speciality, User, WorkDirection } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { Button, Descriptions, Modal, Space, Spin, Typography } from 'antd'
import axios from 'axios'
import Link from 'next/link'
import { TbBrandTelegram, TbMail } from 'react-icons/tb'
import styles from './style.module.scss'

const { Paragraph } = Typography

const SpecialistPreviewModal = ({ specialistId, open, onOk, onCancel }: any) => {
	const {
		data: specialist,
		refetch: fetchSpecialist,
		isLoading,
	} = useQuery(
		['specialist', specialistId],
		() =>
			axios.get<Speciality & { direction: WorkDirection; user: User & { profile: Profile & { [key: string]: any } } }>(
				'/api/specialist',
				{ params: { id: specialistId } }
			),
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
						<>
							<div className={styles.specialityTitle}>
								<h1>{specialist?.data.name}</h1>({specialist?.data.level})
							</div>

							<Descriptions
								className={styles.descriptionBlock}
								layout="horizontal"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
							>
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

							<Descriptions
								className={styles.descriptionBlock}
								layout="vertical"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
							>
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

							<Descriptions
								title="Предпочтения в играх"
								layout="vertical"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
								className={styles.descriptionBlock}
							>
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

							<div className={styles.descriptionBlock}>
								<Paragraph strong>Контакты</Paragraph>
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
							</div>
						</>
					)}
				</Spin>
			</Modal>
		</>
	)
}

export default SpecialistPreviewModal
