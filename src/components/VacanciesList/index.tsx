import type { TeamVacancy, WorkDirection } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Col, Row, Segmented } from "antd";
import axios from "axios";
import { useMemo, useState } from "react";
import { directionSlug } from "@/components/DirectionBadge";
import { DirectionSelect } from "@/components/DirectionSelect";
import VacancyPreviewModal from "@/components/modals/VacancyPreviewModal";
import { LoadError } from "@/components/ui";
import { VacancyCard, type VacancyRateType } from "@/components/VacancyCard";
import styles from "./style.module.scss";
import { VacanciesListSkeleton } from "./VacanciesListSkeleton";

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

type CooperationType = "paid" | "equity" | "experience";

/** Classify a vacancy by its cooperation terms (paid takes precedence over equity). */
function cooperationType(v: Vacancy): CooperationType {
	if (v.offeredAmount != null && v.offeredRateType != null) return "paid";
	if (v.promisePercentage) return "equity";
	return "experience";
}

const VacanciesList = ({ location }: { location?: "hub" }) => {
	const { t } = useTranslate();
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>();
	const [typeFilter, setTypeFilter] = useState<CooperationType | "all">("all");
	const [directionFilter, setDirectionFilter] = useState<string>("all");

	const {
		data: vacancies,
		isPending,
		isLoadingError: failed,
		refetch,
	} = useQuery({
		queryKey: ["vacancies"],
		queryFn: () => axios.get<Vacancy[]>("/api/vacancies"),
		refetchOnWindowFocus: false,
		refetchInterval: 60000,
	});

	const list = vacancies?.data ?? [];

	/** Direction names actually present in the list, for the Select options. */
	const directionNames = useMemo(() => {
		const seen = new Map<string, string>();
		for (const v of list) {
			const slug = directionSlug(v.direction.name);
			if (!seen.has(slug)) seen.set(slug, v.direction.name);
		}
		return [...seen.values()];
	}, [list]);

	const filtered = useMemo(
		() =>
			list.filter((v) => {
				if (typeFilter !== "all" && cooperationType(v) !== typeFilter)
					return false;
				if (
					directionFilter !== "all" &&
					directionSlug(v.direction.name) !== directionFilter
				)
					return false;
				return true;
			}),
		[list, typeFilter, directionFilter],
	);

	return (
		<>
			{/* Drawn disabled while loading; hidden only once the board is known to be empty. */}
			{(isPending || failed || list.length > 0) && (
				<div className={styles.filterBar}>
					<Segmented<CooperationType | "all">
						value={typeFilter}
						onChange={setTypeFilter}
						disabled={isPending || failed}
						options={[
							{ label: t("vacancies.filter.type.all", "All"), value: "all" },
							{
								label: t("vacancies.filter.type.paid", "Paid"),
								value: "paid",
							},
							{
								label: t("vacancies.filter.type.equity", "Equity"),
								value: "equity",
							},
							{
								label: t("vacancies.filter.type.experience", "For experience"),
								value: "experience",
							},
						]}
					/>
					<DirectionSelect
						variant="filled"
						includeAll
						allLabel={t("vacancies.filter.allDirections", "All directions")}
						directions={directionNames}
						value={directionFilter}
						onChange={setDirectionFilter}
						disabled={isPending || failed}
						loading={isPending}
						style={{ width: 220 }}
					/>
				</div>
			)}

			{isPending ? (
				<VacanciesListSkeleton />
			) : failed ? (
				<LoadError
					title={t(
						"vacancies.list.error",
						"Open positions could not be loaded",
					)}
					onRetry={refetch}
				/>
			) : filtered.length > 0 ? (
				<Row gutter={[16, 16]} wrap>
					{filtered.map((vacancy, idx) => (
						<Col span={24} md={12} lg={6} key={`job-${idx.toString()}`}>
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
								detailsHref={location ? undefined : `/job/${vacancy.id}`}
								onDetails={
									location === "hub"
										? () => setSelectedVacancyId(vacancy.id)
										: undefined
								}
							/>
						</Col>
					))}
				</Row>
			) : (
				<p>
					{t(
						"vacancies.list.noOpenVacancies",
						"There are no open positions at the moment",
					)}
				</p>
			)}

			{location && (
				<VacancyPreviewModal
					vacancyId={selectedVacancyId}
					open={!!selectedVacancyId}
					onCancel={() => setSelectedVacancyId(undefined)}
					onOk={() => setSelectedVacancyId(undefined)}
				/>
			)}
		</>
	);
};

export default VacanciesList;
