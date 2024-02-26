import { Fragment, useMemo } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import { Lecture, LecturerRequest, Speciality, User } from '@prisma/client'
import { T } from '@tolgee/react'
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
			<small>
				<T>Theme</T>
			</small>
			<h2>{lecture.name}</h2>
			<small style={{ marginTop: 16 }}>
				{lecture.stage == 'Proposed'
					? <T>The lecturer offers</T> + ':'
					: <T>The author of the request is interested</T> + ':'}
			</small>
			<div className="lecture-description">
				<TextWithLineBreak text={lecture.stage == 'Proposed' ? lecturer?.curriculum : lecture.wishes} />
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
										lecturer.user.specialities.map((s: Speciality) => (
											<Fragment key={s.name}>
												{s.name} ({s.level})
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
		</>
	)
}
