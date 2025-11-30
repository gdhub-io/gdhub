import {
	ContextMenu,
	Gantt,
	type IApi,
	type IColumnConfig,
	type IGanttColumn,
	Willow,
} from "@svar-ui/react-gantt";
import type { IMenuOption } from "@svar-ui/react-menu";
import "@svar-ui/react-gantt/all.css";
import dayjs from "dayjs";
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useMemo,
	useState,
} from "react";
import type { ScheduleItemFormValues } from "@/components/modals/EventModal";
import ScheduleItemModal from "@/components/modals/EventModal/ScheduleItemModal";
import { appThemeConfig } from "@/config/theme";
import { formatEventPeriod } from "@/helpers/format";
import styles from "./EventScheduleGantt.module.scss";

interface GanttTask {
	id: number;
	text: string;
	start: Date;
	end: Date;
	duration: number;
	progress: number;
	type: "task";
	lazy: boolean;
}

interface EventScheduleGanttProps {
	schedule: ScheduleItemFormValues[];
	onTaskClick?: (id: string) => void;
	onScheduleUpdate?: (item: ScheduleItemFormValues) => void;
	onScheduleCreate?: (item: ScheduleItemFormValues) => void;
	isAdmin: boolean;
}

export interface EventScheduleGanttRef {
	openAddModal: () => void;
}

export const EventScheduleGantt = forwardRef<
	EventScheduleGanttRef,
	EventScheduleGanttProps
>(
	(
		{ schedule, onTaskClick, onScheduleUpdate, onScheduleCreate, isAdmin },
		ref,
	) => {
		const [ganttApi, setGanttApi] = useState<IApi | undefined>(undefined);
		const [scheduleItemModalOpen, setScheduleItemModalOpen] = useState(false);
		const [editingScheduleItemId, setEditingScheduleItemId] = useState<
			string | null
		>(null);

		// Expose method to open add modal
		useImperativeHandle(ref, () => ({
			openAddModal: () => {
				setEditingScheduleItemId(null);
				setScheduleItemModalOpen(true);
			},
		}));

		// Convert schedule items to Gantt tasks format
		const ganttTasks = useMemo(() => {
			return schedule.map((item, index) => {
				const start = dayjs(item.startDate);
				const end = dayjs(item.endDate);
				const duration = end.diff(start, "hour");

				// Use index-based ID for Gantt, but store original ID mapping
				const ganttId = index + 1;

				return {
					id: ganttId,
					text: item.title || `Item ${index + 1}`,
					start: start.toDate(),
					end: end.toDate(),
					duration,
					progress: 0,
					type: "task" as const,
					lazy: false,
				};
			});
		}, [schedule]);

		// Handle task double click for editing
		const handleTaskDoubleClick = (task: GanttTask) => {
			// Find schedule item by index (task.id - 1)
			const scheduleItem = schedule[task.id - 1];
			if (scheduleItem?.id) {
				setEditingScheduleItemId(scheduleItem.id);
				setScheduleItemModalOpen(true);
				if (onTaskClick) {
					onTaskClick(scheduleItem.id);
				}
			}
		};

		const handleScheduleItemModalCancel = () => {
			setScheduleItemModalOpen(false);
			setEditingScheduleItemId(null);
		};

		const handleScheduleItemModalSubmit = (item: ScheduleItemFormValues) => {
			if (editingScheduleItemId !== null) {
				if (onScheduleUpdate) {
					onScheduleUpdate(item);
				}
			} else {
				if (onScheduleCreate) {
					onScheduleCreate(item);
				}
			}

			setScheduleItemModalOpen(false);
			setEditingScheduleItemId(null);
		};

		// Scales configuration
		const scales = [
			{ unit: "month" as const, step: 1, format: "MMMM yyyy" },
			{ unit: "day" as const, step: 1, format: "d" },
		];

		const columns: IColumnConfig[] & IGanttColumn[] = useMemo(
			() => [
				{
					id: "text",
					header: "Item",
					// width: 200,
					sort: false,
					flexgrow: 2,
				},
				{
					id: "start",
					header: "Dates",
					width: 180,
					sort: false,
					align: "center",
					cell: (params: any) => {
						console.log("params", params);

						return (
							<div>
								{formatEventPeriod(
									params.row.start,
									params.row.end,
									"en",
									"daytime",
								)}
							</div>
						);
					},
				},
				{
					id: "duration",
					header: "Time, hours",
					width: 100,
					sort: false,
					align: "center",
				},
			],
			[],
		);

		const options: IMenuOption[] = [
			{
				id: "edit-task",
				text: "Edit",
				icon: "wxi-edit",
				handler: (e: any) => {
					e.event?.stopPropagation();
					console.log("edit task");
				},
			},
			{
				id: "delete-task",
				text: "Delete",
				icon: "wxi-delete",
				handler: (e) => {
					e.event?.stopPropagation();
					console.log("delete task");
				},
			},
		];

		function isDayOff(date: Date) {
			const d = date.getDay();
			return d === 0 || d === 6;
		}

		function isHourOff(date: Date) {
			const h = date.getHours();
			return h < 8 || h === 12 || h > 17;
		}

		const weekDays = (date: Date, unit: "day" | "hour") => {
			if (unit === "day" && isDayOff(date)) return "wx-weekend";
			if (unit === "hour" && (isDayOff(date) || isHourOff(date)))
				return "wx-weekend";
			return "";
		};

		const initGanttApi = useCallback((api: IApi) => {
			setGanttApi(api);

			api.intercept("drag-task", () => {
				return false;
			});
		}, []);

		return (
			<div className={styles.ganttContainer}>
				<style jsx global>{`
					:root {
						--wx-font-family: ${appThemeConfig?.token?.fontFamily}, sans-serif;
					}
				`}</style>
				<Willow fonts={false}>
					<ContextMenu api={ganttApi} options={options}>
						<Gantt
							readonly={true}
							init={initGanttApi}
							tasks={ganttTasks}
							scales={scales}
							zoom={true}
							columns={columns}
							onTaskDoubleClick={handleTaskDoubleClick}
							cellHeight={40}
							cellWidth={20}
							scaleHeight={30}
							highlightTime={weekDays}
						/>
					</ContextMenu>
				</Willow>

				<ScheduleItemModal
					open={scheduleItemModalOpen}
					onCancel={handleScheduleItemModalCancel}
					onSubmit={handleScheduleItemModalSubmit}
					initialValues={
						editingScheduleItemId
							? schedule.find((i) => i.id === editingScheduleItemId)
							: undefined
					}
					isAdmin={isAdmin}
				/>
			</div>
		);
	},
);

EventScheduleGantt.displayName = "EventScheduleGantt";
