import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { AiOutlineClose } from '@react-icons/all-files/ai/AiOutlineClose'
import { MdBeenhere } from '@react-icons/all-files/md/MdBeenhere'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ConfigProvider, DatePicker, Flex, Typography } from 'antd'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import styles from './style.module.scss'
import { ProjectWorkflowWithSteps } from '../WorkflowContent'

const { Text } = Typography

export const RoadmapChart = ({
	workflow,
	editable = false,
}: {
	workflow: ProjectWorkflowWithSteps
	editable?: boolean
}) => {
	const queryClient = useQueryClient()
	const roadmapRef = useRef<HTMLDivElement>(null)
	const stepRefs = useRef<HTMLDivElement[]>([])
	const [currentProgress, setCurrentProgress] = useState(0)
	const steps = useMemo(() => workflow.steps.slice(1).slice(0, -1), [workflow.steps])

	const { mutate: updateStepMutation } = useMutation({
		mutationFn: (data: { id: string; plannedAt: Date | null }) => axios.put('/api/user/project/workflow/step', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['project-workflow', workflow.projectId] })
		},
	})

	const calculateProgress = useCallback(() => {
		if (stepRefs.current.length === 0 || !roadmapRef.current) return

		const stepPosX = []
		for (let i = 0; i <= stepRefs.current.length; i++) {
			const rect = stepRefs.current[i]?.getBoundingClientRect()
			stepPosX.push(rect?.left || 0)
		}

		const currentStepIndex = steps.findIndex((step) => step.id === workflow.currentStep.id)
		const completedWidth = stepPosX[currentStepIndex] - stepPosX[0]
		const totalWidth = roadmapRef.current.offsetWidth
		const progress = totalWidth > 0 ? (completedWidth / totalWidth) * 100 : 0

		setCurrentProgress(progress)

		console.log({ totalWidth, completedWidth, progress, stepPosX, currentStepIndex })
	}, [workflow.currentStep, steps.length, roadmapRef.current, stepRefs.current])

	useEffect(() => {
		calculateProgress()

		// Recalculate on window resize
		const handleResize = () => calculateProgress()
		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [workflow.currentStep, steps.length, roadmapRef.current?.offsetWidth])

	const handleDateChange = (stepId: string, date: Dayjs) => {
		updateStepMutation({ id: stepId, plannedAt: date?.toDate() || null })
	}

	const disableStepDate = (stepId: string, current: Dayjs) => {
		// Get current step index
		const currentStepIndex = steps.findIndex((step) => step.id === stepId)
		if (currentStepIndex === -1) return true

		// Check if date is before workflow creation
		if (current < dayjs(workflow.createdAt)) {
			return true
		}

		// Get future steps (after current step)
		const futureSteps = steps.slice(currentStepIndex + 1)
		const futureStepsWithDates = futureSteps.filter((step) => step.plannedAt)

		// If there are future steps with dates, limit to minimum of them
		if (futureStepsWithDates.length > 0) {
			const futureDates = futureStepsWithDates.map((step) => dayjs(step.plannedAt!))
			const minFutureDate = futureDates.reduce((min, date) => (date.isBefore(min) ? date : min))
			if (current >= minFutureDate) {
				return true
			}
		}

		// Get past steps (before current step)
		const pastSteps = steps.slice(0, currentStepIndex)
		const pastStepsWithDates = pastSteps.filter((step) => step.plannedAt)

		// If there are past steps with dates, limit from maximum of them
		if (pastStepsWithDates.length > 0) {
			const pastDates = pastStepsWithDates.map((step) => dayjs(step.plannedAt!))
			const maxPastDate = pastDates.reduce((max, date) => (date.isAfter(max) ? date : max))
			if (current <= maxPastDate) {
				return true
			}
		}

		return false
	}

	return (
		<ConfigProvider theme={{ components: { DatePicker: { inputFontSizeSM: 10 } } }}>
			<Flex ref={roadmapRef} justify="space-between" align="center" className={styles.roadmapContainer}>
				<div className={styles.progressContainer} style={{ width: `${currentProgress}%` }}>
					<div className={styles.currentTime}>
						<span className={styles.currentTimeText}>
							You&apos;re here
							<MdBeenhere />
						</span>
					</div>
				</div>

				{steps.map((step, idx) => (
					<Flex
						vertical
						key={step.id}
						className={styles.stepContainer}
						ref={(el: HTMLDivElement | null) => {
							if (el) stepRefs.current[idx] = el
						}}
					>
						<div className={styles.dateContainer}>
							{!editable ? (
								<Text ellipsis className={styles.dateText}>
									{idx === 0
										? dayjs(workflow.createdAt).format('ll')
										: step.plannedAt
											? dayjs(step.plannedAt).format('ll')
											: 'unknown date'}
								</Text>
							) : (
								<DatePicker
									value={idx === 0 ? dayjs(workflow.createdAt) : step.plannedAt ? dayjs(step.plannedAt) : undefined}
									size="small"
									placement="topLeft"
									suffixIcon={null}
									format="ll"
									allowClear={{ clearIcon: <AiOutlineClose /> }}
									variant="borderless"
									placeholder="set date"
									onChange={(date) => handleDateChange(step.id, date)}
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
							className={`${styles.stepName} ${step.id === workflow.currentStep.id ? styles.nextStepName : ''}`}
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
	)
}
