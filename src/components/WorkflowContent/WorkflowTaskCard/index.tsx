import React from 'react'
import { AiOutlineCheck } from '@react-icons/all-files/ai/AiOutlineCheck'
import styles from './style.module.scss'

export type TaskCardProps = {
	id: string
	label: string
	stage?: string
	required: boolean
	completed: boolean
	onStatusChange: (taskId: string, checked: boolean) => void
}

const WorkflowTaskCard: React.FC<TaskCardProps> = ({
	id,
	label,
	stage = 'Co-Working',
	required,
	completed,
	onStatusChange,
}) => {
	const isCompleted = completed
	const isRequired = required

	return (
		<div className={styles.taskItem}>
			<div className={styles.taskTitleRow}>
				<div
					className={`${styles.taskCheckbox} ${isCompleted ? styles.completed : ''}`}
					onClick={() => onStatusChange(id, !isCompleted)}
				>
					{isCompleted && <AiOutlineCheck size={14} />}
				</div>
				<div className={`${styles.taskTitle} ${isCompleted ? styles.completed : ''}`}>{label}</div>
			</div>
			<div className={styles.taskInfoGrid}>
				<div className={styles.taskInfoItem}>
					<div className={styles.taskInfoLabel}>Implementation Stage</div>
					<div className={styles.taskInfoValue}>
						<div className={`${styles.stageTag} ${isRequired ? styles.required : styles.optional}`}>{stage}</div>
					</div>
				</div>
				
				<div className={styles.taskInfoItem}>
					<div className={styles.taskInfoLabel}>Status</div>
					<div className={styles.taskInfoValue}>
						<div className={`${styles.statusTag} ${isCompleted ? styles.completed : styles.inProgress}`}>
							{isCompleted ? (
								<>
									<AiOutlineCheck size={14} />
									Completed
								</>
							) : (
								<>In Progress</>
							)}
						</div>
					</div>
				</div>
				
				<div className={styles.taskInfoItem}>
					<div className={styles.taskInfoLabel}>Assignee</div>
					<div className={styles.taskInfoValue}>
						<div className={styles.assigneeTag}>
							<div className={styles.assigneeAvatar}>A</div>
							Assignee
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default WorkflowTaskCard 