"use client";

import {
	IconCalendar,
	IconChevronLeft,
	IconChevronRight,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, DatePicker, Flex } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import { MarkPayoutPaidModal } from "@/components/admin/MarkPayoutPaidModal";
import { PayoutNoteModal } from "@/components/admin/PayoutNoteModal";
import { PayoutsTable } from "@/components/admin/PayoutsTable";
import { ProtectedPageHeader } from "@/components/layouts/ProtectedPageHeader";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { useAdminPayouts } from "@/hooks/payouts";
import type { AdminPayoutRowDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

const MONTH = "YYYY-MM";

/** Frame 13.2 (`DM48P`): one month of curator payouts, last month first. */
export function PayoutsPage() {
	const { t } = useTranslate();
	const { can } = useAccess();
	const canManage = can("admin.payouts.manage");
	const [month, setMonth] = useState(() =>
		dayjs().subtract(1, "month").format(MONTH),
	);
	const payouts = useAdminPayouts(month);
	const [paying, setPaying] = useState<AdminPayoutRowDto | null>(null);
	const [noting, setNoting] = useState<AdminPayoutRowDto | null>(null);

	const current = dayjs().format(MONTH);
	const firstMonth = payouts.data?.firstMonth
		? dayjs.utc(payouts.data.firstMonth).format(MONTH)
		: null;
	// The list may still be the previous month while the next one loads.
	const shownMonth = payouts.data?.month ?? `${month}-01T00:00:00.000Z`;

	const shift = (by: number) =>
		setMonth(dayjs(`${month}-01`).add(by, "month").format(MONTH));

	return (
		<AdminSpace>
			<div className="layout-background">
				<ProtectedPageHeader
					title={t("admin.payouts.title", "Payouts")}
					extra={
						<Flex gap={8} align="center">
							<Button
								icon={<IconChevronLeft size={16} />}
								aria-label={t("admin.payouts.month.previous", "Previous month")}
								disabled={!firstMonth || month <= firstMonth}
								onClick={() => shift(-1)}
							/>
							<DatePicker
								picker="month"
								variant="filled"
								className={styles.month}
								format="MMMM YYYY"
								allowClear={false}
								prefix={<IconCalendar size={16} />}
								suffixIcon={null}
								value={dayjs(`${month}-01`)}
								onChange={(value) => value && setMonth(value.format(MONTH))}
								disabledDate={(day) => {
									const value = day.format(MONTH);
									return (
										value > current || (!!firstMonth && value < firstMonth)
									);
								}}
							/>
							<Button
								icon={<IconChevronRight size={16} />}
								aria-label={t("admin.payouts.month.next", "Next month")}
								disabled={month >= current}
								onClick={() => shift(1)}
							/>
						</Flex>
					}
				/>

				<PayoutsTable
					data={payouts.data}
					// A failed refetch keeps the rows it already has.
					status={payouts.data ? "success" : payouts.status}
					onRetry={() => payouts.refetch()}
					canManage={canManage}
					onMarkPaid={setPaying}
					onEditNote={setNoting}
				/>

				{/* Keyed so each curator opens on fresh details, fields and mutation. */}
				{paying && (
					<MarkPayoutPaidModal
						key={paying.curatorId}
						row={paying}
						month={shownMonth}
						onClose={() => setPaying(null)}
					/>
				)}
				{noting?.payout && (
					<PayoutNoteModal
						key={noting.curatorId}
						row={noting}
						payout={noting.payout}
						month={shownMonth}
						onClose={() => setNoting(null)}
					/>
				)}
			</div>
		</AdminSpace>
	);
}
