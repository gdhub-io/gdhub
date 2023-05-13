import { Fragment } from 'react'
import { Alert, Avatar, Card } from 'antd'
import { DateTime } from 'luxon'
import { useRouter } from 'next/router'
import YouTube from 'react-youtube'
import styles from './style.module.scss'

export const HeldContent = ({ lecture, userIsRegistered }: any) => {
	const router = useRouter()

	const lectureAvatar = () => {
		const [image] = lecture.Lecturer['Image Link (from Account)']
		return image ? <Avatar shape="square" size={64} src={image} /> : null
	}

	return (
		<>
			{lecture['Youtube Video ID']?.length > 0 ? (
				<YouTube
					className={styles.videoCover}
					videoId={lecture['Youtube Video ID']}
					opts={{ playerVars: { disablekb: 1, autoplay: 0 } }}
				/>
			) : (
				<Alert type="warning" message="Видеозаписи еще нет" style={{ marginBottom: 16 }} />
			)}
			<h2>{lecture.Name}</h2>
			<div className="lecture-date">
				Прошло:{' '}
				{DateTime.fromISO(lecture['Date']).toFormat('dd LLL yyyy', {
					locale: router.locale,
				})}
			</div>
			<div style={{ marginTop: 16 }}>Содержание лекции:</div>
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
