import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Card, Col, Row, Skeleton, Space, Statistic, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import React from "react";

const { Text, Title } = Typography;

interface UserEquitySectionProps {
	projectId?: string;
}

const UserEquitySection = ({ projectId }: UserEquitySectionProps) => {
	const { t } = useTranslate();

	const { data: summary, isLoading: isLoadingMemberEquity } = useQuery({
		queryKey: ["project-equity-member-current", projectId],
		queryFn: () =>
			axios.get("/api/user/project/member/summary", {
				params: { projectId },
			}),
		enabled: !!projectId,
	});

	const daysOnProject = summary?.data.periodOnProject;

	const valueStyle = {
		fontSize: "24px",
		fontWeight: 600,
	};

	const suffixStyle = {
		fontSize: "16px",
		fontWeight: 400,
	};

	const renderStatistic = (
		title: string,
		value: string | number,
		suffix?: string,
		description?: string,
	) => {
		return (
			<>
				<Statistic
					title={title}
					value={value}
					valueRender={() =>
						isLoadingMemberEquity ? (
							<Skeleton.Input style={{ width: 100, height: 24 }} active />
						) : (
							value
						)
					}
					suffix={suffix && <span style={suffixStyle}>{suffix}</span>}
					precision={1}
					valueStyle={valueStyle}
				/>
				{description && (
					<Text type="secondary" style={{ fontSize: "12px" }}>
						{description}
					</Text>
				)}
			</>
		);
	};

	return (
		<Space
			orientation="vertical"
			size="middle"
			style={{ width: "100%", marginBottom: "32px" }}
		>
			<Title level={4}>{t("Your Participation")}</Title>

			<Row gutter={[16, 16]}>
				{Boolean(summary?.data.promisedEquity) && (
					<Col xs={24} sm={12} md={6}>
						<Card style={{ height: "100%", textAlign: "center" }}>
							{renderStatistic(
								t("Promised Equity"),
								summary?.data.promisedEquity,
								"%",
								summary?.data.workflowStepForVested
									? `${t("After completing")} "${summary?.data.workflowStepForVested}" ${t("promised equity will become actual")}`
									: undefined,
							)}
							{summary?.data.nextMilestone && (
								<Text type="secondary" style={{ fontSize: "12px" }}>
									{t("Next milestone")}:{" "}
									{isLoadingMemberEquity ? (
										<Skeleton.Input style={{ width: 60, height: 16 }} active />
									) : (
										summary?.data.nextMilestone
									)}
								</Text>
							)}
						</Card>
					</Col>
				)}

				{Boolean(summary?.data.actualEquity) && (
					<Col xs={24} sm={12} md={6}>
						<Card style={{ height: "100%", textAlign: "center" }}>
							{renderStatistic(
								t("Actual Equity"),
								summary?.data.actualEquity,
								"%",
								t("Current vested equity"),
							)}
						</Card>
					</Col>
				)}

				<Col xs={24} sm={12} md={6}>
					<Card style={{ height: "100%", textAlign: "center" }}>
						{renderStatistic(
							t("Days on Project"),
							daysOnProject,
							t("days"),
							summary?.data.startedAt
								? `${t("Since")}: ${dayjs(summary?.data.startedAt).format("DD.MM.YYYY")}`
								: undefined,
						)}
					</Card>
				</Col>

				<Col xs={24} sm={12} md={6}>
					<Card style={{ height: "100%", textAlign: "center" }}>
						{renderStatistic(
							t("Available Hours"),
							summary?.data.availableHours[0] +
								" - " +
								summary?.data.availableHours[1],
							t("hours/week"),
							t("Weekly commitment"),
						)}
					</Card>
				</Col>
			</Row>
		</Space>
	);
};

export default UserEquitySection;
