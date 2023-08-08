import { useEffect, useState } from 'react'
import { Project } from '@prisma/client'
import { Typography } from 'antd'
import Image from 'next/image'
import styles from './style.module.scss'

const { Title } = Typography

export const DemoDayProjects = ({ projects }: { projects: any[] }) => {
	const [auto, setAuto] = useState(true)
	const [activatedIndex, setActivatedIndex] = useState(0)
	const [slides, setSlides] = useState(projects)

	useEffect(() => {
		if (auto) {
			setTimeout(nextSlide, 3000)
		}
	}, [activatedIndex])

	const nextSlide = () => {
		let newSlideIndex = activatedIndex + 1
		if (newSlideIndex >= projects.length) {
			newSlideIndex = 0
		}
		setActivatedIndex(newSlideIndex)
	}

	const handleSlideClick = (index: number) => {
		setAuto(false)
		setActivatedIndex(index)
	}

	if (!slides) return null

	return (
		<div className={styles.content}>
			<Title level={3}>Проекты, которые готовятся к питчу</Title>
			<section className={styles.carousel}>
				<ul className="carousel__list">
					{slides?.map((project: Project, idx: number) => (
						<>
							{!!project.coverImage && (
								<li
									key={project.id}
									className="carousel__item"
									tabIndex={0}
									data-active={idx == activatedIndex && 'data-active'}
									onFocus={() => handleSlideClick(idx)}
								>
									<div className="carousel__box">
										<div className="carousel__image">
											<Image src={project.coverImage} width="720" height="480" alt="" />
										</div>
										<div className="carousel__contents">
											<h2 className="user__name">{project.name}</h2>
											<h3 className="user__title">
												{project.genre} для {project.platform}
											</h3>
										</div>
									</div>
								</li>
							)}
						</>
					))}
				</ul>
			</section>
		</div>
	)
}
