import type { TeamVacancy, WorkDirection } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Col, Row } from "antd";
import axios from "axios";
import { VacancyCard, type VacancyRateType } from "@/components/VacancyCard";

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

interface ProjectVacanciesArgs {
	teamId: string;
}

/**
 * The team's open positions as cards. The caller supplies the frame and the
 * title — on the project page that is a card on desktop and a foldable row on
 * a phone, and the block should not carry two different opinions about it.
 */
const ProjectVacancies = ({ teamId }: ProjectVacanciesArgs) => {
	const { t } = useTranslate();

	const { data: projectVacancies } = useQuery({
		queryKey: ["team-vacancy", teamId],
		queryFn: () =>
			axios.get<Vacancy[]>("/api/project/vacancies", { params: { teamId } }),
		enabled: !!teamId,
	});

	const vacancies = projectVacancies?.data ?? [];

	if (!vacancies.length) return null;

	return (
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
						offeredRateType={vacancy.offeredRateType as VacancyRateType | null}
						validUntilLabel={t("vacancies.list.validUntil", "Relevant to")}
						detailsLabel={t("job-card.details-button", "Details")}
						detailsHref={`/job/${vacancy.id}`}
					/>
				</Col>
			))}
		</Row>
	);
};

export default ProjectVacancies;
