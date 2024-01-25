import Star2Icon from '@/assets/images/icons/star-2.svg'
import BgImageXS from '@/assets/images/landing/bg-image-for-specialists-section-xs.png'
import BgImage from '@/assets/images/landing/bg-image-for-specialists-section.png'
import { T } from '@tolgee/react'
import { Button, Col, Grid, Row, Space, Typography } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import styles from './style.module.scss'

const { Title, Text } = Typography

export const LandingForSpecialistsSection = () => {
	const screens = Grid.useBreakpoint()

	return (
		<div>
			<div
				id="for-specialists"
				className={styles.section}
				style={screens.md ? { backgroundImage: `url(${BgImage.src})` } : undefined}
			>
				<div className={styles.container}>
					<Row>
						<Col xs={{ span: 24 }} lg={{ span: 12 }}></Col>
						<Col xs={{ span: 24 }} lg={{ span: 12 }}>
							<div className={styles.preTitle}>
								<T keyName="landing.specialist.pretitle">what are our advantages</T>
							</div>
							<Title level={2}>
								<T keyName="landing.specialist.title">FOR SPECIALISTS</T>
							</Title>

							<div className={styles.content}>
								<Space direction="vertical" size={screens.lg ? 46 : 32}>
									<Space size={screens.lg ? 32 : 16} align="center">
										<div className={styles.star}>
											<Star2Icon />
										</div>
										<Text>
											<T keyName="landing.specialist.text1">
												Each Specialist in the gaming industry has an opportunity to join one of the indie projects
												under development in order to gain experience and make new friends.
											</T>
										</Text>
									</Space>
									<Space size={screens.lg ? 32 : 16} align="center">
										<div className={styles.star}>
											<Star2Icon />
										</div>
										<Text>
											<T keyName="landing.specialist.text2">
												You can become a part of a new video game or share your expertise as a Mentor
											</T>
										</Text>
									</Space>
									<Link href="/registration?for=specialist">
										<Button className={styles.heroButton} type="primary">
											<T>Join the team</T>
										</Button>
									</Link>
								</Space>
							</div>
						</Col>
					</Row>
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
