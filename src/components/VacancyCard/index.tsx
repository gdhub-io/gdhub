import { Button, Space, Typography } from "antd";
import dayjs from "dayjs";
import { getWorkDirection } from "@/components/DirectionBadge";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

/** Payment period for a paid vacancy. Mirrors prisma `PaymentRateType`. */
export type VacancyRateType = "Hourly" | "OneTime" | "Monthly";

/** Short suffix shown after the amount, e.g. "€2,500 / month". */
const RATE_SUFFIX: Record<VacancyRateType, string> = {
	Hourly: "/ hour",
	OneTime: "one-time",
	Monthly: "/ month",
};

export type VacancyCardProps = {
	/** Work direction name, e.g. "game design". Drives the icon + background color. */
	directionName: string;
	/** Vacancy title. */
	title: string;
	/** Project the vacancy belongs to. */
	projectName?: string;
	/** Deadline shown in the date badge. */
	finishedAt?: string | Date | null;
	/** Equity offered, in percent. Used when there is no monetary compensation. */
	promisePercentage?: number | null;
	/** Paid compensation amount (in euros). */
	offeredAmount?: number | null;
	/** Paid compensation period. */
	offeredRateType?: VacancyRateType | null;
	/** Label before the date, defaults to "Relevant to". */
	validUntilLabel?: string;
	/** Details button label, defaults to "Details". */
	detailsLabel?: string;
	/** Link for the Details button. */
	detailsHref?: string;
	/** Click handler for the Details button. */
	onDetails?: () => void;
};

/**
 * Vacancy card used on the jobs board: a direction-colored panel with the
 * direction icon, project + title, and a footer describing the cooperation
 * terms (paid amount, equity, or "for experience").
 */
export function VacancyCard({
	directionName,
	title,
	projectName,
	finishedAt,
	promisePercentage,
	offeredAmount,
	offeredRateType,
	validUntilLabel = "Relevant to",
	detailsLabel = "Details",
	detailsHref,
	onDetails,
}: VacancyCardProps) {
	const { slug, icon: Icon } = getWorkDirection(directionName);

	const isPaid = offeredAmount != null && offeredRateType != null;
	const isEquity = !isPaid && !!promisePercentage;

	const compensation = isPaid ? (
		<Text strong>
			€{(offeredAmount ?? 0).toLocaleString()} {RATE_SUFFIX[offeredRateType]}
		</Text>
	) : isEquity ? (
		<Text strong>Equity offered: {promisePercentage?.toFixed(1)}%</Text>
	) : (
		<Text>For experience</Text>
	);

	return (
		<div className={styles.jobCard}>
			<div className={`${styles.jobCardContent} bg-direc-${slug}`}>
				<div className={styles.jobCardHeader}>
					<span className={styles.dirChip}>
						<Icon size={18} stroke={2} color="#18181B" />
					</span>
					{finishedAt && (
						<div className={styles.jobCardDate}>
							{validUntilLabel} {dayjs(finishedAt).format("ll")}
						</div>
					)}
				</div>
				<Space orientation="vertical" size={0}>
					{projectName && <Text ellipsis>{projectName}</Text>}
					<Title
						ellipsis={{ rows: 2 }}
						level={2}
						style={{ margin: 0, height: "60.8px" }}
					>
						{title}
					</Title>
				</Space>
			</div>
			<div className={styles.jobCardFooter}>
				<div className={styles.footerContent}>
					{compensation}
					<Text type="secondary">terms of cooperation</Text>
				</div>
				<Button
					type="primary"
					href={detailsHref}
					onClick={onDetails}
					className="black-btn"
				>
					{detailsLabel}
				</Button>
			</div>
		</div>
	);
}

export default VacancyCard;
