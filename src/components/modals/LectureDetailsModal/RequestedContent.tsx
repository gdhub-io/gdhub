import { Fragment, useMemo } from 'react'
import { Lecture, LecturerRequest, Speciality, User } from '@prisma/client'
import { Avatar, Card } from 'antd'
import { useSession } from 'next-auth/react'

export const RequestedContent = ({
	lecture,
}: {
	lecture: Lecture & { lecturerRequests: (LecturerRequest & { user: User & { specialities: Speciality[] } })[] }
}) => {
	const { data: session } = useSession()
	const lecturer = useMemo(() => lecture.lecturerRequests.find((r) => r.userId == session?.user.id), [lecture])

	const lectureAvatar = () => {
		return lecturer?.user.image ? <Avatar shape="square" size={64} src={lecturer.user.image} /> : null
	}

	return (
		<>
			<small>Тема</small>
			<h2>{lecture.name}</h2>
			<small style={{ marginTop: 16 }}>
				{lecture.stage == 'Proposed' ? 'Лектор предлагает:' : 'Автора запроса интересует:'}
			</small>
			<div className="lecture-description">{lecture.stage == 'Proposed' ? lecture.description : lecture.wishes}</div>

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
										? lecturer.user.specialities.map((s: Speciality) => (
												<Fragment key={s.name}>
													{s.name} ({s.level})
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
		</>
	)
}
