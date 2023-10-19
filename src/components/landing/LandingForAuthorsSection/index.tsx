import Star2Icon from '@/assets/images/icons/star-2.svg'
import BgImage from '@/assets/images/landing/bg-image-for-authors-section.png'
import { Button, Space, Typography } from 'antd'
import { BsCaretRightFill } from 'react-icons/bs'
import styles from './style.module.scss'

const { Title, Text } = Typography

export const LandingForAuthorsSection = () => {
	return (
		<div id="for-authors" className={styles.section} style={{ backgroundImage: `url(${BgImage.src})` }}>
			<div className={styles.container}>
				<div className={styles.preTitle}>what are our advantages</div>
				<Title level={2}>FOR AUTHORS</Title>

				<div className={styles.content}>
					<Space direction="vertical" size={46}>
						<Space size={32} align="center">
							<div className={styles.star}>
								<Star2Icon />
							</div>
							<Text>
								Our platform is actively used by more than 250 professionals from various fields - game designers,
								programmers, artists, animators, etc.
							</Text>
						</Space>
						<Space size={32} align="center">
							<div className={styles.star}>
								<Star2Icon />
							</div>
							<Text>Specialists of your team will develop a video game for free</Text>
						</Space>
						<Space size={32} align="center">
							<div className={styles.star}>
								<Star2Icon />
							</div>
							<Text>
								Each Author can choose the format of work on our portal: as a part of the Gamelab incubation program or
								work independently at his own pace
							</Text>
						</Space>
						<Button className={styles.heroButton}>
							Assemble a team
							<span className="icon-right">
								<BsCaretRightFill />
							</span>
						</Button>
					</Space>
				</div>
			</div>
		</div>
	)
}
