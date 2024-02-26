import { Fragment, useMemo } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import { LecturerRequest } from '@prisma/client'
import { T } from '@tolgee/react'
import { Avatar, Button, Card, Space } from 'antd'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { LectureDetails } from '.'

export const ReadyContent = ({ lecture }: { lecture: LectureDetails }) => {
	const router = useRouter()
	const { data: session } = useSession()
	const lecturer = useMemo(
		() => lecture.lecturerRequests.find((r: LecturerRequest) => r.userId == session?.user.id),
		[lecture]
	)
	const userIsRegistered = useMemo(() => lecture.listeners.find((r) => r.userId == session?.user.id), [lecture])

	const lectureAvatar = () => {
		const image = lecturer?.user.image
		return image ? <Avatar shape="square" size={64} src={image} /> : null
	}

	return (
		<>
			<h2>{lecture.name}</h2>
			<div className="lecture-date">
				<T>When</T>: {!!lecturer?.date && dayjs(lecturer.date).format('dd LLL YYYY, hh:mm')} (<T>online</T>)
			</div>
			<div style={{ marginTop: 16 }}>
				<T>What will happen</T>:
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
											<Fragment key={s.Name}>
												{s.Name} ({s.Level})
												<br />
											</Fragment>
										))
									) : (
										<T>Community member</T>
									)}
								</>
							}
						/>
					</Card>
				</>
			)}

			{!!lecturer?.linkToStream && userIsRegistered && (
				<Space wrap direction="vertical">
					<Link href={lecturer.linkToStream} target="_blank">
						<Button type="primary" style={{ marginTop: 16 }}>
							<T>Link to stream</T>
						</Button>
					</Link>
					<small>
						<T>Follow this link before the lecture</T>
					</small>
				</Space>
			)}
		</>
	)
}
