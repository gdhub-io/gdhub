import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pipLayout } from '@/config/daily'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import { StreamLayout } from '@/layouts/StreamLayout'
import DailyIframe, { DailyCall, DailyCallOptions } from '@daily-co/daily-js'
import { UserRole } from '@prisma/client'
import { useMutation } from '@tanstack/react-query'
import { Button, Form, Input, Space, message } from 'antd'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { v4 as uuidv4 } from 'uuid'
import styles from './style.module.scss'

const dailyCallOptions: DailyCallOptions = {
	showLeaveButton: true,
	showFullscreenButton: true,
	showParticipantsBar: true,
	iframeStyle: {
		height: '100%',
		width: '100%',
		minWidth: '400px',
		border: '0',
		borderRadius: '12px',
	},
}

const LiveReportsPage = () => {
	const { data: session } = useSession()
	const uuid = uuidv4()
	const callRef = useRef(null)
	const [form] = Form.useForm()
	const [callFrame, setCallFrame] = useState<DailyCall>()
	const [instanceId, setInstanceId] = useState<string>()
	const [rtmpUrl, setrtmpUrl] = useState<string>('rtmp://a.rtmp.youtube.com/live2')
	const [streamKey, setStreamKey] = useState<string>('rmv8-528k-updh-kf1r-1hx8')
	const [meetingStarted, setMeetingStarted] = useState(false)

	const { mutateAsync: getUserToken } = useMutation((data: { roomName: string }) =>
		axios.get<{ token: string }>('/api/live/token', { params: data })
	)

	useEffect(() => {
		if (session) createAndJoinCall()
	}, [session])

	const createAndJoinCall = async () => {
		try {
			if (!callRef?.current) return

			if (callFrame) {
				await callFrame.destroy()
			}

			console.log('createAndJoinCall', callRef?.current, callFrame)

			const {
				data: { token },
			} = await getUserToken({ roomName: 'reports' })

			let newCallFrame: DailyCall = DailyIframe.createFrame(callRef?.current, {
				...dailyCallOptions,
				token: token,
			})

			setCallFrame(newCallFrame)

			newCallFrame.on('joined-meeting', joinedMeeting)
			newCallFrame.on('left-meeting', () => leaveCall(newCallFrame))

			await newCallFrame.join({ url: `https://gdhub.daily.co/reports` })
		} catch (error: any) {
			message.error(error.message)
			console.error(error)
		}
	}

	const leaveCall = async (_callFrame: DailyCall) => {
		await _callFrame.destroy()
		setCallFrame(undefined)
		setMeetingStarted(false)
	}

	const joinedMeeting = () => {
		setMeetingStarted(true)
	}

	const startLiveStream = async () => {
		const formValidated = await form.validateFields()

		if (!formValidated || !callFrame) return

		callFrame.startLiveStreaming({
			instanceId: uuid,
			rtmpUrl: [`${rtmpUrl}/${streamKey}`],
			width: 1920,
			height: 1080,
			layout: pipLayout,
		})

		setInstanceId(uuid)
	}

	const stopLiveStream = async () => {
		if (instanceId) {
			callFrame?.stopLiveStreaming({ instanceId: instanceId })
		} else {
			callFrame?.stopLiveStreaming()
		}

		setInstanceId(undefined)
	}

	const readyToStream = useMemo(() => {
		return !!rtmpUrl && !!streamKey && meetingStarted
	}, [rtmpUrl, streamKey, meetingStarted])

	return (
		<main className="container">
			{session?.user.roles.includes(UserRole.Admin) && (
				<Space align="start">
					{!instanceId ? (
						<Button onClick={startLiveStream} disabled={!readyToStream} type="primary">
							Начать стрим
						</Button>
					) : (
						<Button onClick={stopLiveStream}>Закончить стрим</Button>
					)}
					<Form
						form={form}
						layout="inline"
						validateMessages={{ required: 'This field is required' }}
						initialValues={{ rtmpUrl, streamKey }}
					>
						<Form.Item name="rtmpUrl" rules={[{ required: true }]}>
							<Input placeholder="Rtml Url" htmlSize={40} onChange={(e) => setrtmpUrl(e.target.value)} />
						</Form.Item>
						<Form.Item name="streamKey" rules={[{ required: true }]}>
							<Input placeholder="Stream Key" htmlSize={30} onChange={(e) => setStreamKey(e.target.value)} />
						</Form.Item>
					</Form>
				</Space>
			)}

			<div ref={callRef} className={styles.callFrame} />
		</main>
	)
}

LiveReportsPage.getLayout = (page: any) => (
	<ProtectedLayout>
		<StreamLayout>{page}</StreamLayout>
	</ProtectedLayout>
)

export default LiveReportsPage
