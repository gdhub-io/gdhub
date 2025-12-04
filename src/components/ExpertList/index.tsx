import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Row, Space, Spin, Typography } from "antd";
import axios from "axios";
import styles from "./style.module.scss";

type Expert = {
	id: string;
	name: string;
	image: string | null;
	profile: {
		name: string;
	} | null;
	specialities: Array<{
		id: string;
		name: string;
		level: prismaClient.SkillLevel;
		openForQuestions: string[];
		summary: string;
		specialization: string;
		direction: {
			id: string;
			name: string;
		};
	}>;
};

const { Title, Text, Paragraph } = Typography;

const ExpertList = ({
	filter,
	onClick,
}: {
	filter?: { workDirectionId?: string };
	onClick?: (expertId: string) => void;
}) => {
	const { t } = useTranslate();

	const { data: experts, isLoading } = useQuery<Expert[]>({
		queryKey: ["experts", filter?.workDirectionId],
		queryFn: () =>
			axios
				.get("/api/experts", {
					params: { workDirectionId: filter?.workDirectionId },
				})
				.then((res) => res.data),
		staleTime: Infinity,
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
			{!!experts && experts.length > 0 ? (
				<Row gutter={[16, 16]} wrap>
					{experts.map((expert, idx) => {
						return (
							<Col span={24} md={12} lg={8} key={`expert-${idx.toString()}`}>
								<div className={styles.expertCard}>
									<div
										className={[
											styles.expertCardContent,
											"bg-direc-" +
												expert.specialities[0].direction.name
													.replace(" & ", "-")
													.replace(" ", "-"),
										].join(" ")}
									>
										<div
											className={styles.expertCardAvatar}
											style={{
												backgroundImage: `url(${expert.image})`,
											}}
										/>

										<Space
											direction="vertical"
											size={0}
											style={{ flex: "100%" }}
										>
											<Text ellipsis>{expert.specialities[0].name}</Text>
											<Title
												ellipsis={{ rows: 2 }}
												level={2}
												style={{ margin: 0 }}
											>
												{expert.profile?.name || expert.name}
											</Title>
											<Paragraph ellipsis={{ rows: 3 }}>
												{expert.specialities?.[0]?.summary}
											</Paragraph>
										</Space>
									</div>
									<div className={styles.expertCardFooter}>
										<div className={styles.footerContent}>
											{expert.specialities[0].specialization ? (
												<Text strong ellipsis>
													{expert.specialities[0].specialization}
												</Text>
											) : null}
											<Text>specialization</Text>
										</div>

										<Button
											type="primary"
											onClick={() => {
												onClick?.(expert.id);
											}}
											className="black-btn"
										>
											{t("expert-card.details-button", "Details")}
										</Button>
									</div>
								</div>
							</Col>
						);
					})}
				</Row>
			) : (
				<div className={styles.noResults}>
					<Text>
						{t(
							"experts.page.noResults",
							"No experts found with the selected filter.",
						)}
					</Text>
				</div>
			)}
		</>
	);
};

export default ExpertList;
