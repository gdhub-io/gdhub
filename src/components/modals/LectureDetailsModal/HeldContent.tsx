import { Fragment, useMemo } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { T } from '@tolgee/react'
import { Alert, Avatar, Card } from 'antd'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import YouTube from 'react-youtube'
import styles from './style.module.scss'

export const HeldContent = ({
	lecture,
}: {
	lecture: prismaClient.Lecture & {
		lecturerRequests: (prismaClient.LecturerRequest & {
			user: prismaClient.User & { specialities: prismaClient.Speciality[] }
		})[]
	}
}) => {
	const router = useRouter()
	const { data: session } = useSession()
	const lecturer = useMemo(() => lecture.lecturerRequests?.find((r) => r.isSpeaker == true), [lecture])

	const lectureAvatar = () => {
		const image = lecturer?.user.image
		return image ? <Avatar shape="square" size={64} src={image} /> : null
	}

	return (
		<>
			{lecture.recordLink ? (
				<YouTube
					className={styles.videoCover}
					videoId={lecture.recordLink}
					opts={{ playerVars: { disablekb: 1, autoplay: 0 } }}
				/>
			) : (
				<Alert type="warning" message={<T>No video yet</T>} style={{ marginBottom: 16 }} />
			)}
			<h2>{lecture.name}</h2>
			<div className="lecture-date">
				<T>Passed</T>: {!!lecture?.date ? dayjs(lecture.date).format('lll') : null}
			</div>
			<div style={{ marginTop: 16 }}>
				<T>Contents of the lecture</T>:
			</div>
			<div className="lecture-description">
				<TextWithLineBreak text={lecturer?.curriculum} />
			</div>

			{!!lecturer && (
				<>
					<div style={{ marginTop: 16 }}>
						<T>Lecturer</T>:
					</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecturer.user.name}
							description={
								<>
									{lecturer.user.specialities ? (
										lecturer.user.specialities.map((s: any) => (
											<Fragment key={s.name}>
												{s.name} ({s.level})
												<br />
											</Fragment>
										))
									) : (
										<T keyName="communityMember">Community Member</T>
									)}
								</>
							}
						/>
					</Card>
				</>
			)}
		</>
	)
}
