"use client";

import {
	IconAlertCircle,
	IconCheck,
	IconCopy,
	IconRefresh,
	IconTicket,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Skeleton,
	Switch,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { EmptyState, StatusDot, type StatusTone } from "@/components/ui";
import {
	CHECKPOINT_MINOR_UNITS,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { useSetPromoCodeActive } from "@/hooks/admin-promo-codes";
import type { PromoCodeDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

type PromoCodeStatus = "active" | "off" | "expired";

const isExpired = (code: PromoCodeDto) =>
	!!code.expiresAt && new Date(code.expiresAt) <= new Date();

/** Off wins over Expired: a code someone turned off reads as their decision. */
const promoCodeStatus = (code: PromoCodeDto): PromoCodeStatus => {
	if (!code.active) return "off";
	if (isExpired(code)) return "expired";
	return "active";
};

const STATUS_TONE: Record<PromoCodeStatus, StatusTone> = {
	active: "success",
	off: "neutral",
	expired: "neutral",
};

const SKELETON_ROWS = Array.from({ length: 5 }, (_, index) => ({
	id: `skeleton-${index}`,
})) as PromoCodeDto[];

export type PromoCodesTableProps = {
	codes: PromoCodeDto[] | undefined;
	status: "pending" | "error" | "success";
	onRetry: () => void;
	/** Without it the switches are read-only. */
	canManage: boolean;
};

/** The Promo codes tab: a white table card with its loading, empty and error states. */
export function PromoCodesTable({
	codes,
	status,
	onRetry,
	canManage,
}: PromoCodesTableProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const setActive = useSetPromoCodeActive();

	const toggle = (code: PromoCodeDto, active: boolean) =>
		setActive.mutate(
			{ id: code.id, active },
			{
				onError: () =>
					message.error(
						t(
							"admin.checkpoints.promoCodes.toggleFailed",
							"Couldn't change the code. Try again.",
						),
					),
			},
		);

	const loading = status === "pending";
	const skeleton = <Skeleton.Input active size="small" />;

	const columns: ColumnsType<PromoCodeDto> = [
		{
			title: t("admin.checkpoints.promoCodes.column.code", "Code"),
			key: "code",
			render: (_, code) => (
				<Typography.Text
					className={styles.code}
					copyable={{
						text: code.code,
						icon: [
							<IconCopy key="copy" size={16} />,
							<IconCheck key="copied" size={16} />,
						],
						tooltips: [
							t("admin.checkpoints.promoCodes.copy", "Copy"),
							t("admin.checkpoints.promoCodes.copied", "Copied"),
						],
					}}
				>
					{code.code}
				</Typography.Text>
			),
		},
		{
			title: t("admin.checkpoints.promoCodes.column.discount", "Discount"),
			key: "discount",
			width: 140,
			render: (_, code) =>
				code.percentOff !== null
					? `${code.percentOff}%`
					: t(
							"admin.checkpoints.promoCodes.discount.amount",
							"{currency}{amount} off",
							{
								currency: CHECKPOINT_PRICE_CURRENCY,
								amount: (code.amountOff ?? 0) / CHECKPOINT_MINOR_UNITS,
							},
						),
		},
		{
			title: t("admin.checkpoints.promoCodes.column.used", "Used"),
			key: "used",
			width: 120,
			align: "right",
			render: (_, code) => (
				<span className={styles.number}>
					{code.maxRedemptions === null
						? code.timesRedeemed
						: `${code.timesRedeemed} / ${code.maxRedemptions}`}
				</span>
			),
		},
		{
			title: t("admin.checkpoints.promoCodes.column.expires", "Expires"),
			key: "expires",
			width: 160,
			render: (_, code) =>
				code.expiresAt ? (
					<Typography.Text type="secondary">
						{dayjs(code.expiresAt).format("ll")}
					</Typography.Text>
				) : (
					<span className={styles.none}>—</span>
				),
		},
		{
			title: t("admin.checkpoints.promoCodes.column.limits", "Limits"),
			key: "limits",
			width: 180,
			render: (_, code) =>
				code.firstPurchaseOnly ? (
					<Tag>
						{t(
							"admin.checkpoints.promoCodes.limit.firstPurchase",
							"First purchase",
						)}
					</Tag>
				) : (
					<span className={styles.none}>—</span>
				),
		},
		{
			title: t("admin.checkpoints.promoCodes.column.status", "Status"),
			key: "status",
			width: 140,
			render: (_, code) => {
				const value = promoCodeStatus(code);
				const labels: Record<PromoCodeStatus, string> = {
					active: t("admin.checkpoints.promoCodes.status.active", "Active"),
					off: t("admin.checkpoints.promoCodes.status.off", "Off"),
					expired: t("admin.checkpoints.promoCodes.status.expired", "Expired"),
				};
				return <StatusDot tone={STATUS_TONE[value]} label={labels[value]} />;
			},
		},
		{
			key: "action",
			width: 120,
			align: "right",
			render: (_, code) => {
				// The switch is the code's own `active`; an expiry is final either way.
				const expired = isExpired(code);
				return (
					<Tooltip
						title={
							expired
								? t(
										"admin.checkpoints.promoCodes.switch.expired",
										"An expired code can't be turned on.",
									)
								: t("admin.checkpoints.promoCodes.switch.label", "Active")
						}
					>
						<Switch
							size="small"
							aria-label={t(
								"admin.checkpoints.promoCodes.switch.label",
								"Active",
							)}
							checked={code.active}
							loading={
								setActive.isPending && setActive.variables?.id === code.id
							}
							disabled={!canManage || expired}
							onChange={(active) => toggle(code, active)}
						/>
					</Tooltip>
				);
			},
		},
	];

	const emptyText =
		status === "error" ? (
			<EmptyState
				size="compact"
				icon={IconAlertCircle}
				tint="var(--gd-danger-tint)"
				ink="var(--gd-danger-on-tint)"
				title={t(
					"admin.checkpoints.promoCodes.error.title",
					"Couldn't load promo codes",
				)}
				description={t(
					"admin.checkpoints.promoCodes.error.description",
					"Stripe or the server did not answer. Try again in a moment.",
				)}
				action={
					<Button icon={<IconRefresh size={16} />} onClick={onRetry}>
						{t("admin.checkpoints.promoCodes.error.retry", "Try again")}
					</Button>
				}
			/>
		) : (
			<EmptyState
				size="compact"
				icon={IconTicket}
				title={t(
					"admin.checkpoints.promoCodes.empty.title",
					"No promo codes yet",
				)}
				description={t(
					"admin.checkpoints.promoCodes.empty.description",
					"Codes made here are entered on the Stripe checkout page.",
				)}
			/>
		);

	return (
		<Table<PromoCodeDto>
			className={styles.table}
			rowKey="id"
			columns={
				loading
					? columns.map((column) => ({
							...column,
							render: () => (column.key === "action" ? null : skeleton),
						}))
					: columns
			}
			dataSource={loading ? SKELETON_ROWS : status === "error" ? [] : codes}
			pagination={false}
			scroll={{ x: 1060 }}
			locale={{ emptyText }}
		/>
	);
}
