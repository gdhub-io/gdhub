import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { T } from '@tolgee/react'
import { Grid, Typography, Button, Tag, Space } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import Slider, { Settings } from 'react-slick'
import styles from './style.module.scss'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

const { Title, Text } = Typography

export const LandingFeaturedProjectsSection = () => {
	const screens = Grid.useBreakpoint()
	const [sliderSettings, setSliderSettings] = useState<Settings>()

	const { data: featuredProjects } = useQuery(['featuredProjects'], () => axios.post<any>('/api/featured-projects'))

	useEffect(() => {
		setSliderSettings({
			className: styles.slider,
			centerMode: true,
			slidesToScroll: 2,
			infinite: false,
			centerPadding: '60px',
			slidesToShow: 3,
			speed: 500,
			variableWidth: true,
			arrows: false,
		})
	}, [])

	return (
		<div id="about" className={styles.section}>
			<div className={styles.container}>
				<div className={styles.preTitle}>
					<T keyName="landing.projects.preTitle">What do we offer</T>
				</div>
				<Title level={2}>
					<T keyName="landing.projects.title">community member projects</T>
				</Title>
				<div className={styles.subTitle}>
					<T keyName="landing.projects.subtitle">Level up your imagination with immersive video game projects!</T>
				</div>

				{/* Slider */}
				<div className="slider-container">
					<Slider {...sliderSettings}>
						{featuredProjects?.data?.map((project: any) => (
							<div key={project.id} className={styles.slide} style={{ width: 300 }}>
								<div className={styles.image}>
									<Image src={project.coverImage} fill alt={project.name} />
								</div>
								<div className={styles.details}>
									<Title level={5}>{project.name}</Title>
									<Space size={8} wrap>
										<Tag color="yellow" bordered>
											{project.genre}
										</Tag>
										<Tag color="yellow" bordered>
											{project.visualStyle}
										</Tag>
										<Tag color="yellow" bordered>
											{project.setting}
										</Tag>
									</Space>
								</div>
							</div>
						))}
					</Slider>
				</div>

				<Button type="primary" size="large" className={styles.button}>
					See all Projects
				</Button>
			</div>
		</div>
	)
}
