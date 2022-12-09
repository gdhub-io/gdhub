import { Fragment, useEffect, useState } from 'react'
import { Grid, message, Modal, Spin } from 'antd'
import { ReadyContent } from './ReadyContent'
import { RequestedContent } from './RequestedContent'
import styles from './style.module.less'

const LectureDetailsModal = ({ lectureId, open, onCancel }: any) => {
	const screens = Grid.useBreakpoint()
	const [processing, setProcessing] = useState(true)
	const [lecture, setLecture] = useState<any>()
	const [isReady, setIsReady] = useState(false)
	const [userIsRegistered, setUserIsRegistered] = useState(false)

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
			setIsReady(data.Status == 'Ready')
			setUserIsRegistered(data.userRegistered)
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

			if (!data.newRegistration || userIsRegistered) {
				message.info('Вы уже зарегистрированы на эту лекцию')
				setProcessing(false)
				return
			}

			setProcessing(false)
			setUserIsRegistered(true)
			message.success('Регистрация прошла успешно')
		} catch (error: any) {
			message.error(error.message)
			setProcessing(false)
		}
	}

	const handleCancel = () => {
		setLecture(null)
		setIsReady(false)
		onCancel()
	}

	const okText = () => {
		if (!lecture) return null

		if (['Ready'].includes(lecture.Status)) {
			return userIsRegistered ? 'Вы уже зарегистрированы' : 'Регистрация на лекцию'
		}

		return null
	}

	const modalTitle = () => {
		const defaultTitle = 'Информация о лекции'

		if (!lecture) return defaultTitle

		if (['Requested', 'Actualized'].includes(lecture.Status)) {
			return 'Информация о запросе лекции'
		}

		if (['Proposed'].includes(lecture.Status)) {
			return 'Информация о предложении лекции'
		}

		return defaultTitle
	}

	return (
		<Modal
			className={styles.container}
			centered
			title={modalTitle()}
			destroyOnClose
			width={600}
			maskClosable={true}
			cancelText="Закрыть"
			okText={okText()}
			okButtonProps={{ disabled: lecture?.userRegistered }}
			open={open}
			onOk={handleOk}
			footer={isReady ? undefined : null}
			onCancel={handleCancel}
			confirmLoading={processing}
		>
			<Spin spinning={processing}>
				{!!lecture && (
					<>
						{['Requested', 'Proposed', 'Actualized'].includes(lecture.Status) ? (
							<RequestedContent lecture={lecture} />
						) : (
							<ReadyContent lecture={lecture} userIsRegistered={userIsRegistered} />
						)}
					</>
				)}
			</Spin>
		</Modal>
	)
}

export default LectureDetailsModal
