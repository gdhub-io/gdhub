import { useEffect, useState } from 'react'
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
import { T, useTolgee } from '@tolgee/react'
import { message, Modal, Spin } from 'antd'
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
	const { data: session } = useSession()
	const { t } = useTolgee()
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
			setUserIsRegistered(!!data.data.listeners.find((l) => l.userId == session?.user.id))
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
			// message.info(<T>You are already registered for this lecture</T>)
			// 	return
			// }

			setUserIsRegistered(true)
			message.success(<T>Registration successful</T>)
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
			return userIsRegistered ? <T>You are already registered</T> : <T>Registration for the lecture</T>
		}

		return null
	}

	const modalTitle = () => {
		const defaultTitle = <T>Lecture Information</T>

		if (!lecture?.data) return defaultTitle

		if (['Requested', 'Actualized'].includes(lecture.data.stage)) {
			return <T>Lecture Request Information</T>
		}

		if (['Proposed'].includes(lecture.data.stage)) {
			return <T>Lecture Proposal Information</T>
		}

		return defaultTitle
	}

	return (
		<Modal
			className={styles.container}
			centered
			title={modalTitle()}
			destroyOnClose
			width="90vw"
			maskClosable={true}
			cancelText={<T>Close</T>}
			okText={okText()}
			okButtonProps={{ hidden: lecture?.data.stage !== LectureStage.Ready }}
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
