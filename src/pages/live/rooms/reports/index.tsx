import { useEffect, useRef, useState } from 'react'
import { fetherForMutation } from '@helpers/fetcher'
import { ProtectedLayout } from '@layouts/ProtectedLayout'
import { StreamLayout } from '@layouts/StreamLayout'
import DailyIframe, { DailyCall, DailyCallOptions } from '@daily-co/daily-js'
import { Button, Space } from 'antd'
import { useSession } from 'next-auth/react'
import useSWRMutation from 'swr/mutation'
import { v4 as uuidv4 } from 'uuid'
import styles from './style.module.less'

const CALL_OPTIONS: DailyCallOptions = {
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
	const callRef = useRef(null)
	const [callFrame, setCallFrame] = useState<DailyCall>()
	const [instanceId, setInstanceId] = useState<string>()

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
		const uuid = uuidv4()
		setInstanceId(uuid)

		callFrame?.startLiveStreaming({
			instanceId: uuid,
			rtmpUrl: [
				'rtmp://a.rtmp.youtube.com/live2/rmv8-528k-updh-kf1r-1hx8',
				'rtmp://b.rtmp.youtube.com/live2/rmv8-528k-updh-kf1r-1hx8?backup=1',
			],
			width: 1920,
			height: 1080,
			layout: {
				composition_id: 'daily:baseline',
				preset: 'custom',
				composition_params: {
					mode: 'pip',
					showTextOverlay: false,
					showImageOverlay: false,
					showTitleSlate: false,
					enableAutoOpeningSlate: true,
					'videoSettings.maxCamStreams': 25,
					'videoSettings.preferScreenshare': true,
					'videoSettings.omitPaused': false,
					'videoSettings.omitAudioOnly': false,
					'videoSettings.omitExtraScreenshares': true,
					'videoSettings.showParticipantLabels': false,
					'videoSettings.roundedCorners': true,
					'videoSettings.cornerRadius_gu': 1,
					'videoSettings.scaleMode': 'fill',
					'videoSettings.scaleModeForScreenshare': 'fit',
					'videoSettings.placeholder.bgColor': 'rgb(0, 50, 80)',
					'videoSettings.highlight.color': 'rgb(255, 255, 255)',
					'videoSettings.highlight.stroke_gu': 0.2,
					'videoSettings.split.margin_gu': 0,
					'videoSettings.split.direction': 'auto-by-viewport',
					'videoSettings.grid.useDominantForSharing': false,
					'videoSettings.grid.itemInterval_gu': -1,
					'videoSettings.grid.outerPadding_gu': -1,
					'videoSettings.grid.highlightDominant': true,
					'videoSettings.grid.preserveAspectRatio': true,
					'videoSettings.dominant.position': 'left',
					'videoSettings.dominant.splitPos': 0.8,
					'videoSettings.dominant.numChiclets': 5,
					'videoSettings.dominant.followDomFlag': true,
					'videoSettings.dominant.itemInterval_gu': 0.7,
					'videoSettings.dominant.outerPadding_gu': 0.5,
					'videoSettings.dominant.splitMargin_gu': 0,
					'videoSettings.dominant.sharpCornersOnMain': true,
					'videoSettings.pip.position': 'top-right',
					'videoSettings.pip.aspectRatio': 1,
					'videoSettings.pip.height_gu': 12,
					'videoSettings.pip.margin_gu': 1.5,
					'videoSettings.pip.followDomFlag': false,
					'videoSettings.pip.sharpCornersOnMain': true,
					'videoSettings.labels.fontFamily': 'Roboto',
					'videoSettings.labels.fontWeight': '600',
					'videoSettings.labels.fontSize_pct': 100,
					'videoSettings.labels.offset_x_gu': 0,
					'videoSettings.labels.offset_y_gu': 0,
					'videoSettings.labels.color': 'white',
					'videoSettings.labels.strokeColor': 'rgba(0, 0, 0, 0.9)',
					'videoSettings.margin.left_gu': 1,
					'videoSettings.margin.right_gu': 1,
					'videoSettings.margin.top_gu': 1,
					'videoSettings.margin.bottom_gu': 1,
					'text.content': 'An example text overlay',
					'text.align_horizontal': 'center',
					'text.align_vertical': 'center',
					'text.offset_x_gu': 0,
					'text.offset_y_gu': 0,
					'text.rotation_deg': 0,
					'text.fontFamily': 'Roboto',
					'text.fontWeight': '400',
					'text.fontSize_gu': 2.5,
					'text.color': 'rgba(255, 250, 200, 0.95)',
					'text.strokeColor': 'rgba(0, 0, 0, 0.8)',
					'image.assetName': 'overlay.png',
					'image.position': 'top-right',
					'image.fullScreen': false,
					'image.aspectRatio': 1.778,
					'image.height_gu': 12,
					'image.margin_gu': 1.5,
					'image.opacity': 1,
					'image.enableFade': true,
					'webFrame.keyPress.keyName': 'ArrowRight',
					'webFrame.keyPress.key': 0,
					'toast.key': 0,
					'toast.text': 'Hello world',
					'toast.duration_secs': 4,
					'toast.numTextLines': 2,
					'toast.showIcon': true,
					'toast.color': 'rgba(15, 50, 110, 0.6)',
					'toast.strokeColor': 'rgba(0, 0, 30, 0.44)',
					'toast.text.color': 'white',
					'toast.text.fontFamily': 'Roboto',
					'toast.text.fontWeight': '500',
					'toast.text.fontSize_pct': 100,
					'openingSlate.duration_secs': 4,
					'openingSlate.title': 'Welcome',
					'openingSlate.bgColor': 'rgba(0, 0, 0, 1)',
					'openingSlate.textColor': 'rgba(255, 255, 255, 1)',
					'openingSlate.fontFamily': 'Bitter',
					'openingSlate.fontWeight': '500',
					'openingSlate.fontSize_gu': 2.5,
					'openingSlate.subtitle.fontSize_pct': 75,
					'openingSlate.subtitle.fontWeight': '400',
					'titleSlate.title': 'Title slate',
					'titleSlate.subtitle': 'Subtitle',
					'titleSlate.bgColor': 'rgba(0, 0, 0, 1)',
					'titleSlate.textColor': 'rgba(255, 255, 255, 1)',
					'titleSlate.fontFamily': 'Bitter',
					'titleSlate.fontWeight': '500',
					'titleSlate.fontSize_gu': 2.5,
					'titleSlate.subtitle.fontSize_pct': 75,
					'titleSlate.subtitle.fontWeight': '400',
				},
			},
		})
	}

	const stopLiveStream = async () => {
		if (instanceId) {
			callFrame?.stopLiveStreaming({ instanceId: instanceId })
		} else {
			callFrame?.stopLiveStreaming()
		}
	}

	return (
		<main className="container">
			<Space>
				<Button onClick={startLiveStream}>Начать стрим</Button>
				<Button onClick={stopLiveStream}>Закончить стрим</Button>
			</Space>
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
