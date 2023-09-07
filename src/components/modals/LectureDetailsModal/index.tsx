import { Fragment, useEffect, useState } from 'react'
import {
	Lecture,
	LectureListener,
	LectureStage,
	LecturerRequest,
	Speciality,
	User,
	WorkDirection,
} from '@prisma/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Grid, message, Modal, Spin } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { HeldContent } from './HeldContent'
import { ReadyContent } from './ReadyContent'
import { RequestedContent } from './RequestedContent'
import styles from './style.module.scss'

export type LectureDetails = Lecture & {
	lecturerRequests: (LecturerRequest & { user: User & { specialities: Speciality[] } })[]
	listeners: LectureListener[]
	direction: WorkDirection
}

const LectureDetailsModal = ({ lectureId, open, onCancel }: any) => {
	const screens = Grid.useBreakpoint()
	const { data: session } = useSession()
	// const [processing, setProcessing] = useState(true)
	// const [lecture, setLecture] = useState<any>()
	const [isReady, setIsReady] = useState(false)
	const [userIsRegistered, setUserIsRegistered] = useState(false)

	const {
		data: lecture,
		isLoading: processing,
		refetch,
	} = useQuery(['lecture-data', lectureId], () => axios.get<LectureDetails>(`/api/user/lecture/${lectureId}/show`), {
		enabled: false,
		onSuccess(data) {
			setIsReady(true)
			setUserIsRegistered(!!data.data.listeners.find((l) => l.listenerId == session?.user.id))
		},
	})
	const { mutateAsync: registrationToLecture, isLoading: registrationProcessing } = useMutation(
		(params: { lectureId: string }) => axios.post<any>(`/api/user/lecture/${lectureId}/registration`)
	)

	useEffect(() => {
		if (open && lectureId) {
			refetch()
		}
	}, [open])

	const handleOk = async () => {
		try {
			const data = await registrationToLecture({ lectureId })

			// if (!data.newRegistration || userIsRegistered) {
			// 	message.info('Вы уже зарегистрированы на эту лекцию')
			// 	return
			// }

			setUserIsRegistered(true)
			message.success('Регистрация прошла успешно')
		} catch (error: any) {
			message.error(error.message)
		}
	}

	const handleCancel = () => {
		setIsReady(false)
		onCancel()
	}

	const okText = () => {
		if (!lecture?.data) return null

		if (lecture.data.stage == LectureStage.Ready) {
			return userIsRegistered ? 'Вы уже зарегистрированы' : 'Регистрация на лекцию'
		}

		return null
	}

	const modalTitle = () => {
		const defaultTitle = 'Информация о лекции'

		if (!lecture?.data) return defaultTitle

		if (['Requested', 'Actualized'].includes(lecture.data.stage)) {
			return 'Информация о запросе лекции'
		}

		if (['Proposed'].includes(lecture.data.stage)) {
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
			// okButtonProps={{ disabled: lecture?.userRegistered }}
			open={open}
			onOk={handleOk}
			footer={isReady ? undefined : null}
			onCancel={handleCancel}
			confirmLoading={registrationProcessing}
		>
			<Spin spinning={processing}>
				{!!lecture && (
					<>
						{[
							LectureStage.Requested as string,
							LectureStage.Proposed as string,
							LectureStage.Actualized as string,
						].includes(lecture.data.stage) && <RequestedContent lecture={lecture.data} />}
						{lecture.data.stage == LectureStage.Ready && <ReadyContent lecture={lecture.data} />}
						{lecture.data.stage == LectureStage.Held && <HeldContent lecture={lecture.data} />}
					</>
				)}
			</Spin>
		</Modal>
	)
}

export default LectureDetailsModal
