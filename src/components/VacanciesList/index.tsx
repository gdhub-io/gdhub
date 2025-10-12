import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Row, Space, Spin, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useState } from "react";
import VacancyPreviewModal from "@/components/modals/VacancyPreviewModal";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

const VacanciesList = ({ location }: { location?: "hub" }) => {
	const { t } = useTranslate();
	const [selectedVacancyId, setSelectedVacancyId] = useState<string>();
	const {
		data: vacancies,
		isFetched,
		isLoading,
	} = useQuery({
		queryKey: ["vacancies"],
		queryFn: () =>
			axios.get<
				(prismaClient.TeamVacancy & {
					direction: prismaClient.WorkDirection;
					team: { project: { id: string; slug: string; name: string; description: string } };
				})[]
			>("/api/vacancies"),
		refetchOnWindowFocus: false,
		refetchInterval: 60000,
	});

	if (isLoading) {
		return (
			<div className={styles.loadingContainer}>
				<Spin />
			</div>
		);
	}

	return (
		<>
			{!!vacancies?.data && isFetched ? (
				<Row gutter={[16, 16]} wrap>
					{vacancies.data.map((vacancy) => {
						return (
							<Col span={24} md={12} lg={6} key={vacancy.id}>
								<div className={styles.jobCard}>
									<div
										className={[
											styles.jobCardContent,
											`bg-direc-${vacancy.direction.name.replace(" & ", "-").replace(" ", "-")}`,
										].join(" ")}
									>
										<div className={styles.jobCardDate}>
											{t("vacancies.list.validUntil", "Relevant to")}{" "}
											{dayjs(vacancy.finishedAt).format("ll")}
										</div>
										<Space direction="vertical" size={0}>
											<Text ellipsis>{vacancy.team.project?.name}</Text>
											<Title
												ellipsis={{ rows: 2 }}
												level={2}
												style={{ margin: 0, height: "60.8px" }}
											>
												{vacancy.title}
											</Title>
										</Space>
									</div>
									<div className={styles.jobCardFooter}>
										<div className={styles.footerContent}>
											{vacancy.promisePercentage ? (
												<Text strong>Equity offered: {vacancy.promisePercentage.toFixed(1)}%</Text>
											) : (
												<Text>negotiable</Text>
											)}
											<Text>terms of cooperation</Text>
										</div>

										<Button
											type="primary"
											href={!location ? `/job/${vacancy.id}` : undefined}
											onClick={
												location === "hub"
													? () => {
															setSelectedVacancyId(vacancy.id);
														}
													: undefined
											}
											className="black-btn"
										>
											{t("job-card.details-button", "Details")}
										</Button>
									</div>
								</div>
							</Col>
						);
					})}
				</Row>
			) : (
				<p>{t("vacancies.list.noOpenVacancies", "There are no open vacancies at the moment")}</p>
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
