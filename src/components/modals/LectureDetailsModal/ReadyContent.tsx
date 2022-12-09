import { Fragment } from 'react'
import { Avatar, Button, Card, Space } from 'antd'
import { DateTime } from 'luxon'
import Link from 'next/link'
import { useRouter } from 'next/router'

export const ReadyContent = ({ lecture }: any) => {
	const router = useRouter()

	const lectureAvatar = () => {
		const [image] = lecture.Lecturer['Image Link (from Account)']
		return image ? <Avatar shape="square" size={64} src={image} /> : null
	}

	return (
		<>
			<h2>{lecture.Name}</h2>
			<div className="lecture-date">
				Когда:{' '}
				{DateTime.fromISO(lecture['Date']).toFormat('dd LLL yyyy, t', {
					locale: router.locale,
				})}{' '}
				(онлайн)
			</div>
			<div style={{ marginTop: 16 }}>Что будет:</div>
			<div className="lecture-description">{lecture.Description}</div>

			{!!lecture.Lecturer && (
				<>
					<div style={{ marginTop: 16 }}>Лектор:</div>
					<Card style={{ marginTop: 8 }}>
						<Card.Meta
							avatar={lectureAvatar()}
							title={lecture.Lecturer.Name}
							description={
								<>
									{lecture.Lecturer.Specialities.map((s: any) => (
										<Fragment key={s.Name}>
											{s.Name} ({s.Level})
											<br />
										</Fragment>
									))}
								</>
							}
						/>
					</Card>
				</>
			)}

			<div style={{ marginTop: 16 }}>Стоимость: бесплатно</div>
			{!!lecture.Link && lecture.userRegistered && (
				<Space wrap direction="vertical">
					<Link href={lecture.Link} target="_blank">
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
