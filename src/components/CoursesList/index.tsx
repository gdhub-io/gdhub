import type {
	Course,
	CourseCurriculum,
	CourseGroup,
	CourseGroupSchedule,
	WorkDirection,
} from "@gdhub-io/gdhub-prisma";
import { IconCurrencyEuro } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Col, Flex, Row, Space, Spin, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

const CoursesList = ({ location }: { location?: "hub" }) => {
	const { t } = useTranslate();

	const {
		data: courses,
		isFetched,
		isLoading,
	} = useQuery({
		queryKey: ["courses"],
		queryFn: () =>
			axios.get<
				(Course & {
					direction: WorkDirection;
					groups: (CourseGroup & {
						curriculum: CourseCurriculum;
						schedule: CourseGroupSchedule[];
					})[];
				})[]
			>("/api/courses"),
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
			{!!courses?.data && isFetched ? (
				<Row gutter={[16, 16]} wrap>
					{courses.data.map((course, idx) => {
						return (
							<Col span={24} md={12} lg={6} key={`job-${idx.toString()}`}>
								<div className={styles.card}>
									<div
										className={[
											styles.cardContent,
											"bg-direc-" +
												course.direction?.name
													.replace(" & ", "-")
													.replace(" ", "-"),
										].join(" ")}
									>
										<div className={styles.cardDate}>
											{t("courses.list.validUntil", "Starts at")}{" "}
											{dayjs(course.groups[0].schedule[0].date).format("ll")}
										</div>
									</div>

									<div className={styles.cardTitle}>
										<Space orientation="vertical" size={0}>
											<Text ellipsis>{course.direction?.name}</Text>
											<Title
												ellipsis={{ rows: 2 }}
												level={2}
												style={{ margin: 0, height: "60.8px" }}
											>
												{course.name}
											</Title>
										</Space>
									</div>

									<div className={styles.cardFooter}>
										<div className={styles.footerContent}>
											{course.groups[0].curriculum?.price ? (
												<Flex align="center" gap={4}>
													<Text strong>Price:</Text>
													<Text strong>
														{course.groups[0].curriculum?.price}
													</Text>
													<IconCurrencyEuro size={16} />
												</Flex>
											) : (
												<Text>Free</Text>
											)}
											<Text>38 lessons</Text>
										</div>

										<Link
											href={
												location === "hub"
													? `/hub/courses/${course.slug}`
													: `/course/${course.slug}`
											}
										>
											<Button type="primary" className="black-btn">
												{t("course-card.details-button", "Details")}
											</Button>
										</Link>
									</div>
								</div>
							</Col>
						);
					})}
				</Row>
			) : (
				<p>
					{t(
						"courses.list.noOpenCourses",
						"There are no open courses at the moment",
					)}
				</p>
			)}
		</>
	);
};

export default CoursesList;
