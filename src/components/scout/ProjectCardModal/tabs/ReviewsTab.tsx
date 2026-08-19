"use client";

import { IconCircleCheck, IconMessageCircle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Tag, Typography } from "antd";
import { EmptyState } from "@/components/ui/EmptyState";
import { specialityLine } from "../format";
import { Person } from "../parts";
import styles from "../style.module.scss";
import type { CardReview } from "../types";
import { useCardSection } from "../useSection";

const { Text, Paragraph } = Typography;

export function ReviewsTab({ projectId }: { projectId: string }) {
	const { t } = useTranslate();
	const { data, isLoading } = useCardSection<CardReview[]>(
		projectId,
		"reviews",
	);

	if (isLoading)
		return <Skeleton active title={false} paragraph={{ rows: 6 }} />;

	if (!data?.length) {
		return (
			<EmptyState
				icon={IconMessageCircle}
				title={t("scout.card.reviews.empty", "No expert reviews yet")}
				description={t(
					"scout.card.reviews.emptyHint",
					"Reviews left by platform experts on this project will appear here.",
				)}
			/>
		);
	}

	const approved = data.filter((review) => review.isApproved).length;

	return (
		<Flex vertical gap={16}>
			<div className={styles.sectionHead}>
				<Text className={styles.sectionTitle}>
					{t("scout.card.reviews.title", "Expert reviews")}
				</Text>
				<span className={styles.scoreChip}>
					<IconCircleCheck size={16} />
					{t(
						"scout.card.reviews.score",
						"{approved} of {total} experts approved",
						{ approved, total: data.length },
					)}
				</span>
			</div>

			{data.map((review) => (
				<div key={review.id} className={styles.review}>
					<Flex justify="space-between" align="center" gap={16}>
						<Person
							size={40}
							name={review.expert.name}
							image={review.expert.image}
							caption={specialityLine(review.expert.speciality)}
						/>
						<Tag color={review.isApproved ? "green" : undefined}>
							{review.isApproved
								? t("scout.card.reviews.approved", "Approved")
								: t("scout.card.reviews.pending", "Not approved")}
						</Tag>
					</Flex>
					<Paragraph className={styles.reviewNotes}>
						&laquo;{review.notes}&raquo;
					</Paragraph>
				</div>
			))}
		</Flex>
	);
}
