import { useState } from 'react'
import { T, useTolgee } from '@tolgee/react'
import { Button, Card, Carousel, Grid, Typography } from 'antd'
import ReactNiceAvatar from 'react-nice-avatar'
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry'
import styles from './style.module.scss'

const { Title, Paragraph, Text } = Typography

const feedbackList = [
	{
		name: 'Vyacheslav',
		position: 'Game designer',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="man"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="thick"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `Currently I work at OpenMyGame as a Middle GameDesigner. I wanted to participate in the gamelab as a gd
		and pm to gain experience. Everything planned was a success. Met interesting people. Subsequently, this
		experience and the very fact of participating in such an event greatly helped in finding my first job as
		a CEO. I wish new participants good luck and patience.`,
	},
	{
		name: 'Caroline',
		position: 'Lead level designer',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="woman"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="round"
				hairStyle="womanLong"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `My main goals were to gain experience working on the game with a whole team, but after a couple of
		months it became clear that no one wanted to give up the game, and we continued to polish the demo
		version. As a result, after almost a year of work, we had a demo version with the most basic
		functionality, a good starting visual, music and even a full-fledged trailer.`,
	},
	{
		name: 'Nick',
		position: 'Game designer',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="man"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="square"
				hairStyle="thick"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `I work as a GD (game designer) in a dev company, making games for the mobile market. I came there
		immediately after the lab as a level designer. I still communicate with some team members, and we work
		together with the 3D artist :)`,
	},
	{
		name: 'Anna',
		position: '2D artist',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="woman"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="womanShort"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `I wish the following projects on the lab: experienced leads and clearer goals. And also the same passion
		and interest in the project as our team.`,
	},
	{
		name: 'Eugene',
		position: 'Game designer',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="man"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="normal"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `Thank you so much for this experience. I was able to experience a lot of things live.`,
	},
	{
		name: 'Dmitry',
		position: 'Game designer',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="man"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="mohawk"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `Team - 🔥🔥🔥. Thank you for the opportunity to work with you!)`,
	},
	{
		name: 'Elena',
		position: '2D artist',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="woman"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="womanShort"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `I love my team! I would like to continue working together. My wish is to achieve success and move on
		despite all obstacles)`,
	},
	{
		name: 'Sergey',
		position: 'Game designer',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="man"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="thick"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `No training will give you as many emotions and as much new practice as the GD Hub gave me personally.
		After all, all members of your team do not owe you anything and are not obligated to do anything. All
		you have is your idea, your experience in something and your internal energy, which will allow you to
		lead the team from start to finish and continue to lead it further until your product reaches a real
		player.`,
	},
	{
		name: 'Alex',
		position: 'Project manager',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="man"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="thick"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `The team has formed quite well, if this game doesn’t work out and the majority doesn’t run away, then
		you can try to start the next game from scratch and taking into account the experience gained.`,
	},
	{
		name: 'Michael',
		position: 'Unity developer',
		avatar: (
			<ReactNiceAvatar
				style={{ width: '64px', height: '64px' }}
				sex="man"
				eyeStyle="circle"
				faceColor="#F9C9B6"
				glassesStyle="none"
				hairStyle="normal"
				mouthStyle="smile"
				hatStyle="none"
			/>
		),
		text: `All is cool! Let&apos;s move on ;)`,
	},
]

export const LandingFeedbackSection = () => {
	const { t } = useTolgee()
	const screens = Grid.useBreakpoint()
	const [maxHeight, setMaxHeight] = useState('833px')

	return (
		<div id="reviews" className={styles.section} style={{ maxHeight: maxHeight }}>
			<div className={styles.container}>
				<div className={styles.preTitle}>
					<T keyName="landing.feedback.pretitle">Testimonials</T>
				</div>
				<Title level={2}>
					<T keyName="landing.feedback.title">What our users say</T>
				</Title>
				<div className={styles.subTitle}>
					<T keyName="landing.feedback.subtitle">We are happy to work long-term with our users!</T>
				</div>
				<div className={styles.content}>
					{screens.lg && (
						<>
							<ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 1200: 3, 1440: 4 }}>
								<Masonry gutter="30px">
									{feedbackList.map((feedback, index) => (
										<Card rootClassName={styles.feedbackCard} key={'feedback-card-' + index}>
											<Card.Meta
												avatar={feedback.avatar}
												title={t(`landing.feedback.title` + index, feedback.name)}
												description={t(`landing.feedback.description` + index, feedback.position)}
											/>
											<T keyName={`landing.feedback.text` + index}>{feedback.text}</T>
										</Card>
									))}
								</Masonry>
							</ResponsiveMasonry>
							{maxHeight != 'none' ? (
								<Button className={styles.readMoreBtn} onClick={() => setMaxHeight('none')}>
									<T>Read more</T>
								</Button>
							) : null}
						</>
					)}

					{!screens.lg && (
						<Carousel
							autoplay={false}
							centerMode
							className={styles.feedbackCarousel}
							centerPadding="32px"
							dots={{ className: styles.feedbackDot }}
						>
							{feedbackList.map((feedback, index) => (
								<div className={styles.feedbackSlideContainer} key={'feedback-card-' + index}>
									<Card className={styles.feedbackSlide}>
										<Card.Meta avatar={feedback.avatar} title={feedback.name} description={feedback.position} />
										{feedback.text}
									</Card>
								</div>
							))}
						</Carousel>
					)}
				</div>
			</div>
		</div>
	)
}
