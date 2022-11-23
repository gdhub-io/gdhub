import { Fragment, useEffect, useState } from 'react'
import { Avatar, Button, Card, message, Modal, Space, Spin } from 'antd'
import { DateTime } from 'luxon'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './style.module.less'

const LectureDetailsModal = ({ lectureId, onOk, open, onCancel }: any) => {
	const router = useRouter()
	const { data: session } = useSession()
	const [processing, setProcessing] = useState(true)
	const [lecture, setLecture] = useState<any>()

	useEffect(() => {
		if (open && lectureId) {
			getLecture(lectureId)
		}
	}, [open])

	const getLecture = async (lectureId: string) => {
		try {
			setProcessing(true)

			const response: any = await fetch('/api/lecture/show', {
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: lectureId,
				}),
			})

			if (response.error) {
				throw new Error(response.error.message)
			}

			const data = await response.json()

			setLecture(data)
			setProcessing(false)
		} catch (error: any) {
			message.error(error.message)
			setProcessing(false)
		}
	}

	const handleOk = async () => {
		try {
			setProcessing(true)

			const response: any = await fetch('/api/lecture/registration', {
				method: 'post',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: lectureId,
				}),
			})

			if (!response.ok || response.error) {
				throw new Error(response.error || 'Something wrong')
			}

			const data = await response.json()

			if (!data.newRegistration) {
				message.info('Вы уже зарегистрированы на эту лекцию')
				setProcessing(false)
			} else {
				// send message
				onOk()
			}
		} catch (error: any) {
			message.error(error.message)
			setProcessing(false)
		}
	}

	const handleCancel = () => {
		setLecture(null)
		onCancel()
	}

	return (
		<Modal
			className={styles.container}
			centered
			title="Информация о лекции"
			destroyOnClose
			width={600}
			maskClosable={false}
			cancelText="Закрыть"
			okText={lecture?.userRegistered ? 'Вы уже зарегистрированы' : 'Регистрация на лекцию'}
			okButtonProps={{ disabled: lecture?.userRegistered }}
			open={open}
			onOk={handleOk}
			onCancel={handleCancel}
			confirmLoading={processing}
		>
			<Spin spinning={processing}>
				{!!lecture && (
					<>
						<h2>{lecture.Name}</h2>
						<div className="lecture-date">
							Когда:{' '}
							{DateTime.fromISO(lecture['Date']).toFormat('dd LLL yyyy, t', {
								locale: router.locale,
							})}{' '}
							(онлайн)
						</div>
						<div style={{ marginTop: 16 }}>Что будет:</div>
						<div className="lecture-description">{lecture.Description}</div>

						<div style={{ marginTop: 16 }}>Лектор:</div>
						<Card style={{ marginTop: 8 }}>
							<Card.Meta
								avatar={<Avatar shape="square" size={64} src={lecture.Lecturer['Image Link (from Account)'][0]} />}
								title={lecture.Lecturer.Name}
								description={
									<>
										{lecture.Lecturer.Specialities.map((s: any) => (
											<Fragment key={s.Name}>
												{s.Name} ({s.Level})
												<br />
											</Fragment>
										))}
									</>
								}
							/>
						</Card>
						<div style={{ marginTop: 16 }}>Стоимость: бесплатно</div>
						{!!lecture.Link && lecture.userRegistered && (
							<Space wrap direction="vertical">
								<Link href={lecture.Link} target="_blank">
									<Button type="primary" style={{ marginTop: 16 }}>
										Ссылка на стрим
									</Button>
								</Link>
								<small>Переходите по этой ссылке перед началом лекции</small>
							</Space>
						)}
					</>
				)}
			</Spin>
		</Modal>
	)
}

export default LectureDetailsModal
