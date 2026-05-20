import { AiOutlineClose } from "@react-icons/all-files/ai/AiOutlineClose";
import { MdBeenhere } from "@react-icons/all-files/md/MdBeenhere";
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
import type { ProjectWorkflowWithSteps } from "../WorkflowContent";
import styles from "./style.module.scss";

const { Text } = Typography;

export const RoadmapChart = ({
	workflow,
	editable = false,
}: {
	workflow: ProjectWorkflowWithSteps;
	editable?: boolean;
}) => {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const screens = Grid.useBreakpoint();
	const roadmapRef = useRef<HTMLDivElement>(null);
	const stepRefs = useRef<HTMLDivElement[]>([]);
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

		const stepPosX = [];
		for (let i = 0; i <= stepRefs.current.length; i++) {
			const rect = stepRefs.current[i]?.getBoundingClientRect();
			stepPosX.push(rect?.left || 0);
		}

		// Find current step index in screenSteps (not all steps)
		const currentStepIndex = screenSteps.findIndex(
			(step) => step.id === workflow.currentStep.id,
		);

		// If current step is not in screenSteps, don't show progress
		if (currentStepIndex === -1) {
			setCurrentProgress(0);
			return;
		}

		const completedWidth = stepPosX[currentStepIndex] - stepPosX[0];
		const totalWidth = roadmapRef.current.offsetWidth;
		const progress = totalWidth > 0 ? (completedWidth / totalWidth) * 100 : 0;

		setCurrentProgress(progress);
	}, [workflow.currentStep, screenSteps, roadmapRef.current, stepRefs.current]);

	useEffect(() => {
		calculateProgress();

		// Recalculate on window resize
		const handleResize = () => calculateProgress();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, [
		workflow.currentStep,
		screenSteps,
		roadmapRef.current?.offsetWidth,
		calculateProgress,
	]);

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
						<span className={styles.currentTimeText}>
							You&apos;re here
							<MdBeenhere />
						</span>
					</div>
				</div>

				{screenSteps.map((step, idx) => (
					<Flex
						vertical
						key={step.id}
						className={styles.stepContainer}
						ref={(el: HTMLDivElement | null) => {
							if (el) stepRefs.current[idx] = el;
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
									allowClear={
										idx > 0 ? { clearIcon: <AiOutlineClose /> } : false
									}
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
