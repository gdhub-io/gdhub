import Star2Icon from '@/assets/images/icons/star-2.svg'
import BgImageXS from '@/assets/images/landing/bg-image-for-authors-section-xs.png'
import BgImage from '@/assets/images/landing/bg-image-for-authors-section.png'
import { Button, Grid, Space, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Text } = Typography

export const LandingForAuthorsSection = () => {
	const screens = Grid.useBreakpoint()

	return (
		<div>
			<div
				id="for-authors"
				className={styles.section}
				style={screens.md ? { backgroundImage: `url(${BgImage.src})` } : undefined}
			>
				<div className={styles.container}>
					<div className={styles.preTitle}>what are our advantages</div>
					<Title level={2}>FOR AUTHORS</Title>

					<div className={styles.content}>
						<Space direction="vertical" size={screens.lg ? 46 : 32}>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>
									Our platform is actively used by more than 250 professionals from various fields - game designers,
									programmers, artists, animators, etc.
								</Text>
							</Space>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>Specialists of your team will develop a video game for free</Text>
							</Space>
							<Space size={screens.lg ? 32 : 16} align="center">
								<div className={styles.star}>
									<Star2Icon />
								</div>
								<Text>
									Each Author can choose the format of work on our portal: as a part of the Gamelab incubation program
									or work independently at his own pace
								</Text>
							</Space>
							<Link href="/registration?for=author">
								<Button className={styles.heroButton} type="primary">
									Assemble a team
								</Button>
							</Link>
						</Space>
					</div>
				</div>
			</div>
			{screens.md ? null : (
				<div className={styles.sectionImageXS}>
					<Image src={BgImageXS} alt="" fill />
				</div>
			)}
		</div>
	)
}
