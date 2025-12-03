import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTolgee } from "@tolgee/react";
import { Button, Carousel, Flex, theme } from "antd";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import qs from "qs";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatEventPeriod } from "@/helpers/format";
import styles from "./BannerEventSlider.module.scss";

// Progress circle component
const SlideProgressCircle = ({
	isActive,
	duration,
	children,
	keyReset,
}: {
	isActive: boolean;
	duration: number;
	children: React.ReactNode;
	keyReset: any;
}) => {
	const [progress, setProgress] = useState(0);
	const { token } = theme.useToken();
	useEffect(() => {
		if (!isActive) {
			setProgress(0);
			return;
		}
		setProgress(0);
		let start: number | null = null;
		let frame: number;
		const animate = (timestamp: number) => {
			if (!start) start = timestamp;
			const elapsed = timestamp - start;
			const percent = Math.min(elapsed / duration, 1);
			setProgress(percent);
			if (percent < 1) {
				frame = requestAnimationFrame(animate);
			}
		};
		frame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frame);
	}, [isActive, duration, keyReset]);

	const size = 40;
	const stroke = 2;
	const radius = (size - stroke) / 2;
	const circ = 2 * Math.PI * radius;
	return (
		<div
			style={{
				position: "relative",
				width: size,
				height: size,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<svg
				role="img"
				aria-label="Slide progress circle"
				width={size}
				height={size}
				style={{ position: "absolute", top: 0, left: -1 }}
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="transparent"
					strokeWidth={stroke}
					fill="none"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="#111"
					opacity={0.5}
					strokeWidth={stroke}
					fill="none"
					strokeDasharray={circ}
					strokeDashoffset={circ * (1 - progress)}
					style={{
						transition: isActive ? "stroke-dashoffset 0.1s linear" : "none",
					}}
				/>
			</svg>
			<span
				style={{
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					zIndex: 2,
					fontWeight: 800,
					fontSize: 18,
					color: "#111",
					userSelect: "none",
				}}
			>
				{children}
			</span>
		</div>
	);
};

const SLIDE_DURATION = 9000;

export const BannerEventSlider = () => {
	const { token } = theme.useToken();
	const { t, getLanguage } = useTolgee();
	const carouselRef = useRef<any>(null);
	const [active, setActive] = useState(0);
	const [fadeImage, setFadeImage] = useState(true);
	const [fadeContent, setFadeContent] = useState(true);
	const [prevActive, setPrevActive] = useState(0);

	const { data: events } = useQuery({
		queryKey: ["slider-events"],
		queryFn: () =>
			axios.get<
				(prismaClient.Event & {
					schedule: Pick<
						prismaClient.EventScheduleItem,
						"startDate" | "endDate"
					>[];
				})[]
			>("/api/events", {
				params: {
					type: [
						prismaClient.$Enums.EventType.Conference,
						prismaClient.$Enums.EventType.GameLab,
					],
					withDates: true,
					status: [prismaClient.$Enums.EventStatus.Published],
					lang: getLanguage(),
				},
				paramsSerializer: (params) =>
					qs.stringify(params, { arrayFormat: "repeat" }),
			}),
	});

	// Keep latest active in a ref to avoid re-creating callbacks
	const activeRef = useRef(active);

	useEffect(() => {
		activeRef.current = active;
	}, [active]);

	const handleBeforeChange = useCallback((_: number, next: number) => {
		setPrevActive(activeRef.current);
		setFadeImage(false);
		setFadeContent(false);
		setTimeout(() => {
			setActive(next);
			setFadeImage(true);
			setFadeContent(true);
		}, 350);
	}, []);

	if (!events?.data.length) return null;

	return (
		<div className={styles.sliderWrapper}>
			{/* Vertical nav moved to left edge */}
			<div className={styles.verticalNav}>
				{events.data.map((_, idx) => (
					<div
						key={`slide-circle-${idx.toString()}`}
						role="button"
						tabIndex={0}
						className={
							styles.slideCircle +
							" " +
							(idx === active
								? styles.slideCircleActive
								: styles.slideCircleInactive)
						}
						onClick={() => {
							carouselRef.current?.goTo(idx);
							setActive(idx);
						}}
					>
						<SlideProgressCircle
							isActive={idx === active}
							duration={SLIDE_DURATION}
							keyReset={active}
						>
							{`0${idx + 1}`}
						</SlideProgressCircle>
					</div>
				))}
				<div className={styles.verticalNavLabel}>
					{t("events.banner.vertical_text", "SLIDES")}
				</div>
			</div>
			{/* Left: Content (красный блок) */}
			<div className={styles.leftContent}>
				<div
					style={{
						position: "absolute",
						top: 32,
						left: 40,
						fontSize: 18,
						letterSpacing: 2,
						opacity: 0.7,
					}}
				>
					{t("events.banner.see_whats_going_on", "SEE WHAT'S GOING ON")}
				</div>
				<div style={{ width: "100%" }}>
					<div className={styles.card}>
						<Flex
							vertical
							gap={4}
							className={styles.cardContent}
							style={{ opacity: fadeContent ? 1 : 0, height: "100%" }}
						>
							<div>
								<div className={styles.cardSubtitle}>
									{t("events.banner.subtitle", "Event")}
								</div>
								<div className={styles.cardTitle}>
									{events.data[active].title}
								</div>
								<div className={styles.cardDescription}>
									{events.data[active].shortDescription}
								</div>
								<div className={styles.cardPeriod}>
									{String(
										formatEventPeriod(
											events.data[active].schedule[0].startDate,
											events.data[active].schedule[
												events.data[active].schedule.length - 1
											].endDate,
											getLanguage(),
											"day",
										),
									)}
								</div>
							</div>
							<Link
								href={`/event/${events.data[active].slug}`}
								target="_blank"
								style={{ marginTop: "auto" }}
							>
								<Button type="text" className={styles.readMoreBtn}>
									{t("events.banner.read_more", "Read More")}
								</Button>
							</Link>
						</Flex>
					</div>
				</div>
			</div>
			{/* Right: Image */}
			<div
				style={{
					flex: 3,
					position: "relative",
					borderRadius: 16,
					minHeight: 480,
					overflow: "hidden",
				}}
			>
				{/* Previous image (underneath) */}
				<Image
					key={events.data[prevActive].id + "-prev"}
					src={events.data[prevActive].image || ""}
					alt={events.data[prevActive].title}
					fill
					style={{
						objectFit: "cover",
						position: "absolute",
						top: 0,
						left: 0,
						transition: "opacity 0.5s",
						opacity: active === prevActive && fadeImage ? 1 : 0.7,
						zIndex: 1,
					}}
					sizes="100vw"
				/>
				{/* Active image (on top, fades in) */}
				{active !== prevActive && (
					<Image
						key={events.data[active].id + "-active"}
						src={events.data[active].image || ""}
						alt={events.data[active].title}
						fill
						style={{
							objectFit: "cover",
							position: "absolute",
							top: 0,
							left: 0,
							transition: "opacity 0.5s",
							opacity: fadeImage ? 1 : 0,
							zIndex: 2,
						}}
						sizes="100vw"
					/>
				)}
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "#00000022",
						zIndex: 3,
					}}
				/>
			</div>
			{/* Bottom nav */}
			{/* <div
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
				<div style={{ display: 'flex', gap: 12 }}>
					<Button shape="circle" icon={<FaArrowLeft size={18} />} onClick={() => carouselRef.current?.prev()} />
					<Button shape="circle" icon={<FaArrowRight size={18} />} onClick={() => carouselRef.current?.next()} />
				</div>
			</div> */}
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
	);
};
