import { useState } from 'react'
import { Avatar, Button, Card, Grid, Typography } from 'antd'
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry'
import styles from './style.module.scss'

const { Title, Paragraph, Text } = Typography

export const LandingFeedbackSection = () => {
	const screens = Grid.useBreakpoint()
	const [maxHeight, setMaxHeight] = useState('833px')

	return (
		<div id="reviews" className={styles.section} style={{ maxHeight: maxHeight }}>
			<div className={styles.container}>
				<div className={styles.preTitle}>Testimonials</div>
				<Title level={2}>What our users say</Title>
				<div className={styles.subTitle}>We are happy to work long-term with our users!</div>
				<div className={styles.content}>
					<ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3, 1440: 4 }}>
						<Masonry gutter="30px">
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={
										<Avatar
											src="https://media.licdn.com/dms/image/D4E03AQEMf67YvqF3kA/profile-displayphoto-shrink_200_200/0/1678909391107?e=1703721600&v=beta&t=XttRJj7nS-kSJ75tksn3HIHZsDUNbX0OV2l_Z8Xb1p8"
											size={64}
										/>
									}
									title="Vyacheslav"
									description="Game designer"
								/>
								Currently I work at OpenMyGame as a Middle GameDesigner. I wanted to participate in the gamelab as a gd
								and pm to gain experience. Everything planned was a success. Met interesting people. Subsequently, this
								experience and the very fact of participating in such an event greatly helped in finding my first job as
								a CEO. I wish new participants good luck and patience
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={
										<Avatar
											src="https://media.licdn.com/dms/image/D4D03AQEAPl1RuxYhhQ/profile-displayphoto-shrink_100_100/0/1695234171631?e=1703721600&v=beta&t=3Q9737TfrrSyQKPvSkpIe3jmyAg_DOPTAxREni1x6Ik"
											size={64}
										/>
									}
									title="Caroline"
									description="Lead level designer"
								/>
								My main goals were to gain experience working on the game with a whole team, but after a couple of
								months it became clear that no one wanted to give up the game, and we continued to polish the demo
								version. As a result, after almost a year of work, we had a demo version with the most basic
								functionality, a good starting visual, music and even a full-fledged trailer.
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={
										<Avatar
											src="https://scontent-fra5-1.xx.fbcdn.net/v/t1.18169-9/29594873_2014320291972801_5895792966299483167_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=7a1959&_nc_eui2=AeEtBoGEy5ikH9OQWg8dwZJqJk4luYfbtYcmTiW5h9u1hxHi2aejgtzp8tymd5SkLMjR8hRguS8oB0FSKo0T9-eD&_nc_ohc=F3ZFJdJI0B8AX8A9zOg&_nc_ht=scontent-fra5-1.xx&oh=00_AfDWN-MXz428xzPUf5iqSS7z7wQltl5uBVz78Mo4tEYgtQ&oe=655E62CA"
											size={64}
										/>
									}
									title="Nick"
									description="Game designer"
								/>
								I work as a GD (game designer) in a dev company, making games for the mobile market. I came there
								immediately after the lab as a level designer. I still communicate with some team members, and we work
								together with the 3D artist :)
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={<Avatar src="https://xsgames.co/randomusers/avatar.php?g=pixel" size={64} />}
									title="Floyd Miles"
									description="floydmiler@gmail.com"
								/>
								Lorem ipsum dolor sit amet consectetur. Convallis diam facilisis eu faucibus dui ipsum non accumsan
								lacus. Ante quis elit sit maecenas urna sed nulla malesuada magnis. Rutrum malesuada nulla sit neque in
								nisi ut viverra. Sagittis imperdiet ac velit @game_developres_hub. Ante quis elit sit
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={<Avatar src="https://xsgames.co/randomusers/avatar.php?g=pixel" size={64} />}
									title="Floyd Miles"
									description="floydmiler@gmail.com"
								/>
								Lorem ipsum dolor sit amet consectetur. Convallis diam facilisis eu faucibus dui ipsum non accumsan
								lacus. Ante quis elit sit maecenas urna sed nulla malesuada magnis. Rutrum malesuada nulla sit neque in
								nisi ut viverra. Sagittis imperdiet ac velit @game_developres_hub. Ante quis elit sit
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={<Avatar src="https://xsgames.co/randomusers/avatar.php?g=pixel" size={64} />}
									title="Floyd Miles"
									description="floydmiler@gmail.com"
								/>
								Lorem ipsum dolor sit amet consectetur. Convallis diam facilisis eu faucibus dui ipsum non accumsan
								lacus. Ante quis elit sit maecenas urna sed nulla malesuada magnis. Rutrum malesuada nulla sit neque in
								nisi ut viverra. Sagittis imperdiet ac velit @game_developres_hub. Ante quis elit sit
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={<Avatar src="https://xsgames.co/randomusers/avatar.php?g=pixel" size={64} />}
									title="Floyd Miles"
									description="floydmiler@gmail.com"
								/>
								Lorem ipsum dolor sit amet consectetur. Convallis diam facilisis eu faucibus dui ipsum non accumsan
								lacus. Ante quis elit sit maecenas urna sed nulla malesuada magnis. Rutrum malesuada nulla sit neque in
								nisi ut viverra. Sagittis imperdiet ac velit @game_developres_hub. Ante quis elit sit
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={<Avatar src="https://xsgames.co/randomusers/avatar.php?g=pixel" size={64} />}
									title="Floyd Miles"
									description="floydmiler@gmail.com"
								/>
								Lorem ipsum dolor sit amet consectetur. Convallis diam facilisis eu faucibus dui ipsum non accumsan
								lacus. Ante quis elit sit maecenas urna sed nulla malesuada magnis. Rutrum malesuada nulla sit neque in
								nisi ut viverra. Sagittis imperdiet ac velit @game_developres_hub. Ante quis elit sit
							</Card>
							<Card rootClassName={styles.feedbackCard}>
								<Card.Meta
									avatar={<Avatar src="https://xsgames.co/randomusers/avatar.php?g=pixel" size={64} />}
									title="Floyd Miles"
									description="floydmiler@gmail.com"
								/>
								Lorem ipsum dolor sit amet consectetur. Convallis diam facilisis eu faucibus dui ipsum non accumsan
								lacus. Ante quis elit sit maecenas urna sed nulla malesuada magnis. Rutrum malesuada nulla sit neque in
								nisi ut viverra. Sagittis imperdiet ac velit @game_developres_hub. Ante quis elit sit
							</Card>
						</Masonry>
					</ResponsiveMasonry>

					{maxHeight != 'none' ? (
						<Button className={styles.readMoreBtn} onClick={() => setMaxHeight('none')}>
							Read more
						</Button>
					) : null}
				</div>
			</div>
		</div>
	)
}
