"use client";

import { IconAlertCircle, IconEyeOff } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	App,
	Button,
	ConfigProvider,
	Form,
	Input,
	Rate,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useId, useState } from "react";
import {
	alreadyRatedFeedback,
	type RateCheckpointInput,
	useCheckpointFeedback,
	useRateCheckpoint,
} from "@/hooks/checkpoint-feedback";
import type { CheckpointFeedbackDto } from "@/types/checkpoints";
import styles from "./style.module.scss";
import { rateTheme } from "./theme";

const COMMENT_MAX = 500;
const THEME = rateTheme();

export function useStarLabels() {
	const { t } = useTranslate();
	return [
		t("checkpoints.rating.stars.1", "Not at all"),
		t("checkpoints.rating.stars.2", "Not much use"),
		t("checkpoints.rating.stars.3", "Somewhat"),
		t("checkpoints.rating.stars.4", "Useful"),
		t("checkpoints.rating.stars.5", "Very useful"),
	];
}

export type CheckpointRatingViewProps = {
	/** Null while unanswered; a value is the final, read-only view. */
	feedback: CheckpointFeedbackDto | null;
	sending?: boolean;
	failed?: boolean;
	onSend: (input: RateCheckpointInput) => void;
	/** Called when the form is put back to unanswered, to drop a failed send. */
	onCancel?: () => void;
	/** A star and comment already picked, for the stories. */
	defaultRating?: number;
	defaultComment?: string;
};

/** Frames 07.4 (`b2YQQN`) and 13.6a–e: the buyer rates the assessment, once. */
export function CheckpointRatingView({
	feedback,
	sending = false,
	failed = false,
	onSend,
	onCancel,
	defaultRating = 0,
	defaultComment = "",
}: CheckpointRatingViewProps) {
	const { t } = useTranslate();
	const labels = useStarLabels();
	const commentId = useId();
	const [rating, setRating] = useState(defaultRating);
	const [hover, setHover] = useState<number>();
	const [comment, setComment] = useState(defaultComment);

	const hint = (
		<Typography.Text className={`${styles.hint} ${styles.tertiary}`}>
			<IconEyeOff size={14} />
			{t(
				"checkpoints.rating.hint",
				"Only the GDHub team sees your rating. The curator doesn't.",
			)}
		</Typography.Text>
	);

	if (feedback) {
		return (
			<div className={styles.block}>
				<div className={styles.sent}>
					<Typography.Text className={styles.question}>
						{t("checkpoints.rating.yours", "Your rating")}
					</Typography.Text>
					<ConfigProvider theme={THEME}>
						<Rate disabled size="small" value={feedback.rating} />
					</ConfigProvider>
					<Typography.Text className={`${styles.small} ${styles.tertiary}`}>
						{dayjs(feedback.createdAt).format("D MMM")}
					</Typography.Text>
				</div>
				{feedback.comment && (
					<Typography.Text type="secondary" className={styles.comment}>
						{feedback.comment}
					</Typography.Text>
				)}
				{hint}
			</div>
		);
	}

	const cancel = () => {
		setRating(0);
		setComment("");
		onCancel?.();
	};
	const send = () => {
		const text = comment.trim();
		onSend({ rating, ...(text ? { comment: text } : {}) });
	};
	const shown = hover || rating;

	return (
		<div className={styles.block}>
			<div className={styles.row}>
				<Typography.Text className={styles.question}>
					{t("checkpoints.rating.question", "Was this assessment any use?")}
				</Typography.Text>
				<div className={styles.stars}>
					{shown > 0 && (
						<Typography.Text type="secondary" className={styles.small}>
							{labels[shown - 1]}
						</Typography.Text>
					)}
					<ConfigProvider theme={THEME}>
						<Rate
							allowClear={false}
							tooltips={labels}
							value={rating}
							disabled={sending}
							className={sending ? styles.sending : undefined}
							onChange={setRating}
							onHoverChange={setHover}
						/>
					</ConfigProvider>
				</div>
			</div>

			{rating > 0 && (
				<>
					<Form layout="vertical" component={false}>
						<Form.Item
							htmlFor={commentId}
							className={styles.field}
							label={
								<span className={styles.label}>
									{t("checkpoints.rating.commentLabel", "Comment")}
									<span className={styles.tertiary}>
										{t("checkpoints.rating.commentOptional", "(optional)")} ·{" "}
										{comment.length} / {COMMENT_MAX}
									</span>
								</span>
							}
						>
							<Input.TextArea
								id={commentId}
								variant="filled"
								maxLength={COMMENT_MAX}
								autoSize={{ minRows: 3, maxRows: 6 }}
								placeholder={t(
									"checkpoints.rating.commentPlaceholder",
									"What was right or wrong about it?",
								)}
								value={comment}
								disabled={sending}
								onChange={(event) => setComment(event.target.value)}
							/>
						</Form.Item>
					</Form>

					{failed && (
						<Alert
							type="error"
							showIcon
							icon={<IconAlertCircle size={16} />}
							title={t(
								"checkpoints.rating.failed",
								"Couldn't send your rating. Try again.",
							)}
						/>
					)}

					<div className={styles.actions}>
						<Typography.Text
							className={`${styles.final} ${styles.small} ${styles.tertiary}`}
						>
							{t("checkpoints.rating.final", "Once sent, it can't be changed.")}
						</Typography.Text>
						<Button
							type="text"
							size="small"
							disabled={sending}
							onClick={cancel}
						>
							{t("checkpoints.rating.cancel", "Cancel")}
						</Button>
						<Button
							type="primary"
							size="small"
							loading={sending}
							onClick={send}
						>
							{t("checkpoints.rating.send", "Send")}
						</Button>
					</div>
				</>
			)}

			{hint}
		</div>
	);
}

/** The rating block for the checkpoint's rater; renders nothing for anyone else. */
export function CheckpointRating({ checkpointId }: { checkpointId: string }) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const feedback = useCheckpointFeedback(checkpointId);
	const rate = useRateCheckpoint(checkpointId);

	if (!feedback.data) return null;

	return (
		<CheckpointRatingView
			feedback={feedback.data.feedback}
			sending={rate.isPending}
			failed={rate.isError && !alreadyRatedFeedback(rate.error)}
			onCancel={rate.reset}
			onSend={(input) =>
				rate.mutate(input, {
					onSuccess: () =>
						message.success(
							t("checkpoints.rating.saved", "Thanks — your rating is saved"),
						),
				})
			}
		/>
	);
}
