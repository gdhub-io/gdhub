import { Fragment, useMemo } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import { LecturerRequest } from '@prisma/client'
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
				Когда: {!!lecturer?.date && dayjs(lecturer.date).format('dd LLL YYYY, hh:mm')} (онлайн)
			</div>
			<div style={{ marginTop: 16 }}>Что будет:</div>
			<div className="lecture-description">
				<TextWithLineBreak text={lecturer?.curriculum} />
			</div>

			{!!lecturer && (
				<>
					<div style={{ marginTop: 16 }}>Лектор:</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecturer.user.name}
							description={
								<>
									{lecturer.user.specialities
										? lecturer.user.specialities.map((s: any) => (
												<Fragment key={s.Name}>
													{s.Name} ({s.Level})
													<br />
												</Fragment>
										  ))
										: 'Участник сообщества'}
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
							Ссылка на стрим
						</Button>
					</Link>
					<small>Переходите по этой ссылке перед началом лекции</small>
				</Space>
			)}
		</>
	)
}
