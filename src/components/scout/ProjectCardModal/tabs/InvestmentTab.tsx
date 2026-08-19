"use client";

import { IconCoins, IconGavel, IconInfoCircle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Table, Typography } from "antd";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/ui/EmptyState";
import {
	estimateInputRows,
	estimateOutputRows,
	money,
} from "@/helpers/investment";
import { share } from "../format";
import { HeadlineCard, KycBadge, Section } from "../parts";
import styles from "../style.module.scss";
import type { CardInvestment, CardInvestor } from "../types";
import { useCardSection } from "../useSection";

const { Text } = Typography;

/**
 * The founder's own cap-table bar, read-only. Loaded on demand: it pulls in
 * Observable Plot and d3, and a scout who never opens the Investment tab should
 * not carry them.
 */
const EquityPlot = dynamic(() => import("@/components/MyTeam/EquityPlot"), {
	ssr: false,
	loading: () => <Skeleton active title={false} paragraph={{ rows: 2 }} />,
});

export function InvestmentTab({ projectId }: { projectId: string }) {
	const { t } = useTranslate();
	const { data, isLoading } = useCardSection<CardInvestment>(
		projectId,
		"investment",
	);

	if (isLoading)
		return <Skeleton active title={false} paragraph={{ rows: 8 }} />;

	const estimate = data?.estimate ?? null;
	const raised = data?.raised ?? [];
	const investors = data?.investors ?? [];
	const raisedTotal = raised.map((row) => money(row.amount, row.currency));

	// The headline shows the first currency, so the caption says who put it in
	// and names the other currencies — repeating the same figure underneath
	// itself tells the reader nothing twice.
	const raisedSub = [
		...raisedTotal.slice(1),
		t(
			"scout.card.investment.investors",
			"{count, plural, one {from # investor} other {from # investors}}",
			{ count: data?.investorCount ?? 0 },
		),
	].join(" · ");

	const rows = estimate
		? [...estimateInputRows(estimate, t), ...estimateOutputRows(estimate, t)]
		: [];

	return (
		<Flex vertical gap={16}>
			<div className={styles.headline}>
				{/* The dash is the fact: the platform has no field for it, so no
				    project has stated one. */}
				<HeadlineCard
					label={t("scout.games.investment.asking", "Team asks for")}
					value={data?.stated ?? "—"}
					muted={!data?.stated}
					sub={t(
						"scout.card.investment.askingSub",
						"The team has not published a figure",
					)}
				/>
				<HeadlineCard
					label={t("scout.games.column.toRelease", "To release")}
					value={estimate ? `≈ ${money(estimate.remaining)}` : "—"}
					muted={!estimate}
					sub={t(
						"scout.card.investment.toReleaseSub",
						"Automatic estimate, not a quote",
					)}
				/>
				<HeadlineCard
					label={t("scout.games.investment.raised", "Put in so far")}
					value={raisedTotal[0] ?? "—"}
					muted={!raised.length}
					sub={
						raised.length
							? raisedSub
							: t(
									"scout.card.investment.raisedSub",
									"No investment recorded yet",
								)
					}
				/>
			</div>

			{/* The legal arrangement frames everything below it — a cap table is a
			    promise between people until there is an entity behind it. Nothing
			    is on record for any project yet: authors will be able to declare a
			    co-development agreement, an operating company, or neither. */}
			<Flex vertical gap={12}>
				<Text className={styles.sectionTitle}>
					{t("scout.card.investment.legal", "Legal structure")}
				</Text>
				<div className={styles.legal}>
					<span className={styles.legalTile}>
						<IconGavel size={18} />
					</span>
					<div className={styles.feedText}>
						<Text className={styles.feedLabel}>
							{t("scout.card.investment.legalNone", "Nothing on record")}
						</Text>
						<Text type="secondary" className={styles.caption}>
							{t(
								"scout.card.investment.legalHint",
								"The team has not stated how the project is arranged legally — no co-development agreement and no operating company on record. Treat the cap table below as an agreement between people, not between entities.",
							)}
						</Text>
					</div>
				</div>
			</Flex>

			{data?.equity && (
				<Flex vertical gap={12}>
					<Text className={styles.sectionTitle}>
						{t("scout.card.investment.equity", "Who owns the project")}
					</Text>
					<div className={styles.plot}>
						<EquityPlot
							platformShare={data.equity.platformShare}
							mentorFundShare={data.equity.mentorFundShare}
							investmentReserve={data.equity.investmentReserve}
							teamShares={data.equity.shares.map((row) => ({
								...row,
								name: row.name ?? undefined,
							}))}
						/>
					</div>
				</Flex>
			)}

			{!!investors.length && (
				<Section
					title={t("scout.card.investors.title", "Investors")}
					count={investors.length}
					loading={false}
				>
					<Table
						rowKey="id"
						size="small"
						pagination={false}
						className={styles.cardTable}
						dataSource={investors}
						scroll={{ x: 560 }}
						columns={[
							{
								title: t("scout.card.investors.name", "Investor"),
								key: "investor",
								render: (_: unknown, investor: CardInvestor) =>
									t("scout.card.investors.numbered", "Investor {n}", {
										n: investor.index,
									}),
							},
							{
								title: t("scout.card.team.kyc", "KYC"),
								key: "kyc",
								width: 152,
								render: () => <KycBadge />,
							},
							{
								title: t("scout.card.team.shares", "Shares"),
								dataIndex: "share",
								width: 104,
								align: "right" as const,
								render: (value: number) => share(value),
							},
						]}
					/>
				</Section>
			)}

			{estimate && (
				<Flex vertical gap={12}>
					<Text className={styles.sectionTitle}>
						{t("scout.card.investment.built", "How the estimate is built")}
					</Text>
					<div className={styles.feed}>
						{rows.map(([label, value]) => (
							<div key={label} className={styles.feedRow}>
								<div className={styles.feedText}>
									<Text type="secondary">{label}</Text>
								</div>
								<Text strong className={styles.nowrap}>
									{value}
								</Text>
							</div>
						))}
					</div>
				</Flex>
			)}

			{estimate ? (
				<div className={styles.bannerTop}>
					<IconInfoCircle size={16} className={styles.bannerIcon} />
					<Text type="secondary" className={styles.caption}>
						{t(
							"scout.games.investment.note",
							"An automatic guess at what finishing this game would take, from the team's skill levels and stated hours, how far the workflow has moved and the roles still open. Includes a contingency reserve and a marketing share. Not a figure the project has quoted.",
						)}
					</Text>
				</div>
			) : (
				<EmptyState
					icon={IconCoins}
					title={t(
						"scout.card.investment.empty",
						"Nothing to estimate from yet",
					)}
					description={t(
						"scout.card.investment.emptyHint",
						"The estimate needs a team or an open position; this project has neither.",
					)}
				/>
			)}
		</Flex>
	);
}

/** The tab's three headline figures — eyebrow, number, one line of context. */
