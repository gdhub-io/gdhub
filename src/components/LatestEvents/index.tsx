import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import { FaRegCalendarCheck } from "@react-icons/all-files/fa/FaRegCalendarCheck";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Flex, Skeleton, Space, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import styles from "./styles.module.scss";

type LatestEvent = prismaClient.Event & {
	schedule?: { startDate: string; endDate: string }[];
};

const { Title, Text } = Typography;

const SOON_DAYS = 14;

function parseDate(value: string) {
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function getEventTiming(
	schedule: { startDate: string; endDate: string }[] | undefined,
) {
	const now = new Date();
	const items = (schedule || [])
		.map((s) => ({ start: parseDate(s.startDate), end: parseDate(s.endDate) }))
		.filter((x) => !!x.start && !!x.end) as { start: Date; end: Date }[];

	if (!items.length) {
		return {
			isOngoing: false,
			isNotEnded: false,
			nextStart: null as Date | null,
			nearestEnd: null as Date | null,
		};
	}

	const notEndedItems = items.filter((i) => i.end.getTime() >= now.getTime());
	const isNotEnded = notEndedItems.length > 0;

	const isOngoing = notEndedItems.some(
		(i) =>
			i.start.getTime() <= now.getTime() && i.end.getTime() >= now.getTime(),
	);

	const nextStart = notEndedItems
		.map((i) => i.start)
		.filter((d) => d.getTime() >= now.getTime())
		.sort((a, b) => a.getTime() - b.getTime())[0];

	const nearestEnd = isOngoing
		? notEndedItems
				.map((i) => i.end)
				.sort((a, b) => a.getTime() - b.getTime())[0]
		: null;

	return { isOngoing, isNotEnded, nextStart: nextStart ?? null, nearestEnd };
}

export default function LatestEvents() {
	const { t } = useTranslate();

	const {
		data: events,
		isLoading,
		isFetched,
	} = useQuery<LatestEvent[]>({
		queryKey: ["latest-events"],
		queryFn: () =>
			axios
				.get<LatestEvent[]>("/api/events", {
					params: { withDates: true, timeStatus: ["upcoming", "ongoing"] },
				})
				.then((r) => r.data),
		staleTime: 1000 * 60 * 3,
	});

	const now = Date.now();
	const soonWindowMs = SOON_DAYS * 24 * 60 * 60 * 1000;

	const candidates = (events || [])
		.map((e) => {
			const timing = getEventTiming(e.schedule);
			const isSoon =
				!!timing.nextStart &&
				timing.nextStart.getTime() - now >= 0 &&
				timing.nextStart.getTime() - now <= soonWindowMs;

			return { e, ...timing, isSoon };
		})
		.filter((x) => x.isNotEnded && (x.isOngoing || x.isSoon))
		.sort((a, b) => {
			// ongoing first
			if (a.isOngoing !== b.isOngoing) return a.isOngoing ? -1 : 1;

			// ongoing: nearest end first
			if (a.isOngoing && b.isOngoing) {
				const aEnd = a.nearestEnd?.getTime() ?? Number.POSITIVE_INFINITY;
				const bEnd = b.nearestEnd?.getTime() ?? Number.POSITIVE_INFINITY;
				return aEnd - bEnd;
			}

			// upcoming soon: nearest start first
			const aStart = a.nextStart?.getTime() ?? Number.POSITIVE_INFINITY;
			const bStart = b.nextStart?.getTime() ?? Number.POSITIVE_INFINITY;
			return aStart - bStart;
		})
		.slice(0, 5);

	if (!candidates.length && isFetched) return null;

	return (
		<Skeleton active loading={isLoading}>
			<div className={styles.container}>
				<Flex align="center" justify="space-between" className={styles.header}>
					<Space>
						<FaRegCalendarCheck
							size={22}
							style={{ position: "relative", top: 1 }}
						/>
						<Title level={4} className={styles.title}>
							{t("hub.latest-events.title", "Latest events")}
						</Title>
					</Space>

					<Link href="/hub/events" className={styles.seeAll}>
						<Text type="secondary">
							{t("hub.latest-events.see-all", "See all")}
						</Text>
						<FaChevronRight className={styles.seeAllIcon} />
					</Link>
				</Flex>

				<div className={styles.list}>
					{candidates.map(({ e, isOngoing, nextStart, nearestEnd }) => (
						<Link
							key={e.id}
							href={`${e.lang ? `/${e.lang}` : ""}/event/${e.slug}`}
							target="_blank"
							className={styles.item}
						>
							<div className={styles.itemLeft}>
								<Avatar
									src={e.image ?? undefined}
									size={40}
									className={styles.avatar}
								>
									{e.title?.charAt(0)?.toUpperCase()}
								</Avatar>
								<div className={styles.textWrap}>
									<div className={styles.primary} title={e.title}>
										{e.title}
									</div>
									<div
										className={styles.secondary}
										title={
											isOngoing
												? dayjs(nearestEnd).format("LL")
												: dayjs(nextStart).format("LL")
										}
									>
										{isOngoing ? (
											<>
												{t("hub.latest-events.ongoing", "Ongoing")} ·{" "}
												{t("hub.latest-events.until", "until")}{" "}
												{dayjs(nearestEnd).format("ll")}
											</>
										) : (
											<>
												{t("hub.latest-events.starts", "Starts")}:{" "}
												{dayjs(nextStart).format("ll")}
											</>
										)}
									</div>
								</div>
							</div>
							<FaChevronRight className={styles.itemIcon} />
						</Link>
					))}
				</div>
			</div>
		</Skeleton>
	);
}
