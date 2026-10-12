"use client";

import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Tag, Typography } from "antd";
import { useState } from "react";
import { AvailabilityPeriodEditor } from "@/components/advisor/AvailabilityPeriodEditor";
import { RefusedCallsAlert } from "@/components/advisor/RefusedCallsAlert";
import type { AvailabilityRule } from "@/lib/advisor-availability";
import type { BookedCall } from "@/repositories/advisor-availability";
import { formatMonths, formatRanges, formatWeekdays } from "./format";
import styles from "./style.module.scss";

/** Which period is open in the editor: an index, a new one, or none. */
type Editing = number | "new" | null;

export type AvailabilityPeriodsProps = {
	rules: AvailabilityRule[];
	onChange: (rules: AvailabilityRule[]) => void;
	timeZone: string;
	/** Booked calls that refused the last save; null when nothing was refused. */
	refused?: BookedCall[] | null;
	/** Opens with the editor already showing, for stories. */
	initialEditing?: Editing;
};

/** The advisor's periods of hours, each edited in place. */
export function AvailabilityPeriods({
	rules,
	onChange,
	timeZone,
	refused,
	initialEditing = null,
}: AvailabilityPeriodsProps) {
	const { t } = useTranslate();
	const [editing, setEditing] = useState<Editing>(initialEditing);

	const submit = (rule: AvailabilityRule) => {
		onChange(
			editing === "new"
				? [...rules, rule]
				: rules.map((item, index) => (index === editing ? rule : item)),
		);
		setEditing(null);
	};

	const editor = (rule: AvailabilityRule | null) => (
		<AvailabilityPeriodEditor
			rule={rule}
			onSubmit={submit}
			onCancel={() => setEditing(null)}
		/>
	);

	return (
		<Flex vertical gap={12}>
			{!!refused?.length && (
				<RefusedCallsAlert calls={refused} timeZone={timeZone} />
			)}

			{rules.map((rule, index) =>
				editing === index ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: a period has no id until it is saved
					<div key={index}>{editor(rule)}</div>
				) : (
					<Flex
						// biome-ignore lint/suspicious/noArrayIndexKey: a period has no id until it is saved
						key={index}
						align="center"
						gap={12}
						className={styles.row}
					>
						<Flex vertical className={styles.text}>
							<Typography.Text strong>
								{formatMonths(rule) ??
									t("advisor.availability.everyWeek", "Every week")}
							</Typography.Text>
							<Typography.Text type="secondary">
								{`${formatWeekdays(rule.weekdays)} · ${formatRanges(rule.ranges)}`}
							</Typography.Text>
						</Flex>
						<Flex gap={4} className={styles.chips}>
							{rule.forConsultations && (
								<Tag>
									{t("advisor.availability.consultations", "Consultations")}
								</Tag>
							)}
							{rule.forCheckpoints && (
								<Tag>
									{t("advisor.availability.checkpoints", "Checkpoints")}
								</Tag>
							)}
						</Flex>
						<Button
							type="text"
							icon={<IconPencil size={16} />}
							aria-label={t("advisor.availability.editPeriod", "Edit period")}
							onClick={() => setEditing(index)}
						/>
						<Button
							type="text"
							danger
							icon={<IconTrash size={16} />}
							aria-label={t(
								"advisor.availability.deletePeriod",
								"Delete period",
							)}
							onClick={() => {
								onChange(rules.filter((_, item) => item !== index));
								setEditing(null);
							}}
						/>
					</Flex>
				),
			)}

			{editing === "new" ? (
				editor(null)
			) : (
				<Button
					type="link"
					icon={<IconPlus size={16} />}
					className={styles.add}
					onClick={() => setEditing("new")}
				>
					{t("advisor.availability.addPeriod", "Add period")}
				</Button>
			)}
		</Flex>
	);
}

export default AvailabilityPeriods;
