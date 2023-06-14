import { useEffect, useState } from 'react'
import { Button, Descriptions, Modal, Space, Spin, Typography } from 'antd'
import Link from 'next/link'
import { TbBrandTelegram, TbMail } from 'react-icons/tb'
import useSWR from 'swr'
import styles from './style.module.scss'
import { fetcher } from '@/helpers/fetcher'

const { Paragraph } = Typography

const SpecialistPreviewModal = ({ specialistId, open, onOk, onCancel }: any) => {
	const [processing, setProcessing] = useState(true)

	const {
		data: specialist,
		mutate: fetchSpecialist,
		isValidating: isLoadingSpecialist,
	} = useSWR({ url: '/api/specialists/get', data: { id: specialistId } }, fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !specialistId,
		onSuccess: (data) => {
			setProcessing(false)
		},
	})

	useEffect(() => {
		if (open && !specialistId) {
			setProcessing(false)
		}
		if (open && specialistId) {
			fetchSpecialist()
			setProcessing(true)
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
				confirmLoading={processing}
				footer={[
					<Space key="form-buttons" wrap>
						<Button key="close" onClick={handleCancel} disabled={processing}>
							Закрыть
						</Button>
					</Space>,
				]}
			>
				<Spin spinning={processing}>
					{!!specialist && (
						<>
							<div className={styles.specialityTitle}>
								<h1>{specialist?.Name}</h1>
								{specialist.Direction} ({specialist.Level})
							</div>

							<Descriptions
								className={styles.descriptionBlock}
								layout="horizontal"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
							>
								{!!specialist?.Profile['Resume/Portfolio'] && (
									<Descriptions.Item label="Резюме/портфолио">
										<Link href={specialist.Profile['Resume/Portfolio']} target="_blank">
											<Button size="small">Перейти</Button>
										</Link>
									</Descriptions.Item>
								)}
								<Descriptions.Item label="Свободное время">
									{specialist.Profile['Time For Work']} часов
								</Descriptions.Item>
								{!!specialist?.Country && (
									<Descriptions.Item label="Место проживания">
										{[specialist.Profile.Country, specialist.Profile.City].join(', ')}
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
								<Descriptions.Item label="Специализация">{specialist.Specialization}</Descriptions.Item>
								<Descriptions.Item label="Навыки">{specialist.Skills}</Descriptions.Item>
								<Descriptions.Item label="Использую в работе">
									{specialist.Tools || '(инструменты не указаны)'}
								</Descriptions.Item>
								<Descriptions.Item label="Опыт работы">
									{specialist.Workplaces || '(места работ не указаны)'}
								</Descriptions.Item>
								<Descriptions.Item label="Где получал знания">
									{specialist.Schools || '(места обучения не указаны)'}
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
									{specialist.Profile['Preferred Genres']
										? specialist.Profile['Preferred Genres'].join(', ')
										: '(не указано)'}
								</Descriptions.Item>
								<Descriptions.Item label="Предпочитаю сеттинги">
									{specialist.Profile['Preferred Settings']
										? specialist.Profile['Preferred Settings'].join(', ')
										: '(не указано)'}
								</Descriptions.Item>
								<Descriptions.Item label="Предпочитаю игры следующей сложности">
									{specialist.Profile['Preferred Difficulty Levels']
										? specialist.Profile['Preferred Difficulty Levels'].join(', ')
										: '(не указано)'}
								</Descriptions.Item>
							</Descriptions>

							<div className={styles.descriptionBlock}>
								<Paragraph strong>Контакты</Paragraph>
								<Space wrap>
									{!!specialist.Profile['Telegram Nickname'] && (
										<Link target="_blank" href={'https://t.me/' + specialist.Profile['Telegram Nickname']}>
											<Button icon={<TbBrandTelegram size={16} />}>Telegram</Button>
										</Link>
									)}
									{!!specialist.Profile['Email (from Account)'] && !specialist.Profile['Telegram Nickname'] && (
										<Link target="_blank" href={'mailto:' + specialist.Profile['Email (from Account)']}>
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
