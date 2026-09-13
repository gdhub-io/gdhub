import { IconCheck, IconMinus, IconPencil } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { useState } from "react";
import { CheckpointSection } from "../CheckpointSection";
import { SectionIntro } from "../SectionIntro";
import styles from "./style.module.scss";

type CellState = "yes" | "partial" | "no";

type Cell = { state: CellState; note?: string };

type ComparisonRow = { label: string; industry: Cell; ai: Cell };

const CELL_ICON = {
	yes: IconCheck,
	partial: IconPencil,
	no: IconMinus,
} as const;

function Column({
	title,
	badge,
	summary,
	rows,
	side,
	price,
	vat,
	tone,
	hoveredRow,
	onHoverRow,
}: {
	title: string;
	badge?: string;
	summary: string;
	rows: ComparisonRow[];
	side: "industry" | "ai";
	price: string;
	vat: string;
	tone: "accent" | "muted";
	hoveredRow: number | null;
	onHoverRow: (row: number | null) => void;
}) {
	return (
		<div className={`${styles.column} ${styles[`column_${tone}`]}`}>
			<header className={styles.columnHead}>
				<div className={styles.columnTitleRow}>
					<h3 className={styles.columnTitle}>{title}</h3>
					{badge ? <span className={styles.badge}>{badge}</span> : null}
				</div>
				<p className={styles.columnSummary}>{summary}</p>
			</header>

			<ul className={styles.cells}>
				{rows.map((row, index) => {
					const cell = row[side];
					const Icon = CELL_ICON[cell.state];
					return (
						<li
							key={row.label}
							className={styles.cell}
							data-hovered={hoveredRow === index || undefined}
							onMouseEnter={() => onHoverRow(index)}
							onMouseLeave={() => onHoverRow(null)}
						>
							<Icon size={19} className={styles[`icon_${cell.state}`]} />
							<span className={styles.cellText}>
								<span className={styles.cellLabel}>{row.label}</span>
								{cell.note ? (
									<span className={styles.cellNote}>{cell.note}</span>
								) : null}
							</span>
						</li>
					);
				})}
			</ul>

			<footer className={styles.price}>
				<span className={styles.priceValue}>{price}</span>
				<span className={styles.priceNote}>{vat}</span>
			</footer>
		</div>
	);
}

export const CheckpointCuratorChoiceSection = () => {
	const { t } = useTranslate();
	// Columns are siblings: no selector can light a whole row, so the index is state.
	const [hoveredRow, setHoveredRow] = useState<number | null>(null);

	const rows: ComparisonRow[] = [
		{
			label: t(
				"checkpointLanding.curatorChoice.row.planning",
				"Planning and progress tracking",
			),
			industry: { state: "yes" },
			ai: { state: "yes" },
		},
		{
			label: t(
				"checkpointLanding.curatorChoice.row.sprintReview",
				"Sprint progress review",
			),
			industry: {
				state: "yes",
				note: t(
					"checkpointLanding.curatorChoice.note.liveSession",
					"live session",
				),
			},
			ai: {
				state: "partial",
				note: t(
					"checkpointLanding.curatorChoice.note.writtenSummary",
					"written summary",
				),
			},
		},
		{
			label: t(
				"checkpointLanding.curatorChoice.row.signals",
				"Weekly tracking of team activity signals",
			),
			industry: { state: "yes" },
			ai: { state: "yes" },
		},
		{
			label: t(
				"checkpointLanding.curatorChoice.row.experience",
				"A professional with hands-on game industry experience",
			),
			industry: { state: "yes" },
			ai: { state: "no" },
		},
		{
			label: t(
				"checkpointLanding.curatorChoice.row.judgement",
				"A judgement of how the game plays",
			),
			industry: { state: "yes" },
			ai: { state: "no" },
		},
	];

	const vat = t("checkpointLanding.curatorChoice.vat", "+ VAT");

	return (
		<CheckpointSection tone="sunken" anchor="curators">
			<div className={styles.layout}>
				<SectionIntro
					layout="split"
					eyebrow={t("checkpointLanding.curatorChoice.eyebrow", "The curator")}
					headline={t(
						"checkpointLanding.curatorChoice.headline",
						"Choose the kind of judgement your project needs.",
					)}
					lead={t(
						"checkpointLanding.curatorChoice.lead",
						"Both options give the project the same 28-day structure: sprints, deadlines, tasks, devlogs and activity signals. Choose live judgement from an industry professional or a lower-cost written AI review.",
					)}
				/>

				<div className={styles.comparison}>
					<div className={styles.labels}>
						<div className={styles.labelsHead} />
						<ul className={styles.labelsList}>
							{rows.map((row, index) => (
								<li
									key={row.label}
									className={styles.labelsCell}
									data-hovered={hoveredRow === index || undefined}
									onMouseEnter={() => setHoveredRow(index)}
									onMouseLeave={() => setHoveredRow(null)}
								>
									{row.label}
								</li>
							))}
						</ul>
						<div className={styles.labelsPrice}>
							{t("checkpointLanding.curatorChoice.costLabel", "What it costs")}
						</div>
					</div>

					<Column
						hoveredRow={hoveredRow}
						onHoverRow={setHoveredRow}
						tone="accent"
						title={t(
							"checkpointLanding.curatorChoice.industry.title",
							"Industry curator",
						)}
						summary={t(
							"checkpointLanding.curatorChoice.industry.summary",
							"Years behind them, and a call every sprint.",
						)}
						rows={rows}
						side="industry"
						vat={vat}
						price={t(
							"checkpointLanding.curatorChoice.industry.price",
							"From $250 · by level, rate and team size",
						)}
					/>

					<Column
						hoveredRow={hoveredRow}
						onHoverRow={setHoveredRow}
						tone="muted"
						title={t("checkpointLanding.curatorChoice.ai.title", "AI curator")}
						badge={t("checkpointLanding.curatorChoice.ai.badge", "Soon")}
						summary={t(
							"checkpointLanding.curatorChoice.ai.summary",
							"No live calls. A written review-summary after each sprint.",
						)}
						rows={rows}
						side="ai"
						vat={vat}
						price={t(
							"checkpointLanding.curatorChoice.ai.price",
							"$19 · any team size",
						)}
					/>
				</div>
			</div>
		</CheckpointSection>
	);
};
