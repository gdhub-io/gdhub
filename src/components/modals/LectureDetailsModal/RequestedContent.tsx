import { Fragment } from 'react'
import { Lecture, Speciality, User } from '@prisma/client'
import { Avatar, Card } from 'antd'

export const RequestedContent = ({
	lecture,
}: {
	lecture: Lecture & { lecturer: User & { specialities: Speciality[] } }
}) => {
	const lectureAvatar = () => {
		return lecture.lecturer.image ? <Avatar shape="square" size={64} src={lecture.lecturer.image} /> : null
	}

	return (
		<>
			<small>Тема</small>
			<h2>{lecture.name}</h2>
			<small style={{ marginTop: 16 }}>
				{lecture.stage == 'Proposed' ? 'Лектор предлагает:' : 'Автора запроса интересует:'}
			</small>
			<div className="lecture-description">{lecture.stage == 'Proposed' ? lecture.description : lecture.wishes}</div>

			{!!lecture.lecturer && (
				<>
					<div style={{ marginTop: 16 }}>Лектор:</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecture.lecturer.name}
							description={
								<>
									{lecture.lecturer.specialities
										? lecture.lecturer.specialities.map((s: Speciality) => (
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
