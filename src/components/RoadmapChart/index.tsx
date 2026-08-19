import { IconShieldCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	ConfigProvider,
	DatePicker,
	Flex,
	Grid,
	message,
	Typography,
} from "antd";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./style.module.scss";

const { Text } = Typography;

/**
 * Only what the chart draws.
 *
 * Deliberately narrower than `ProjectWorkflowWithSteps`: the scout's project
 * card shows the same roadmap read-only, and it has no reason to assemble a
 * whole Prisma workflow — tasks, equity promises and all — to do it.
 */
export type RoadmapStep = {
	id: string;
	name: string;
	order: number;
	plannedAt: Date | string | null;
};

export type RoadmapWorkflow = {
	projectId: string;
	steps: RoadmapStep[];
	currentStep: RoadmapStep;
};

export const RoadmapChart = ({
	workflow,
	editable = false,
}: {
	workflow: RoadmapWorkflow;
	editable?: boolean;
}) => {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const screens = Grid.useBreakpoint();
	const roadmapRef = useRef<HTMLDivElement>(null);
	const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [currentProgress, setCurrentProgress] = useState(0);
	const steps = useMemo(
		() => workflow.steps.slice(1).slice(0, -1),
		[workflow.steps],
	);

	const screenSteps = useMemo(() => {
		if (screens.lg) return steps;

		const first = workflow.currentStep.order;
		if (first <= 1) {
			return steps.slice(0, 3);
		}

		if (first >= steps.length - 1) {
			return steps.slice(-3);
		}

		return steps.slice(first - 2, first + 1);
	}, [workflow.currentStep, steps, screens]);

	const { mutate: updateStepMutation } = useMutation({
		mutationFn: (data: { id: string; plannedAt: Date | null }) =>
			axios.put("/api/user/project/workflow/step", data),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["project-workflow", workflow.projectId],
			});

			const messageSetDateText = t(
				"modal.roadmapChart.updateSuccess",
				"Set {date} date for {step}",
				{
					date: dayjs(variables.plannedAt).format("ll"),
					step: steps.find((step) => step.id === variables.id)?.name,
				},
			);

			const messageClearDateText = t(
				"modal.roadmapChart.clearSuccess",
				"Clear date for {step}",
				{
					step: steps.find((step) => step.id === variables.id)?.name,
				},
			);

			message.success(
				variables.plannedAt != null ? messageSetDateText : messageClearDateText,
			);
		},
		onError: (error) => {
			message.error(
				t("modal.roadmapChart.updateError", "Error updating step date"),
			);
		},
	});

	const calculateProgress = useCallback(() => {
		if (stepRefs.current.length === 0 || !roadmapRef.current) return;

		// Find current step index in screenSteps (not all steps)
		const currentStepIndex = screenSteps.findIndex(
			(step) => step.id === workflow.currentStep.id,
		);

		// If current step is not in screenSteps, don't show progress
		if (currentStepIndex === -1) {
			setCurrentProgress(0);
			return;
		}

		const first = stepRefs.current[0]?.getBoundingClientRect();
		const current = stepRefs.current[currentStepIndex]?.getBoundingClientRect();

		const totalWidth = roadmapRef.current.offsetWidth;

		// Nothing laid out yet — leave the marker where it is rather than
		// snapping it back to the start of the road.
		if (!first || !current || totalWidth === 0) return;

		setCurrentProgress(((current.left - first.left) / totalWidth) * 100);
	}, [workflow.currentStep, screenSteps]);

	useEffect(() => {
		calculateProgress();

		// The chart also lives inside a modal, which is still animating when it
		// first paints: measuring then puts "You're here" at the very start of the
		// road, over a stage the project left long ago. Watching the container
		// rather than the window is what makes it re-measure once it settles.
		const container = roadmapRef.current;
		if (!container) return;

		const observer = new ResizeObserver(() => calculateProgress());
		observer.observe(container);

		return () => observer.disconnect();
	}, [calculateProgress]);

	const handleDateChange = (stepId: string, date: Dayjs) => {
		updateStepMutation({ id: stepId, plannedAt: date?.toDate() || null });
	};

	const disableStepDate = useCallback(
		(stepId: string, current: Dayjs) => {
			// Get current step index
			const currentStepIndex = steps.findIndex((step) => step.id === stepId);
			if (currentStepIndex === -1) return true;

			// Get future steps (after current step)
			const futureSteps = steps.slice(currentStepIndex + 1, steps.length - 1);
			const futureStepsWithDates = futureSteps.filter((step) => step.plannedAt);

			// If there are future steps with dates, limit to minimum of them
			if (futureStepsWithDates.length > 0) {
				const futureDates = futureStepsWithDates.map((step) =>
					dayjs(step.plannedAt!),
				);
				const minFutureDate = futureDates.reduce((min, date) =>
					date.isBefore(min) ? date : min,
				);
				if (current >= minFutureDate) {
					return true;
				}
			}

			// Get past steps (before current step)
			const pastSteps = steps.slice(0, currentStepIndex);
			const pastStepsWithDates = pastSteps.filter((step) => step.plannedAt);

			// If there are past steps with dates, limit from maximum of them
			if (pastStepsWithDates.length > 0) {
				const pastDates = pastStepsWithDates.map((step) =>
					dayjs(step.plannedAt!),
				);
				const maxPastDate = pastDates.reduce((max, date) =>
					date.isAfter(max) ? date : max,
				);
				if (current <= maxPastDate) {
					return true;
				}
			}

			return false;
		},
		[steps, workflow],
	);

	return (
		<ConfigProvider
			theme={{ components: { DatePicker: { inputFontSizeSM: 10 } } }}
		>
			<Flex
				ref={roadmapRef}
				justify="space-between"
				align="center"
				className={styles.roadmapContainer}
			>
				<div
					className={styles.progressContainer}
					style={{ width: `${currentProgress}%` }}
				>
					<div className={styles.currentTime}>
						{/* A badge with a tick, the shape this marker has always had —
						    the icon migration swapped `MdBeenhere` for a rosette, whose
						    scalloped edge reads as a sticker rather than a marker. */}
						<span className={styles.currentTimeText}>
							You&apos;re here
							<IconShieldCheck />
						</span>
					</div>
				</div>

				{screenSteps.map((step, idx) => (
					<Flex
						vertical
						key={step.id}
						className={styles.stepContainer}
						ref={(el: HTMLDivElement | null) => {
							// Cleared as well as set: a narrower breakpoint leaves the
							// wider one's nodes behind otherwise, and they measure as if
							// they were still on screen.
							stepRefs.current[idx] = el;
						}}
					>
						<div className={styles.dateContainer}>
							{!editable ? (
								<Text ellipsis className={styles.dateText}>
									{step.plannedAt
										? dayjs(step.plannedAt).format("ll")
										: "unknown date"}
								</Text>
							) : (
								<DatePicker
									value={step.plannedAt ? dayjs(step.plannedAt) : undefined}
									size="small"
									placement="topLeft"
									suffixIcon={null}
									format="ll"
									allowClear={idx > 0 ? { clearIcon: <IconX /> } : false}
									variant="borderless"
									placeholder="set date"
									onChange={(date) => {
										if (date) handleDateChange(step.id, date);
									}}
									disabledDate={(current) => disableStepDate(step.id, current)}
									classNames={{
										root: styles.dateInput,
										popup: { root: styles.dateInputPopup },
									}}
								/>
							)}
						</div>
						<Text
							ellipsis
							style={{ maxWidth: "90%" }}
							className={`${styles.stepName} ${step.id === workflow.currentStep.id ? styles.nextStepName : ""}`}
						>
							{step.name}
						</Text>
					</Flex>
				))}

				<div className={styles.centerLine}>
					<div className={styles.arrowRight} />
				</div>
			</Flex>
		</ConfigProvider>
	);
};
