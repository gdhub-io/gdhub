"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	IconCast,
	IconEye,
	IconEyeOff,
	IconGripVertical,
	IconMicrophone,
	IconMicrophoneOff,
	IconScreenShare,
	IconVideo,
	IconVideoOff,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import type { ReactNode } from "react";
import { initials } from "@/components/checkpoints/CallRoom/CallParts";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { screenKey } from "@/lib/live/sborka";
import { EditPersonPopover } from "./EditPersonPopover";
import styles from "./style.module.scss";
import { roleIcon, type StudioPerson } from "./use-studio";

type Props = {
	people: StudioPerson[];
	onScreen: string[];
	/** The host's panel directs; a guest's only shows. */
	host: boolean;
	actions?: {
		reorder: (order: string[]) => void;
		toggleOnScreen: (key: string) => void;
		setMic: (id: string, on: boolean) => void;
		edit: (id: string, name: string, role: string) => void;
	};
};

/** Frames 03.15.2 (host, `QbeVZ`) and 03.15.11 (guest, `ukivH`). */
export function PeoplePanel({ people, onScreen, host, actions }: Props) {
	const { t } = useTranslate();
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);
	const cameras = people.filter((p) => onScreen.includes(p.id)).length;

	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return;
		const ids = people.map((p) => p.id);
		actions?.reorder(
			arrayMove(
				ids,
				ids.indexOf(String(active.id)),
				ids.indexOf(String(over.id)),
			),
		);
	};

	const rows = people.map((person) => (
		<PersonRow
			key={person.id}
			person={person}
			host={host}
			onScreen={onScreen}
			actions={actions}
		/>
	));

	return (
		<section className={styles.panel}>
			<div className={styles.panelHead}>
				<Typography.Title level={5} className={styles.title}>
					{host
						? t("live.sborka.guests", "Guests")
						: t("live.sborka.people", "People")}
				</Typography.Title>
				<span className={styles.counter}>
					<IconCast size={16} />
					{t("live.sborka.onScreenCount", "On screen {count} of {total}", {
						count: cameras,
						total: people.length,
					})}
				</span>
			</div>
			{host ? (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					modifiers={[restrictToVerticalAxis]}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={people.map((p) => p.id)}
						strategy={verticalListSortingStrategy}
					>
						{rows}
					</SortableContext>
				</DndContext>
			) : (
				rows
			)}
		</section>
	);
}

type RowProps = {
	person: StudioPerson;
	host: boolean;
	onScreen: string[];
	actions?: Props["actions"];
};

function PersonRow({ person, host, onScreen, actions }: RowProps) {
	const { t } = useTranslate();
	const sortable = useSortable({ id: person.id, disabled: !host });
	const Role = roleIcon(person.direction);
	const editable = host || person.local;
	const name = person.local
		? t("live.sborka.you", "{name} (you)", { name: person.name })
		: person.name;

	return (
		<>
			<div
				ref={sortable.setNodeRef}
				className={styles.row}
				data-interactive={host}
				data-dragging={sortable.isDragging}
				style={{
					transform: CSS.Transform.toString(sortable.transform),
					transition: sortable.transition,
				}}
			>
				{host && (
					<Button
						type="text"
						size="small"
						className={styles.grip}
						aria-label={t("live.sborka.reorder", "Drag to reorder")}
						icon={<IconGripVertical size={16} />}
						{...sortable.attributes}
						{...sortable.listeners}
					/>
				)}
				<AppAvatar size={32}>{initials(person.name)}</AppAvatar>
				<div className={styles.who}>
					<span className={styles.nameLine}>
						<Typography.Text
							className={styles.name}
							ellipsis={{ tooltip: name }}
						>
							{name}
						</Typography.Text>
						{editable && actions && (
							<EditPersonPopover
								person={person}
								onSave={(n, r) => actions.edit(person.id, n, r)}
							/>
						)}
					</span>
					<span className={styles.meta}>
						<Role size={14} />
						<span className={styles.metaText}>{person.role}</span>
						{person.video ? (
							<IconVideo size={14} />
						) : (
							<IconVideoOff size={14} />
						)}
						{person.sharing && <IconScreenShare size={14} />}
					</span>
				</div>
				<div className={styles.buttons}>
					{host && actions ? (
						<MicButton
							on={person.audio}
							onToggle={() => actions.setMic(person.id, !person.audio)}
						/>
					) : person.audio ? (
						<IconMicrophone size={16} />
					) : (
						<IconMicrophoneOff size={16} />
					)}
					<EyeButton
						on={onScreen.includes(person.id)}
						onToggle={
							host && actions
								? () => actions.toggleOnScreen(person.id)
								: undefined
						}
					/>
				</div>
			</div>
			{person.sharing && (
				<div className={styles.childRow}>
					<span className={styles.childLabel}>
						<IconScreenShare size={14} />
						{t("live.sborka.screen", "Screen")}
					</span>
					<EyeButton
						on={onScreen.includes(screenKey(person.id))}
						onToggle={
							host && actions
								? () => actions.toggleOnScreen(screenKey(person.id))
								: undefined
						}
					/>
				</div>
			)}
		</>
	);
}

function RoundToggle({
	label,
	icon,
	onToggle,
	type,
	danger,
}: {
	label: string;
	icon: ReactNode;
	onToggle: () => void;
	type?: "primary";
	danger?: boolean;
}) {
	return (
		<Tooltip title={label}>
			<Button
				shape="circle"
				aria-label={label}
				type={type}
				danger={danger}
				icon={icon}
				onClick={onToggle}
			/>
		</Tooltip>
	);
}

function MicButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
	const { t } = useTranslate();
	return (
		<RoundToggle
			label={
				on ? t("live.sborka.mute", "Mute") : t("live.sborka.unmute", "Unmute")
			}
			icon={on ? <IconMicrophone size={16} /> : <IconMicrophoneOff size={16} />}
			danger={!on}
			onToggle={onToggle}
		/>
	);
}

/** The host's on-screen toggle; without `onToggle`, a guest's read-only eye. */
function EyeButton({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
	const { t } = useTranslate();
	if (!onToggle) {
		return on ? <IconEye size={16} className={styles.onAir} /> : null;
	}
	return (
		<RoundToggle
			label={
				on
					? t("live.sborka.removeFromBroadcast", "Remove from broadcast")
					: t("live.sborka.showOnBroadcast", "Show on broadcast")
			}
			icon={on ? <IconEye size={16} /> : <IconEyeOff size={16} />}
			type={on ? "primary" : undefined}
			onToggle={onToggle}
		/>
	);
}
