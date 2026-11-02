"use client";

import { IconPlus, IconX } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Button,
	Checkbox,
	DatePicker,
	Flex,
	Form,
	Tag,
	TimePicker,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
	WEEKDAYS,
	weekdayLabel,
} from "@/components/advisor/AvailabilityPeriods/format";
import type { Activity, AvailabilityRule } from "@/lib/advisor-availability";
import styles from "./style.module.scss";

type Values = {
	everyWeek: boolean;
	months: [Dayjs, Dayjs] | null;
	weekdays: number[];
	ranges: { from: Dayjs | null; to: Dayjs | null }[];
	openFor: Activity[];
};

const MAX_RANGES = 6;

// A picker has no 24:00, so a range that runs to midnight shows as 23:59.
const toTime = (minute: number) =>
	dayjs()
		.startOf("day")
		.add(Math.min(minute, 24 * 60 - 1), "minute");
const toMinute = (time: Dayjs) => time.hour() * 60 + time.minute();

const toValues = (rule: AvailabilityRule | null): Values => ({
	everyWeek: !rule?.monthFrom,
	months:
		rule?.monthFrom && rule.monthTo
			? [dayjs(rule.monthFrom), dayjs(rule.monthTo)]
			: null,
	weekdays: rule?.weekdays ?? [1, 2, 3, 4, 5],
	ranges: (rule?.ranges ?? [{ from: 9 * 60, to: 13 * 60 }]).map((range) => ({
		from: toTime(range.from),
		to: toTime(range.to),
	})),
	openFor: [
		...(rule?.forConsultations === false ? [] : (["consultations"] as const)),
		...(rule?.forCheckpoints === false ? [] : (["checkpoints"] as const)),
	],
});

const toRule = (values: Values): AvailabilityRule => {
	const months = values.everyWeek ? null : values.months;

	return {
		monthFrom: months?.[0].startOf("month").format("YYYY-MM-DD") ?? null,
		monthTo: months?.[1].endOf("month").format("YYYY-MM-DD") ?? null,
		weekdays: [...values.weekdays].sort((a, b) => a - b),
		ranges: values.ranges
			.filter((range) => range.from && range.to)
			.map((range) => ({
				from: toMinute(range.from as Dayjs),
				to: toMinute(range.to as Dayjs),
			}))
			.sort((a, b) => a.from - b.from),
		forConsultations: values.openFor.includes("consultations"),
		forCheckpoints: values.openFor.includes("checkpoints"),
	};
};

export type AvailabilityPeriodEditorProps = {
	/** The period being edited; null adds a new one. */
	rule: AvailabilityRule | null;
	onSubmit: (rule: AvailabilityRule) => void;
	onCancel: () => void;
};

/** One period of hours: which months, which days, which hours, open for what. */
export function AvailabilityPeriodEditor({
	rule,
	onSubmit,
	onCancel,
}: AvailabilityPeriodEditorProps) {
	const { t } = useTranslate();
	const [form] = Form.useForm<Values>();
	const everyWeek = Form.useWatch("everyWeek", form) ?? !rule?.monthFrom;

	const dayOptions = WEEKDAYS.map((value) => ({
		value,
		label: weekdayLabel(value),
	}));

	return (
		<div className={styles.editor}>
			<Form<Values>
				form={form}
				layout="vertical"
				variant="filled"
				initialValues={toValues(rule)}
				onFinish={(values) => onSubmit(toRule(values))}
			>
				<Form.Item
					label={t("advisor.availability.editor.months", "Months")}
					className={styles.item}
				>
					<Flex gap={16} align="center" wrap>
						<Form.Item
							name="months"
							noStyle={everyWeek}
							className={styles.inline}
							rules={[
								{
									required: !everyWeek,
									message: t(
										"advisor.availability.editor.monthsRequired",
										"Pick the months, or repeat every week.",
									),
								},
							]}
						>
							<DatePicker.RangePicker
								picker="month"
								format="MMMM YYYY"
								disabled={everyWeek}
								allowEmpty={[true, true]}
								placeholder={[
									t("advisor.availability.editor.monthFrom", "From"),
									t("advisor.availability.editor.monthTo", "To"),
								]}
							/>
						</Form.Item>
						<Form.Item name="everyWeek" valuePropName="checked" noStyle>
							<Checkbox>
								{t(
									"advisor.availability.editor.everyWeek",
									"Every week, no end",
								)}
							</Checkbox>
						</Form.Item>
					</Flex>
				</Form.Item>

				<Form.Item
					name="weekdays"
					label={t("advisor.availability.editor.days", "Days")}
					className={styles.item}
					rules={[
						{
							type: "array",
							min: 1,
							message: t(
								"advisor.availability.editor.daysRequired",
								"Pick at least one day.",
							),
						},
					]}
				>
					<Tag.CheckableTagGroup multiple options={dayOptions} />
				</Form.Item>

				<Form.Item
					label={t("advisor.availability.editor.hours", "Hours")}
					className={styles.item}
					required
				>
					<Form.List name="ranges">
						{(fields, { add, remove }) => (
							<Flex vertical gap={8}>
								{fields.map((field) => (
									<Flex key={field.key} gap={8} align="start">
										<Form.Item
											name={[field.name, "from"]}
											noStyle
											rules={[{ required: true, message: "" }]}
										>
											<TimePicker
												format="HH:mm"
												minuteStep={15}
												needConfirm={false}
												placeholder={t(
													"advisor.availability.editor.from",
													"From",
												)}
											/>
										</Form.Item>
										<Typography.Text type="secondary" className={styles.dash}>
											–
										</Typography.Text>
										<Form.Item
											name={[field.name, "to"]}
											dependencies={[["ranges", field.name, "from"]]}
											className={styles.inline}
											rules={[
												{
													required: true,
													message: t(
														"advisor.availability.editor.hoursRequired",
														"Set both times.",
													),
												},
												({ getFieldValue }) => ({
													validator: (_, value: Dayjs | null) => {
														const from: Dayjs | null = getFieldValue([
															"ranges",
															field.name,
															"from",
														]);
														if (
															!from ||
															!value ||
															toMinute(value) > toMinute(from)
														)
															return Promise.resolve();
														return Promise.reject(
															new Error(
																t(
																	"advisor.availability.editor.hoursOrder",
																	"Hours must end after they start.",
																),
															),
														);
													},
												}),
											]}
										>
											<TimePicker
												format="HH:mm"
												minuteStep={15}
												needConfirm={false}
												placeholder={t("advisor.availability.editor.to", "To")}
											/>
										</Form.Item>
										{fields.length > 1 && (
											<Button
												type="text"
												icon={<IconX size={16} />}
												aria-label={t(
													"advisor.availability.editor.removeRange",
													"Remove these hours",
												)}
												onClick={() => remove(field.name)}
											/>
										)}
									</Flex>
								))}
								{fields.length < MAX_RANGES && (
									<Button
										type="link"
										icon={<IconPlus size={16} />}
										className={styles.addRange}
										onClick={() => add({ from: null, to: null })}
									>
										{t("advisor.availability.editor.addRange", "Add hours")}
									</Button>
								)}
							</Flex>
						)}
					</Form.List>
				</Form.Item>

				<Form.Item
					name="openFor"
					label={t("advisor.availability.editor.openFor", "Open for")}
					className={styles.item}
					rules={[
						{
							type: "array",
							min: 1,
							message: t(
								"advisor.availability.editor.openForRequired",
								"Open the hours for at least one of them.",
							),
						},
					]}
				>
					<Checkbox.Group
						options={[
							{
								value: "consultations",
								label: t("advisor.availability.consultations", "Consultations"),
								// One-off requests do not use consultation hours yet (GDHUB-138).
								disabled: true,
							},
							{
								value: "checkpoints",
								label: t("advisor.availability.checkpoints", "Checkpoints"),
							},
						]}
					/>
				</Form.Item>

				<Flex gap={8} justify="end">
					<Button onClick={onCancel}>
						{t("advisor.availability.editor.cancel", "Cancel")}
					</Button>
					<Button type="primary" htmlType="submit">
						{rule
							? t("advisor.availability.editor.save", "Save period")
							: t("advisor.availability.addPeriod", "Add period")}
					</Button>
				</Flex>
			</Form>
		</div>
	);
}

export default AvailabilityPeriodEditor;
