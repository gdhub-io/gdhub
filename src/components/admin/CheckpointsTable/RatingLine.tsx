"use client";

import { IconMessage } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Rate, Tooltip } from "antd";
import dayjs from "dayjs";
import type { CheckpointFeedbackDto } from "@/types/checkpoints";
import own from "./style.module.scss";

/** 13.6f (`cEF7c`): the author's stars under the status; the comment in its tooltip. */
export function RatingLine({
	rating,
	project,
}: {
	rating: CheckpointFeedbackDto;
	project: string;
}) {
	const { t } = useTranslate();

	return (
		<Tooltip
			classNames={{ root: own.ratingTip }}
			title={
				<div className={own.ratingBody}>
					<div className={own.ratingHead}>
						<Rate disabled size="small" value={rating.rating} />
						<span className={own.ratingMeta}>
							{t("admin.checkpoints.list.ratingOf", "{rating} of 5 · {date}", {
								rating: rating.rating,
								date: dayjs(rating.createdAt).format("D MMM"),
							})}
						</span>
					</div>
					{rating.comment && (
						<>
							<span>“{rating.comment}”</span>
							<span className={own.ratingMeta}>
								{t(
									"admin.checkpoints.list.ratingBy",
									"— the author, {project}",
									{
										project,
									},
								)}
							</span>
						</>
					)}
				</div>
			}
		>
			<span className={own.rating}>
				<span className={own.star}>★</span>
				<span className={own.ratingValue}>{rating.rating}</span>
				{rating.comment && <IconMessage size={14} className={own.ratingIcon} />}
			</span>
		</Tooltip>
	);
}
