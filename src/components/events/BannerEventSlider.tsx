import React, { useRef, useState, useEffect } from 'react'
import { formatEventPeriod } from '@/helpers/format'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { FaArrowLeft } from '@react-icons/all-files/fa/FaArrowLeft'
import { FaArrowRight } from '@react-icons/all-files/fa/FaArrowRight'
import { useQuery } from '@tanstack/react-query'
import { useTolgee } from '@tolgee/react'
import { Carousel, Button, theme } from 'antd'
import axios from 'axios'
import Image from 'next/image'
import qs from 'qs'

// Progress circle component
const SlideProgressCircle = ({
	isActive,
	duration,
	children,
	keyReset,
}: {
	isActive: boolean
	duration: number
	children: React.ReactNode
	keyReset: any
}) => {
	const [progress, setProgress] = useState(0)
	const { token } = theme.useToken()
	useEffect(() => {
		if (!isActive) {
			setProgress(0)
			return
		}
		setProgress(0)
		let start: number | null = null
		let frame: number
		const animate = (timestamp: number) => {
			if (!start) start = timestamp
			const elapsed = timestamp - start
			const percent = Math.min(elapsed / duration, 1)
			setProgress(percent)
			if (percent < 1) {
				frame = requestAnimationFrame(animate)
			}
		}
		frame = requestAnimationFrame(animate)
		return () => cancelAnimationFrame(frame)
	}, [isActive, duration, keyReset])

	const size = 40
	const stroke = 4
	const radius = (size - stroke) / 2
	const circ = 2 * Math.PI * radius
	return (
		<div
			style={{
				position: 'relative',
				width: size,
				height: size,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
				<circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e6eb" strokeWidth={stroke} fill="none" />
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={token.colorPrimary}
					strokeWidth={stroke}
					fill="none"
					strokeDasharray={circ}
					strokeDashoffset={circ * (1 - progress)}
					style={{ transition: isActive ? 'stroke-dashoffset 0.1s linear' : 'none' }}
				/>
			</svg>
			<span
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					zIndex: 2,
					fontWeight: 800,
					fontSize: 18,
					color: '#222',
					userSelect: 'none',
				}}
			>
				{children}
			</span>
		</div>
	)
}

const SLIDE_DURATION = 4000

export const BannerEventSlider = () => {
	const { token } = theme.useToken()
	const { t, getLanguage } = useTolgee()
	const carouselRef = useRef<any>(null)
	const [active, setActive] = useState(0)
	const [fadeImage, setFadeImage] = useState(true)
	const [fadeContent, setFadeContent] = useState(true)
	const [prevActive, setPrevActive] = useState(0)

	const { data: events } = useQuery(['slider-events'], () =>
		axios.get<(prismaClient.Event & { schedule: Pick<prismaClient.EventScheduleItem, 'startDate' | 'endDate'>[] })[]>(
			'/api/events',
			{
				params: {
					type: [prismaClient.$Enums.EventType.Conference, prismaClient.$Enums.EventType.GameLab],
					withDates: true,
				},
				paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
			}
		)
	)

	if (!events?.data.length) return null

	const handleBeforeChange = (_: number, next: number) => {
		setPrevActive(active)
		setFadeImage(false)
		setFadeContent(false)
		setTimeout(() => {
			setActive(next)
			setFadeImage(true)
			setFadeContent(true)
		}, 350)
	}

	return (
		<div
			style={{
				marginBottom: 48,
				width: '100%',
				minHeight: 480,
				display: 'flex',
				background: token.colorBgLayout,
				borderRadius: 24,
				overflow: 'hidden',
				boxShadow: token.boxShadowSecondary,
			}}
		>
			{/* Left: Image */}
			<div style={{ flex: 1.5, position: 'relative', minHeight: 480, overflow: 'hidden' }}>
				{/* Previous image (underneath) */}
				<Image
					key={events.data[prevActive].id + '-prev'}
					src={events.data[prevActive].image || ''}
					alt={events.data[prevActive].title}
					fill
					style={{
						objectFit: 'cover',
						position: 'absolute',
						top: 0,
						left: 0,
						transition: 'opacity 0.5s',
						opacity: active === prevActive && fadeImage ? 1 : 0.7,
						zIndex: 1,
					}}
					sizes="100vw"
				/>
				{/* Active image (on top, fades in) */}
				{active !== prevActive && (
					<Image
						key={events.data[active].id + '-active'}
						src={events.data[active].image || ''}
						alt={events.data[active].title}
						fill
						style={{
							objectFit: 'cover',
							position: 'absolute',
							top: 0,
							left: 0,
							transition: 'opacity 0.5s',
							opacity: fadeImage ? 1 : 0,
							zIndex: 2,
						}}
						sizes="100vw"
					/>
				)}
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%)',
						zIndex: 3,
					}}
				/>
			</div>
			{/* Right: Content */}
			<div
				style={{
					flex: 1,
					background: token.colorPrimary,
					color: token.colorTextLightSolid,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					position: 'relative',
					padding: '48px 40px 32px 40px',
					minWidth: 420,
				}}
			>
				<div style={{ position: 'absolute', top: 32, right: 40, fontSize: 18, letterSpacing: 2, opacity: 0.7 }}>
					{t('events.banner.see_whats_going_on', "SEE WHAT'S GOING ON")}
				</div>
				<div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
					{/* Vertical nav */}
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 8 }}>
						{events.data.map((_, idx) => (
							<div
								key={idx}
								style={{
									width: 38,
									height: 38,
									borderRadius: '50%',
									background: 'transparent',
									color: idx === active ? token.colorPrimary : token.colorTextLightSolid,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 700,
									fontSize: 16,
									cursor: 'pointer',
									border: idx === active ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
									position: 'relative',
								}}
								onClick={() => {
									carouselRef.current?.goTo(idx)
									setActive(idx)
								}}
							>
								<SlideProgressCircle isActive={idx === active} duration={SLIDE_DURATION} keyReset={active}>
									{`0${idx + 1}`}
								</SlideProgressCircle>
							</div>
						))}
						<div
							style={{
								writingMode: 'vertical-rl',
								transform: 'rotate(180deg)',
								marginTop: 24,
								letterSpacing: 2,
								fontWeight: 600,
								fontSize: 14,
								opacity: 0.7,
							}}
						>
							{t('events.banner.vertical_text', 'SLIDES')}
						</div>
					</div>
					{/* Main card (fade only content) */}
					<div
						style={{
							flex: 1,
							background: token.colorBgContainer,
							color: token.colorText,
							borderRadius: 16,
							boxShadow: token.boxShadowTertiary,
							padding: '32px 32px 24px 32px',
							minWidth: 320,
							minHeight: 320,
							display: 'flex',
							flexDirection: 'column',
							gap: 16,
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								transition: 'opacity 0.4s',
								opacity: fadeContent ? 1 : 0,
							}}
						>
							<div style={{ fontWeight: 600, fontSize: 16, color: token.colorPrimary, marginBottom: 4 }}>
								{t('events.banner.subtitle', "Let's see what you got")}
							</div>
							<div style={{ fontSize: 38, fontWeight: 800, marginBottom: 8 }}>{events.data[active].title}</div>
							<div style={{ fontSize: 16, color: token.colorTextDescription, marginBottom: 8 }}>
								{events.data[active].shortDescription}
							</div>
							<div style={{ fontSize: 15, color: token.colorText, marginBottom: 8 }}>
								{formatEventPeriod(
									events.data[active].schedule[0].startDate,
									events.data[active].schedule[events.data[active].schedule.length - 1].endDate,
									getLanguage(),
									'day'
								)}
							</div>
							<Button type="link" style={{ padding: 0, fontWeight: 700, fontSize: 16, alignSelf: 'flex-start' }}>
								Read More
							</Button>
						</div>
					</div>
				</div>
				{/* Bottom nav */}
				<div
					style={{
						position: 'absolute',
						bottom: 24,
						left: 40,
						right: 40,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<div style={{ fontWeight: 600, fontSize: 16, letterSpacing: 1 }}>
						{t('events.banner.more_events', 'MORE EVENTS')}
					</div>
					<div style={{ display: 'flex', gap: 12 }}>
						<Button shape="circle" icon={<FaArrowLeft size={18} />} onClick={() => carouselRef.current?.prev()} />
						<Button shape="circle" icon={<FaArrowRight size={18} />} onClick={() => carouselRef.current?.next()} />
					</div>
				</div>
			</div>
			{/* Hidden Carousel for logic */}
			<Carousel
				ref={carouselRef}
				beforeChange={handleBeforeChange}
				dots={false}
				autoplay={events.data.length > 1}
				autoplaySpeed={SLIDE_DURATION}
				effect="scrollx"
			>
				{events.data.map((event) => (
					<div key={event.id} />
				))}
			</Carousel>
		</div>
	)
}
