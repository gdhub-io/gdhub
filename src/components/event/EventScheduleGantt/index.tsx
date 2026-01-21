import {
	ContextMenu,
	Gantt,
	type IApi,
	type IColumnConfig,
	type IGanttColumn,
	Willow,
} from "@svar-ui/react-gantt";
import type { ICellProps } from "@svar-ui/react-grid";
import type { IMenuOption, IMenuOptionClick } from "@svar-ui/react-menu";
import "@svar-ui/react-gantt/all.css";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconDotsVertical } from "@tabler/icons-react";
import { Avatar, Button, Dropdown, Space, Tag, Typography } from "antd";
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

const { Text } = Typography;

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
	onScheduleDelete?: (id: string) => void | Promise<void>;
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
		{
			schedule,
			onTaskClick,
			onScheduleUpdate,
			onScheduleCreate,
			onScheduleDelete,
			isAdmin,
		},
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
					speakers: item.speakers,
					lang: item.language,
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
					width: 250,
					sort: false,
					cell: (params: ICellProps) => {
						const row = params.row as {
							language?: prismaClient.$Enums.Language;
							text?: string;
						};
						return (
							<Space size={0}>
								<Tag bordered={false} color="blue">
									{row.language}
								</Tag>{" "}
								<Text style={{ fontWeight: 400 }}>{row.text}</Text>
							</Space>
						);
					},
				},
				{
					id: "start",
					header: "Dates",
					width: 180,
					sort: false,
					align: "center",
					cell: (params: ICellProps) => {
						const row = params.row as { start?: Date; end?: Date };
						const start = row.start;
						const end = row.end;
						if (!start || !end) return null;
						return <div>{formatEventPeriod(start, end, "en", "daytime")}</div>;
					},
				},
				{
					id: "speakers",
					header: "Speakers",
					width: 150,
					sort: false,
					align: "center",
					cell: (params: ICellProps) => {
						const row = params.row as {
							speakers?: {
								name: string;
								id: string;
								image?: string;
							}[];
						};
						return (
							<Avatar.Group
								max={{
									count: 3,
									style: { color: "#f56a00", backgroundColor: "#fde3cf" },
								}}
							>
								{row.speakers?.map((speaker) => (
									<Avatar
										key={speaker.id}
										style={{ backgroundColor: "#1677ff" }}
										src={speaker.image}
									>
										{speaker.image ? null : speaker.name?.charAt(0)}
									</Avatar>
								))}
							</Avatar.Group>
						);
					},
					// flexgrow: 1,
				},
				{
					id: "duration",
					header: "Hours",
					width: 80,
					sort: false,
					align: "center",
				},
				{
					id: "actions",
					header: "",
					width: 50,
					sort: false,
					align: "center",
					cell: (params: ICellProps) => {
						const row = params.row as { id?: string };
						return (
							<Dropdown
								trigger={["click"]}
								menu={{
									items: [
										{
											key: "edit",
											label: "Edit",
										},
										{
											key: "delete",
											label: "Delete",
											danger: true,
										},
									],
								}}
							>
								<Button icon={<IconDotsVertical size={16} />} type="text" />
							</Dropdown>
						);
					},
				},
			],
			[],
		);

		// Get schedule item from context (task id from Gantt)
		const getScheduleItemFromContext = useCallback(
			(context: unknown) => {
				if (!context) return null;

				// Try to get task ID from context
				const contextObj = context as {
					id?: number;
					taskId?: number;
					row?: { id?: number };
				};
				const taskId = contextObj.id || contextObj.taskId || contextObj.row?.id;

				if (!taskId || typeof taskId !== "number") return null;

				// Find schedule item by index (task.id - 1)
				const scheduleItem = schedule[taskId - 1];
				return scheduleItem;
			},
			[schedule],
		);

		const options: IMenuOption[] = useMemo(
			() => [
				{
					id: "edit-task",
					text: "Edit",
					icon: "wxi-edit",
					handler: (e: IMenuOptionClick) => {
						e.event?.stopPropagation();
						const scheduleItem = getScheduleItemFromContext(e.context);
						if (scheduleItem?.id) {
							setEditingScheduleItemId(scheduleItem.id);
							setScheduleItemModalOpen(true);
						}
					},
				},
				{
					id: "delete-task",
					text: "Delete",
					icon: "wxi-delete",
					handler: async (e: IMenuOptionClick) => {
						e.event?.stopPropagation();
						const scheduleItem = getScheduleItemFromContext(e.context);
						if (scheduleItem?.id && onScheduleDelete) {
							await onScheduleDelete(scheduleItem.id);
						}
					},
				},
			],
			[getScheduleItemFromContext, onScheduleDelete],
		);

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
