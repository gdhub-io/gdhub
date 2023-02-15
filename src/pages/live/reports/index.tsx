import { useEffect, useRef, useState } from 'react'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { StreamLayout } from '@layouts/StreamLayout'
import DailyIframe, { DailyCall, DailyCallOptions } from '@daily-co/daily-js'
import { Button } from 'antd'
import { useSession } from 'next-auth/react'
import useSWRMutation from 'swr/mutation'
import styles from './style.module.less'
import { fetherForMutation } from '@helpers/fetcher'

const CALL_OPTIONS: DailyCallOptions = {
	showLeaveButton: true,
	showFullscreenButton: true,
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
	const callRef = useRef(null)
	const [callFrame, setCallFrame] = useState<DailyCall>()

	const { trigger: getUserToken } = useSWRMutation('/api/live/get-token', fetherForMutation)

	useEffect(() => {
		if (session) createAndJoinCall()
	}, [callFrame, session])

	const createAndJoinCall = async () => {
		let newCallFrame = callFrame

		if (!callRef?.current) return

		if (!newCallFrame) {
			const { token } = await getUserToken({ roomName: 'reports' })

			newCallFrame = DailyIframe.createFrame(callRef?.current, {
				...CALL_OPTIONS,
				customLayout: true,
				token: token,
			})

			setCallFrame(newCallFrame)
		}

		await newCallFrame.join({ url: 'https://gdhub.daily.co/reports' })

		const leaveCall = () => {
			callFrame?.destroy()
			setCallFrame(undefined)
		}

		newCallFrame.on('left-meeting', leaveCall)
	}

	const startLiveStream = async () => {
		callFrame?.startLiveStreaming({
			instanceId: 'gamelab-reports',
			rtmpUrl: [
				'rtmp://a.rtmp.youtube.com/live2/md5j-3cg8-w8gj-9ze8-cxp0',
				'rtmp://b.rtmp.youtube.com/live2/md5j-3cg8-w8gj-9ze8-cxp0?backup=1',
			],
			width: 1920,
			height: 1080,
		})
	}

	const stopLiveStream = async () => {
		callFrame?.stopLiveStreaming({ instanceId: 'gamelab-reports' })
	}

	return (
		<main className="container">
			<Button onClick={startLiveStream}>Начать стрим</Button>
			<Button onClick={stopLiveStream}>Закончить стрим</Button>
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
