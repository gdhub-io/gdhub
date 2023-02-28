import { useEffect, useState } from 'react'
import { fetcher } from '@helpers/fetcher'
import { Button, Col, Descriptions, Form, message, Modal, Row, Space, Spin } from 'antd'
import moment from 'moment'
import Image from 'next/image'
import Link from 'next/link'
import { TbBrandTelegram } from 'react-icons/tb'
import useSWR from 'swr'
import styles from './style.module.less'

const ProjectCandidatePreviewModal = ({ project, candidateId, open, onOk, onCancel }: any) => {
	const [form] = Form.useForm()
	const [processing, setProcessing] = useState(true)

	const {
		data: candidate,
		mutate: fetchCandidate,
		isValidating: isLoadingCandidate,
	} = useSWR({ url: '/api/my/project-candidate', data: { id: candidateId } }, fetcher, {
		revalidateOnFocus: false,
		isPaused: () => !candidateId,
		onSuccess: (data) => {
			setProcessing(false)
			form.setFieldsValue({ ...data, 'Created At': moment(data['Created At']) })
		},
	})

	useEffect(() => {
		if (open && !candidateId) {
			setProcessing(false)
		}
		if (open && candidateId) {
			fetchCandidate()
			setProcessing(true)
		}
	}, [open])

	const handleCancel = () => {
		form.resetFields()
		onCancel()
	}

	const handleReject = async () => {
		try {
			await fetcher({
				url: '/api/vacancy/candidate/reject',
				data: {
					id: candidateId,
				},
			})

			message.success('Вы отклонили кандидатуру ' + candidate.Name)
			onOk()
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	const handleApprove = async () => {
		try {
			await fetcher({
				url: '/api/vacancy/candidate/approve',
				data: {
					id: candidateId,
				},
			})

			message.success(`Вы приняли ${candidate.Name} в команду`)
			onOk()
		} catch (error: any) {
			console.log(error)
			message.error(error.message)
		}
	}

	return (
		<>
			<Modal
				centered
				title="Карточка кандидата"
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
						<Button key="reject" disabled={processing} onClick={handleReject}>
							Отклонить
						</Button>
						<Button key="approve" disabled={processing} type="primary" onClick={handleApprove}>
							Принять в команду
						</Button>
					</Space>,
				]}
			>
				<Spin spinning={processing}>
					{!!candidate && (
						<>
							<Row gutter={[24, 24]}>
								<Col xs={{ span: 24, order: 1 }} md={{ span: 18, order: 0 }}>
									<div className={styles.specialityTitle}>
										<h1>{candidate?.Name}</h1>
										{candidate?.Speciality.Name} ({candidate?.Speciality.Level})
									</div>

									<Descriptions layout="horizontal" column={1} size="small" labelStyle={{ fontWeight: 'bold' }}>
										<Descriptions.Item label="Интересует вакансия">{candidate['Vacancy Name']}</Descriptions.Item>
										<Descriptions.Item label="На проекте">{candidate['Project Name']}</Descriptions.Item>
										<Descriptions.Item label="Создано">
											{moment(candidate['Created At']).format('DD.MM.YYYY')}
										</Descriptions.Item>
									</Descriptions>

									<Descriptions
										title="Об участнике"
										className={styles.descriptionBlock}
										layout="horizontal"
										column={1}
										size="small"
										labelStyle={{ fontWeight: 'bold' }}
									>
										{!!candidate?.Profile['Resume/Portfolio'] && (
											<Descriptions.Item label="Резюме/портфолио">
												<Link href={candidate.Profile['Resume/Portfolio']} target="_blank">
													<Button size="small">Перейти</Button>
												</Link>
											</Descriptions.Item>
										)}
										<Descriptions.Item label="Свободное время">
											{candidate.Profile['Time For Work']} часов
										</Descriptions.Item>
										<Descriptions.Item label="Место проживания">
											{[candidate.Profile.Country, candidate.Profile.City].join(', ')}
										</Descriptions.Item>
									</Descriptions>
								</Col>
								<Col xs={{ span: 24, order: 0 }} md={{ span: 6, order: 1 }}>
									<Space direction="vertical" align="center" style={{ width: '100%' }}>
										{!!candidate.Avatar && (
											<div className={styles.avatar}>
												<Image src={candidate.Avatar} alt="project member avatar" width={160} height={160} />
											</div>
										)}
										{!!candidate.Profile['Telegram Nickname'] && (
											<Link target="_blank" href={'https://t.me/' + candidate.Profile['Telegram Nickname']}>
												<Button
													icon={<TbBrandTelegram size={16} style={{ position: 'relative', top: 3, marginRight: 5 }} />}
												>
													Связаться
												</Button>
											</Link>
										)}
									</Space>
								</Col>
							</Row>

							<Descriptions
								title="О специальности"
								className={styles.descriptionBlock}
								layout="vertical"
								column={1}
								size="small"
								labelStyle={{ fontWeight: 'bold' }}
							>
								<Descriptions.Item label="Специализация">{candidate.Speciality.Specialization}</Descriptions.Item>
								<Descriptions.Item label="Навыки">{candidate.Speciality.Skills}</Descriptions.Item>
								<Descriptions.Item label="Использую в работе">
									{candidate.Speciality.Tools || '(инструменты не указаны)'}
								</Descriptions.Item>
								<Descriptions.Item label="Опыт работы">
									{candidate.Speciality.Workplaces || '(места работ не указаны)'}
								</Descriptions.Item>
								<Descriptions.Item label="Где получал знания">
									{candidate.Speciality.Schools || '(места обучения не указаны)'}
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
									{candidate.Profile['Preferred Genres']
										? candidate.Profile['Preferred Genres'].join(', ')
										: '(не указано)'}
								</Descriptions.Item>
								<Descriptions.Item label="Предпочитаю сеттинги">
									{candidate.Profile['Preferred Settings']
										? candidate.Profile['Preferred Settings'].join(', ')
										: '(не указано)'}
								</Descriptions.Item>
								<Descriptions.Item label="Предпочитаю игры следующей сложности">
									{candidate.Profile['Preferred Difficulty Levels']
										? candidate.Profile['Preferred Difficulty Levels'].join(', ')
										: '(не указано)'}
								</Descriptions.Item>
							</Descriptions>
						</>
					)}
				</Spin>
			</Modal>
		</>
	)
}

export default ProjectCandidatePreviewModal
