import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { pipLayout } from '@/config/daily'
import { fetcher } from '@/helpers/fetcher'
import { hasRole } from '@/helpers/user'
import { ProtectedLayout } from '@/layouts/ProtectedLayout'
import DailyIframe, { DailyCall, DailyCallOptions } from '@daily-co/daily-js'
import { Button, Form, Input, Space, message } from 'antd'
import { useSession } from 'next-auth/react'
import useSWR from 'swr'
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

	const { data, isLoading, mutate } = useSWR({ url: '/api/live/get-token', data: { roomName: 'reports' } }, fetcher, {
		evalidateIfStale: false,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		onSuccess: ({ token }) => {
			createCall({ token })
		},
	})

	useEffect(() => {
		console.log('data', data)
	}, [])

	const createCall = useCallback(
		async ({ token }: any) => {
			console.log('start', callRef?.current, token)

			if (!callRef?.current || !token) return

			if (callFrame) {
				console.log('callFrame already set', callRef?.current, callFrame)
				return
			}

			let newCallFrame: DailyCall = DailyIframe.createFrame(callRef?.current, {
				strictMode: true,
				...dailyCallOptions,
				token,
			})

			setCallFrame(newCallFrame)

			newCallFrame.setTheme({
				colors: {
					accent: '#1BEBB9',
					accentText: '#121A24',
					background: '#121A24',
					backgroundAccent: '#1F2D3D',
					baseText: '#FFFFFF',
					border: '#2B3F56',
					mainAreaBg: '#121A24',
					mainAreaBgAccent: '#2B3F56',
					mainAreaText: '#FFFFFF',
					supportiveText: '#C8D1DC',
				},
			})

			newCallFrame.on('joined-meeting', () => joinedMeeting())
			newCallFrame.on('left-meeting', () => leaveCall(newCallFrame))
			newCallFrame.on('live-streaming-started', () => message.info('Live streaming started'))
			newCallFrame.on('live-streaming-stopped', () => message.info('Live streaming stopped'))

			console.log('createAndJoinCall', callRef?.current, newCallFrame)

			await newCallFrame.join({ url: `https://gdhub.daily.co/reports` })
		},
		[callRef, callFrame]
	)

	// useEffect(() => {
	// 	if (callFrame) return

	// 	createAndJoinCall()
	// }, [callFrame, data, createAndJoinCall])

	const leaveCall = async (_callFrame: DailyCall) => {
		await _callFrame.destroy()
		await mutate()

		setCallFrame(undefined)
		setMeetingStarted(false)

		console.log('left room')

		if (data?.token) createCall({ token: data.token })
	}

	const joinedMeeting = () => {
		console.log('joined')
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

	if (!data && !isLoading) {
		return <p>No access</p>
	}

	return (
		<main className="container">
			{hasRole('admin', { data: session }) && (
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

LiveReportsPage.getLayout = (page: any) => <ProtectedLayout>{page}</ProtectedLayout>

export default LiveReportsPage
