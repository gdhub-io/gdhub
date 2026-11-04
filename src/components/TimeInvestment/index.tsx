"use client";

import { IconClockHour3, IconInfoCircle } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	InputNumber,
	Popover,
	Switch,
	Tooltip,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import {
	type TimeInvestment as Investment,
	useSaveTimeInvestment,
	useTimeInvestment,
} from "@/hooks/time-investment";
import styles from "./style.module.scss";

const { Text } = Typography;

/** The most hours a week the inputs take, as onboarding allows. */
const INPUT_MAX = 80;

const rangeOf = (investment?: Investment): [number, number] =>
	investment?.timeForWork.length === 2
		? [investment.timeForWork[0], investment.timeForWork[1]]
		: [10, 15];

/**
 * The hours a week a person invests in game projects, in the header (frame
 * 02.25, GDHUB-141). One click to change them, and whether they are open to
 * other authors' projects — the same switch as onboarding and settings.
 */
export function TimeInvestmentButton({ compact }: { compact?: boolean }) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data } = useTimeInvestment();
	const save = useSaveTimeInvestment();
	const [open, setOpen] = useState(false);
	const [range, setRange] = useState<[number, number]>([10, 15]);
	const [isActive, setIsActive] = useState(true);

	const hasHours = data?.timeForWork.length === 2;
	const label = hasHours
		? t("timeInvestment.short", "{min}–{max} h/wk", {
				min: data.timeForWork[0],
				max: data.timeForWork[1],
			})
		: t("timeInvestment.unset", "Set your hours");

	const onOpenChange = (next: boolean) => {
		if (next) {
			setRange(rangeOf(data));
			setIsActive(data?.isActive ?? true);
		}
		setOpen(next);
	};

	const onSave = async () => {
		try {
			await save.mutateAsync({ timeForWork: ordered(range), isActive });
			setOpen(false);
		} catch {
			message.error(t("timeInvestment.error", "Could not save your hours"));
		}
	};

	// Typed digit by digit, a bound passes through values on the wrong side of
	// the other one; the order is settled when the field is left, not per key.
	const setBound = (index: 0 | 1) => (value: number | null) => {
		const next: [number, number] = [...range];
		next[index] = value ?? 0;
		setRange(next);
	};
	const ordered = (value: [number, number]): [number, number] =>
		value[0] <= value[1] ? value : [value[1], value[0]];

	const content = (
		<Flex vertical gap={16} className={styles.popover}>
			<Flex vertical gap={2}>
				<Flex gap={6} align="center">
					<Text strong className={styles.title}>
						{t("timeInvestment.title", "Your time investment")}
					</Text>
					<Tooltip
						title={t(
							"timeInvestment.hint",
							"Hours a week you're ready to invest in game projects — your own or other authors'. Project authors see it, and checkpoints plan your team around it.",
						)}
					>
						<IconInfoCircle size={16} className={styles.info} />
					</Tooltip>
				</Flex>
				<Text type="secondary" className={styles.hint}>
					{t("timeInvestment.subtitle", "For your own and others' projects")}
				</Text>
			</Flex>
			<Flex gap={8} align="center">
				<InputNumber
					variant="filled"
					min={0}
					max={INPUT_MAX}
					value={range[0]}
					onChange={setBound(0)}
					onBlur={() => setRange(ordered(range))}
					aria-label={t("timeInvestment.from", "From")}
				/>
				<Text type="secondary">–</Text>
				<InputNumber
					variant="filled"
					min={0}
					max={INPUT_MAX}
					value={range[1]}
					onChange={setBound(1)}
					onBlur={() => setRange(ordered(range))}
					aria-label={t("timeInvestment.to", "To")}
				/>
				<Text type="secondary" className={styles.hint}>
					{t("timeInvestment.unit", "hours a week")}
				</Text>
			</Flex>
			<Flex gap={12} align="center" className={styles.switchRow}>
				<Flex vertical flex={1}>
					<Text>
						{t(
							"timeInvestment.openToOthers",
							"Open to other authors' projects",
						)}
					</Text>
					<Text type="secondary" className={styles.hint}>
						{t("timeInvestment.openToOthersHint", "Authors can invite you.")}
					</Text>
				</Flex>
				<Switch checked={isActive} onChange={setIsActive} />
			</Flex>
			<Flex justify="space-between" align="center" gap={8}>
				<Text type="secondary" className={styles.hint}>
					{data?.changedAt &&
						t("timeInvestment.changed", "Changed {when}", {
							when: dayjs(data.changedAt).fromNow(),
						})}
				</Text>
				<Flex gap={8}>
					<Button onClick={() => setOpen(false)}>
						{t("timeInvestment.cancel", "Cancel")}
					</Button>
					<Button type="primary" loading={save.isPending} onClick={onSave}>
						{t("timeInvestment.save", "Save")}
					</Button>
				</Flex>
			</Flex>
		</Flex>
	);

	return (
		<Popover
			open={open}
			onOpenChange={onOpenChange}
			trigger="click"
			placement="bottomRight"
			content={content}
		>
			<Tooltip
				title={
					open ? null : (
						<>
							<div>
								{t("timeInvestment.tooltip", "Time you invest each week")}
							</div>
							<Text className={styles.tooltipHint}>
								{t("timeInvestment.tooltipHint", "Click to change it")}
							</Text>
						</>
					)
				}
			>
				<Button
					type="text"
					size="small"
					className={`${styles.button}${hasHours ? "" : ` ${styles.unset}`}${open ? ` ${styles.open}` : ""}`}
					icon={<IconClockHour3 size={18} stroke={1.75} />}
					aria-label={label}
				>
					{!compact && label}
				</Button>
			</Tooltip>
		</Popover>
	);
}
