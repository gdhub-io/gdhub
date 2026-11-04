"use client";

import { IconCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Table } from "antd";
import { BOX_TICK_STROKE } from "@/components/ui";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import type { AdvisorProjectDto } from "@/types/checkpoints";
import { Aside, Section } from "./Section";
import styles from "./style.module.scss";

const SPRINTS = Array.from(
	{ length: SPRINTS_PER_CHECKPOINT },
	(_, index) => index + 1,
);

type Seat = AdvisorProjectDto["team"][number];

export function TeamPulse({ team }: { team: AdvisorProjectDto["team"] }) {
	const { t } = useTranslate();
	const cells = team.flatMap((seat) => seat.pulse);
	const asked = cells.filter(
		(cell) => cell.state !== "notAsked" && cell.state !== "notOnTeam",
	).length;
	const confirmed = cells.filter((cell) => cell.state === "confirmed").length;

	return (
		<Section
			title={t("advisor.verdict.pulse", "Team pulse")}
			aside={
				<Aside>
					{t("advisor.verdict.pulseCount", "{confirmed} of {asked} confirmed", {
						confirmed,
						asked,
					})}
				</Aside>
			}
		>
			<Table<Seat>
				rowKey="id"
				size="small"
				pagination={false}
				className={styles.pulse}
				dataSource={team}
				locale={{
					emptyText: t(
						"advisor.project.teamEmpty",
						"Nobody has joined the team yet.",
					),
				}}
				columns={[
					{
						title: t("advisor.project.role", "Role"),
						key: "role",
						ellipsis: true,
						render: (_: unknown, seat: Seat) =>
							seat.position ?? seat.speciality?.name ?? "—",
					},
					...SPRINTS.map((sprint) => ({
						title: t("checkpoints.signals.sprintShort", "S{n}", { n: sprint }),
						key: `s${sprint}`,
						width: 44,
						align: "center" as const,
						render: (_: unknown, seat: Seat) =>
							seat.pulse.find((cell) => cell.sprint === sprint)?.state ===
							"confirmed" ? (
								<span className={styles.confirmed}>
									<IconCheck size={14} stroke={BOX_TICK_STROKE} />
								</span>
							) : (
								<span className={styles.muted}>—</span>
							),
					})),
				]}
			/>
		</Section>
	);
}
