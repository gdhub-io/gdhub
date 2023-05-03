import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './style.module.scss'

const projectsData = [
	{
		key: '1',
		name: 'Anthony Lee',
		title: 'Archetypal Professor of Recognition',
		imageLink: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&amp;h=720&amp;q=80',
	},
	{
		key: '2',
		name: 'Alicia Chevalier',
		title: 'Corporate Usability',
		imageLink: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=crop&amp;h=720&amp;q=80',
	},
	{
		key: '3',
		name: 'Nate Boucher',
		title: 'Customer Impact Officer',
		imageLink: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&amp;h=720&amp;q=80',
	},
	{
		key: '4',
		name: 'Leah Harris',
		title: 'Designer and Bandit',
		imageLink: 'https://images.unsplash.com/photo-1614204424926-196a80bf0be8?fit=crop&amp;h=720&amp;q=80',
	},
	{
		key: '5',
		name: 'Anthony Lee',
		title: 'Archetypal Professor of Recognition',
		imageLink: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&amp;h=720&amp;q=80',
	},
	{
		key: '6',
		name: 'Alicia Chevalier',
		title: 'Corporate Usability',
		imageLink: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?fit=crop&amp;h=720&amp;q=80',
	},
	{
		key: '7',
		name: 'Nate Boucher',
		title: 'Customer Impact Officer',
		imageLink: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&amp;h=720&amp;q=80',
	},
	{
		key: '8',
		name: 'Leah Harris',
		title: 'Designer and Bandit',
		imageLink: 'https://images.unsplash.com/photo-1614204424926-196a80bf0be8?fit=crop&amp;h=720&amp;q=80',
	},
]

export const DemoDayProjects = ({ projects }: any) => {
	const [auto, setAuto] = useState(true)
	const [activatedIndex, setActivatedIndex] = useState(0)

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

	const handleSlideClick = (slideIndex: number) => {
		setAuto(false)
		setActivatedIndex(slideIndex)
	}

	if (!projects) return null

	return (
		<div className={styles.content}>
			<section className={styles.carousel}>
				<ul className="carousel__list">
					{projects?.map((project: any, idx: number) => (
						<li
							key={project.id}
							className="carousel__item"
							tabIndex={0}
							data-active={idx == activatedIndex && 'data-active'}
							onClick={() => handleSlideClick(idx)}
						>
							<div className="carousel__box">
								<div className="carousel__image">
									<Image src={project['Cover Image']} width="720" height="480" alt="" />
								</div>
								<div className="carousel__contents">
									<h2 className="user__name">{project.Name}</h2>
									<h3 className="user__title">
										{project.Genre} для {project.Platform}
									</h3>
								</div>
							</div>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}
