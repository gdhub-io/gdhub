import type { TeamVacancy, WorkDirection } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Col, Row, Space, Typography } from "antd";
import axios from "axios";
import { VacancyCard, type VacancyRateType } from "@/components/VacancyCard";

const { Title, Paragraph } = Typography;

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
		<div>
			<Space orientation="vertical" style={{ width: "100%" }}>
				<Title level={2}>{t("vacancy.title", "Vacancies")}</Title>
				<Paragraph type="secondary" style={{ fontSize: 12 }}>
					{t(
						"vacancies.list.description",
						"All project participants, responding to vacancies, accept the conditions that for the period of participation in the selected project, work is not paid until the moment of receipt of funding or if, other conditions are not indicated in vacancies.The time you spent is investment in the project that you choose.From how every member teams, and the team as a whole, will work on the project, depends whether these investments will be able to convert In money or not.In any case, your resume will become more significant when it will have information about participation In real projects.",
					)}
				</Paragraph>
			</Space>

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
	);
};

export default ProjectVacancies;
