import { Fragment, useMemo } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useTranslate } from '@tolgee/react'
import { Avatar, Card } from 'antd'
import { useSession } from 'next-auth/react'

export const RequestedContent = ({
	lecture,
}: {
	lecture: prismaClient.Lecture & {
		lecturerRequests: (prismaClient.LecturerRequest & {
			user: prismaClient.User & { specialities: prismaClient.Speciality[] }
		})[]
	}
}) => {
	const { data: session } = useSession()
	const { t } = useTranslate()
	const lecturer = useMemo(() => lecture.lecturerRequests.find((r) => r.userId == session?.user.id), [lecture])

	const lectureAvatar = () => {
		return lecturer?.user.image ? <Avatar shape="square" size={64} src={lecturer.user.image} /> : null
	}

	return (
		<>
			<small>{t('modal.lecturedetails.theme', 'Theme')}</small>
			<h2>{lecture.name}</h2>
			<small style={{ marginTop: 16 }}>
				{lecture.stage == 'Proposed'
					? t('modal.lecturedetails.theLecturerOffers', 'The lecturer offers') + ':'
					: t('modal.lecturedetails.theAuthorOfTheRequestIsInterested', 'The author of the request is interested') +
						':'}
			</small>
			<div className="lecture-description">
				<TextWithLineBreak text={lecture.stage == 'Proposed' ? lecturer?.curriculum : lecture.wishes} />
			</div>

			{!!lecturer && (
				<>
					<div style={{ marginTop: 16 }}>{t('modal.lecturedetails.lecturer', 'Lecturer')}:</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecturer.user.name}
							description={
								<>
									{lecturer.user.specialities
										? lecturer.user.specialities.map((s: prismaClient.Speciality) => (
												<Fragment key={s.name}>
													{s.name} ({s.level})
													<br />
												</Fragment>
											))
										: t('modal.lecturedetails.communityMember', 'Community member')}
								</>
							}
						/>
					</Card>
				</>
			)}
		</>
	)
}
