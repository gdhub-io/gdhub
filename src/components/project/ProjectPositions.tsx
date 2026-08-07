"use client";

import type { TeamVacancy, WorkDirection } from "@gdhub-io/gdhub-prisma";
import { IconChevronDown } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Col, Row } from "antd";
import axios from "axios";
import { useMemo } from "react";
import { getWorkDirection } from "@/components/DirectionBadge";
import { VacancyCard, type VacancyRateType } from "@/components/VacancyCard";
import styles from "./ProjectPositions.module.scss";

type Vacancy = TeamVacancy & {
	direction: WorkDirection;
	team: {
		project: {
			id: string;
			slug: string;
			name: string;
			description: string;
		};
	};
};

/** How many direction chips the summary row shows before it says "and others". */
const SUMMARY_DIRECTIONS = 2;

/**
 * The team's open positions.
 *
 * On a phone the block collapses to a single pill: the count of what is open,
 * read by direction rather than by title — three programming, two art — because
 * a list of job titles is not something you scan on a narrow screen. Opening it
 * gives the same cards the wide layout shows outright.
 */
export function ProjectPositions({ teamId }: { teamId: string }) {
	const { t } = useTranslate();

	const { data } = useQuery({
		queryKey: ["team-vacancy", teamId],
		queryFn: () =>
			axios.get<Vacancy[]>("/api/project/vacancies", { params: { teamId } }),
		enabled: !!teamId,
	});

	const vacancies = data?.data ?? [];

	/** Direction name → how many positions are open in it, biggest first. */
	const byDirection = useMemo(() => {
		const counts = new Map<string, number>();
		for (const vacancy of vacancies) {
			const name = vacancy.direction.name;
			counts.set(name, (counts.get(name) ?? 0) + 1);
		}
		return [...counts.entries()].sort((left, right) => right[1] - left[1]);
	}, [vacancies]);

	if (!vacancies.length) return null;

	const shown = byDirection.slice(0, SUMMARY_DIRECTIONS);
	const hasMore = byDirection.length > shown.length;

	return (
		<details className={styles.positions}>
			<summary className={styles.summary}>
				<span className={styles.left}>
					<span className={styles.label}>
						{t("page.project.openPositions", "Open positions")}
					</span>
					<span className={styles.directions}>
						{shown.map(([name, count]) => {
							const { slug, icon: Icon, ink } = getWorkDirection(name);
							return (
								<span key={name} className={styles.direction} title={name}>
									<span className={`${styles.tile} bg-direc-${slug}`}>
										<Icon size={11} stroke={2} color={ink} />
									</span>
									{count}
								</span>
							);
						})}
						{hasMore && (
							<span className={styles.others}>
								{t("page.project.andOtherDirections", "and others")}
							</span>
						)}
					</span>
				</span>
				<IconChevronDown size={18} className={styles.chevron} />
			</summary>

			<div className={styles.panel}>
				<Row gutter={[16, 16]} wrap>
					{vacancies.map((vacancy) => (
						<Col span={24} md={12} key={vacancy.id}>
							<VacancyCard
								directionName={vacancy.direction.name}
								title={vacancy.title}
								projectName={vacancy.team.project?.name}
								finishedAt={vacancy.finishedAt}
								promisePercentage={vacancy.promisePercentage}
								offeredAmount={vacancy.offeredAmount}
								offeredRateType={
									vacancy.offeredRateType as VacancyRateType | null
								}
								validUntilLabel={t("vacancies.list.validUntil", "Relevant to")}
								detailsLabel={t("job-card.details-button", "Details")}
								detailsHref={`/job/${vacancy.id}`}
							/>
						</Col>
					))}
				</Row>
			</div>
		</details>
	);
}

export default ProjectPositions;
