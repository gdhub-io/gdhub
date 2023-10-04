import { Fragment } from 'react'
import { TextWithLineBreak } from '@/components/TextWithLineBreak'
import { Avatar, Card } from 'antd'

export const RequestedContent = ({ lecture }: any) => {
	const lectureAvatar = () => {
		const [image] = lecture.Lecturer['Image Link (from Account)']
		return image ? <Avatar shape="square" size={64} src={image} /> : null
	}

	return (
		<>
			<small>Тема</small>
			<h2>{lecture.Name}</h2>
			<small style={{ marginTop: 16 }}>
				{lecture.Status == 'Proposed' ? 'Лектор предлагает:' : 'Автора запроса интересует:'}
			</small>
			<div className="lecture-description">
				{lecture.Status == 'Proposed' ? (
					<TextWithLineBreak text={lecture.Description} />
				) : (
					<TextWithLineBreak text={lecture.Wishes} />
				)}
			</div>

			{!!lecture.Lecturer && (
				<>
					<div style={{ marginTop: 16 }}>Лектор:</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecture.Lecturer.Name}
							description={
								<>
									{lecture.Lecturer.Specialities
										? lecture.Lecturer.Specialities.map((s: any) => (
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
		</>
	)
}
