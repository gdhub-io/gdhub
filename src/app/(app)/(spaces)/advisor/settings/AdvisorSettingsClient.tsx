"use client";

import { IconCalendar } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	App,
	Button,
	Card,
	DatePicker,
	Flex,
	Form,
	Grid,
	InputNumber,
	Layout,
	Menu,
	Radio,
	Select,
	Skeleton,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AvailabilityPeriods } from "@/components/advisor/AvailabilityPeriods";
import { PaidWorkSection } from "@/components/advisor/PaidWorkSection";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { SectionHeading } from "@/components/ui";
import { AVAILABILITY_REMIND_DAYS } from "@/config/checkpoint";
import { AdvisorAvailabilityStatus } from "@/config/prisma-enums";
import {
	isSaveRefused,
	useAvailability,
	useConfirmAvailability,
	useSaveAvailability,
} from "@/hooks/advisor-availability";
import { usePaidWork, useSavePaidWork } from "@/hooks/payouts";
import type { AvailabilityRule } from "@/lib/advisor-availability";
import type { AvailabilityDto } from "@/repositories/advisor-availability";
import styles from "./style.module.scss";

const DATE_FORMAT = "D MMMM YYYY";

type Section = "availability" | "paid-work";

const SECTIONS: Section[] = ["availability", "paid-work"];

export function AdvisorSettingsClient() {
	// useSearchParams needs a Suspense boundary to prerender.
	return (
		<Suspense>
			<AdvisorSettings />
		</Suspense>
	);
}

function AdvisorSettings() {
	const { t } = useTranslate();
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const searchParams = useSearchParams();
	const requested = searchParams.get("section") as Section | null;
	const section: Section =
		requested && SECTIONS.includes(requested) ? requested : "availability";

	const items = [
		{
			key: "availability",
			label: t("advisor.settings.menu.availability", "Availability"),
		},
		{
			key: "paid-work",
			label: t("advisor.settings.paid-work.title", "Paid work"),
		},
	];

	const open = ({ key }: { key: string }) =>
		router.replace(`?section=${key}`, { scroll: false });

	return (
		<div className="layout-background">
			<ProtectedPageHeader
				title={t("advisor.settings.title", "Advisor settings")}
				subTitle={t(
					"advisor.settings.subtitle",
					"What you advise on and how teams reach you.",
				)}
			/>

			<Layout className={styles.layout}>
				{screens.lg && (
					<Layout.Sider width={220} theme="light" className={styles.sider}>
						<Menu
							mode="vertical"
							selectedKeys={[section]}
							items={items}
							onClick={open}
						/>
					</Layout.Sider>
				)}

				<Layout.Content className={styles.content}>
					{!screens.lg && (
						<Menu
							mode="horizontal"
							selectedKeys={[section]}
							items={items}
							onClick={open}
							className={styles.topMenu}
						/>
					)}
					{section === "paid-work" ? <PaidWork /> : <Availability />}
				</Layout.Content>
			</Layout>
		</div>
	);
}

function Availability() {
	const { t } = useTranslate();
	const { data, isLoading, isError, refetch } = useAvailability();

	if (isError)
		return (
			<Alert
				type="error"
				showIcon
				title={t(
					"advisor.availability.error.load",
					"Your hours could not be loaded.",
				)}
				action={
					<Button size="small" onClick={() => refetch()}>
						{t("advisor.availability.error.retry", "Try again")}
					</Button>
				}
			/>
		);

	if (isLoading)
		return (
			<Card variant="borderless">
				<Skeleton active paragraph={{ rows: 6 }} />
			</Card>
		);

	return <AvailabilityForm availability={data ?? null} />;
}

function PaidWork() {
	const { t } = useTranslate();
	const { data, isLoading, isError, refetch } = usePaidWork();
	const save = useSavePaidWork();

	if (isError)
		return (
			<Alert
				type="error"
				showIcon
				title={t(
					"advisor.settings.paid-work.loadFailed",
					"Your payout details could not be loaded.",
				)}
				action={
					<Button size="small" onClick={() => refetch()}>
						{t("advisor.settings.paid-work.retry", "Try again")}
					</Button>
				}
			/>
		);

	if (isLoading || !data)
		return (
			<Card variant="borderless">
				<Skeleton active paragraph={{ rows: 8 }} />
			</Card>
		);

	return (
		<PaidWorkSection
			paidWork={data}
			saving={save.isPending}
			onSave={save.mutateAsync}
		/>
	);
}

function AvailabilityForm({
	availability,
}: {
	availability: AvailabilityDto | null;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const save = useSaveAvailability();
	const confirm = useConfirmAvailability();

	const [timeZone, setTimeZone] = useState(
		() => availability?.timeZone ?? dayjs.tz.guess(),
	);
	const [status, setStatus] = useState<AdvisorAvailabilityStatus>(
		availability?.status ?? AdvisorAvailabilityStatus.Open,
	);
	const [awayUntil, setAwayUntil] = useState<Dayjs | null>(() =>
		availability?.awayUntil
			? dayjs(availability.awayUntil).tz(availability.timeZone)
			: null,
	);
	const [perMonth, setPerMonth] = useState<number | null>(
		availability?.consultationsPerMonth ?? null,
	);
	const [rules, setRules] = useState<AvailabilityRule[]>(
		availability?.rules ?? [],
	);

	const zones = useMemo(
		() =>
			Intl.supportedValuesOf("timeZone").map((zone) => ({
				value: zone,
				label: zone.replaceAll("_", " "),
			})),
		[],
	);

	const away = status === AdvisorAvailabilityStatus.Away;
	const missingAwayDate = away && !awayUntil;
	const refused = isSaveRefused(save.error)
		? save.error.response.data.outside
		: null;

	const statuses = [
		{
			value: AdvisorAvailabilityStatus.Open,
			title: t("advisor.availability.status.open", "Open"),
			description: t(
				"advisor.availability.status.openHint",
				"Consultations and new checkpoints",
			),
		},
		{
			value: AdvisorAvailabilityStatus.ConsultationsOnly,
			title: t(
				"advisor.availability.status.consultationsOnly",
				"Consultations only",
			),
			description: t(
				"advisor.availability.status.consultationsOnlyHint",
				"No new checkpoints for now",
			),
		},
		{
			value: AdvisorAvailabilityStatus.Away,
			title: t("advisor.availability.status.away", "Away"),
			description: t(
				"advisor.availability.status.awayHint",
				"Nobody can book you until a date",
			),
		},
	];

	const confirmedAt = availability?.confirmedAt
		? dayjs(availability.confirmedAt)
		: null;

	const submit = () => {
		if (missingAwayDate) return;

		save.mutate(
			{
				timeZone,
				status,
				// The advisor is back from the start of that day in their own zone.
				awayUntil:
					away && awayUntil
						? dayjs.tz(awayUntil.format("YYYY-MM-DD"), timeZone).toDate()
						: null,
				consultationsPerMonth: perMonth,
				rules,
			},
			{
				onSuccess: () =>
					message.success(t("advisor.availability.saved", "Saved")),
				onError: (error) => {
					if (!isSaveRefused(error))
						message.error(
							t("advisor.availability.error.save", "That did not go through."),
						);
				},
			},
		);
	};

	return (
		<Flex vertical gap={24}>
			<Form layout="vertical" variant="filled" className={styles.zone}>
				<Form.Item
					label={t("advisor.availability.timeZone", "Time zone")}
					className={styles.flush}
				>
					<Select
						showSearch
						options={zones}
						value={timeZone}
						onChange={setTimeZone}
					/>
				</Form.Item>
			</Form>

			<Card variant="borderless">
				<SectionHeading
					level={4}
					title={t("advisor.availability.status.title", "Status")}
					description={t(
						"advisor.availability.status.subtitle",
						"Whether new teams can book you. Checkpoints you already curate go on as planned.",
					)}
					className={styles.heading}
				/>

				<Radio.Group
					value={status}
					onChange={(event) => setStatus(event.target.value)}
					className={styles.statuses}
				>
					{statuses.map((option) => (
						<Radio
							key={option.value}
							value={option.value}
							className={styles.status}
						>
							<Flex vertical>
								<Typography.Text strong>{option.title}</Typography.Text>
								<Typography.Text type="secondary">
									{option.description}
								</Typography.Text>
							</Flex>
						</Radio>
					))}
				</Radio.Group>

				{away && (
					<Form layout="vertical" variant="filled" className={styles.away}>
						<Form.Item
							label={t("advisor.availability.awayUntil", "Away until")}
							validateStatus={missingAwayDate ? "error" : undefined}
							help={
								missingAwayDate
									? t(
											"advisor.availability.awayUntilRequired",
											"Pick the day you're back.",
										)
									: undefined
							}
							className={styles.flush}
						>
							<DatePicker
								value={awayUntil}
								onChange={setAwayUntil}
								format={DATE_FORMAT}
								disabledDate={(date) => date.isBefore(dayjs(), "day")}
							/>
						</Form.Item>
					</Form>
				)}

				<Flex align="center" gap={12} className={styles.confirm}>
					<IconCalendar size={16} className={styles.confirmIcon} />
					<Typography.Text type="secondary" className={styles.confirmText}>
						{confirmedAt
							? t(
									"advisor.availability.confirmed",
									"Hours confirmed on {date}. We'll ask you to check them again on {next}.",
									{
										date: confirmedAt.format(DATE_FORMAT),
										next: confirmedAt
											.add(AVAILABILITY_REMIND_DAYS, "day")
											.format(DATE_FORMAT),
									},
								)
							: t(
									"advisor.availability.notConfirmed",
									"Your hours are not confirmed yet.",
								)}
					</Typography.Text>
					{availability && (
						<Button
							loading={confirm.isPending}
							onClick={() => confirm.mutate()}
						>
							{t("advisor.availability.stillCorrect", "Still correct")}
						</Button>
					)}
				</Flex>
			</Card>

			<Card variant="borderless">
				<SectionHeading
					level={4}
					title={t("advisor.availability.hours.title", "Available hours")}
					description={t(
						"advisor.availability.hours.subtitle",
						"When teams can book you — consultations and checkpoint calls alike. A period without months repeats every week. Anything booked takes that time for everything else.",
					)}
					className={styles.heading}
				/>

				<Flex vertical gap={16}>
					<AvailabilityPeriods
						rules={rules}
						onChange={setRules}
						timeZone={timeZone}
						refused={refused}
					/>

					<Typography.Text type="secondary">
						{t(
							"advisor.availability.hours.hint",
							"A period with months replaces the weekly hours, and a shorter period a longer one, in its months. Checkpoint calls can't fall outside your hours: move the call first.",
						)}
					</Typography.Text>

					<Flex align="center" gap={8} wrap>
						<Typography.Text>
							{t("advisor.availability.perMonth.before", "At most")}
						</Typography.Text>
						<InputNumber
							min={1}
							max={100}
							precision={0}
							value={perMonth}
							onChange={(value) => setPerMonth(value)}
							variant="filled"
							aria-label={t(
								"advisor.availability.perMonth.label",
								"Consultations a month",
							)}
						/>
						<Typography.Text>
							{t(
								"advisor.availability.perMonth.after",
								"consultations a month",
							)}
						</Typography.Text>
						<Typography.Text type="secondary">
							{t(
								"advisor.availability.perMonth.hint",
								"· leave empty for no limit",
							)}
						</Typography.Text>
					</Flex>
				</Flex>
			</Card>

			<Flex>
				<Button type="primary" loading={save.isPending} onClick={submit}>
					{t("advisor.availability.save", "Save")}
				</Button>
			</Flex>
		</Flex>
	);
}
