"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Flex, InputNumber, Table, Typography } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { teamCapacity } from "@/lib/checkpoint-capacity";
import styles from "./TeamResource.module.scss";
import { type TeamHoursRow, useTeamHours } from "./teamHours";

export type TeamResourceProps = {
	teamId?: string;
	/**
	 * The author's own hours while they are being typed. Owned by the step, so
	 * the way forward can read them before the profile has been written.
	 */
	mine?: number[];
	onMine?: (hours: number[]) => void;
};

/**
 * What the team actually has to spend on these 28 days.
 *
 * Hours a sprint come from each member's own profile — the number they gave when
 * they said what they could put in — and the only one editable here is the
 * author's own: correcting somebody else's availability from a purchase screen
 * would be putting words in their mouth. The totals go through `teamCapacity`,
 * the same rule the curator is given: a member who stated nothing is unknown,
 * never zero, and must not drag the team's figure down.
 */
export function TeamResource({ teamId, mine, onMine }: TeamResourceProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data: session } = useSession();
	const queryClient = useQueryClient();

	const { members, isLoading, statedFor } = useTeamHours(teamId);

	const save = useMutation({
		mutationFn: async (timeForWork: number[]) =>
			axios.put("/api/user/profile", { timeForWork }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["user-project-team", teamId],
			}),
		onError: () =>
			message.error(t("checkpoints.goal.saveFailed", "Could not save")),
	});

	const hoursOf = (row: TeamHoursRow): [number, number] | null => {
		const own = row.userId === session?.user?.id ? mine : undefined;

		return own ? [own[0] ?? 0, own[1] ?? own[0] ?? 0] : statedFor(row);
	};

	const total = teamCapacity(
		members.map((row) => ({ timeForWork: hoursOf(row) })),
	);

	const span = (from: number, to: number) =>
		from === to ? `${from}` : `${from}–${to}`;

	const unknown = t("checkpoints.when.teamUnknown", "not stated");

	return (
		<Table<TeamHoursRow>
			size="middle"
			pagination={false}
			loading={isLoading}
			rowKey="id"
			className={styles.table}
			dataSource={members}
			columns={[
				{
					key: "who",
					title: t("checkpoints.when.teamMember", "Who"),
					render: (_: unknown, row: TeamHoursRow) => (
						<Flex gap={12} align="center">
							<AppAvatar src={row.user.image} size={28}>
								{row.user.name?.slice(0, 1).toUpperCase()}
							</AppAvatar>
							<Flex vertical gap={0}>
								<Typography.Text>{row.user.name}</Typography.Text>
								<Typography.Text type="secondary" className={styles.role}>
									{row.speciality?.name ?? row.position}
								</Typography.Text>
							</Flex>
						</Flex>
					),
				},
				{
					key: "week",
					width: 240,
					align: "right",
					title: t("checkpoints.when.teamWeek", "Hours / sprint"),
					render: (_: unknown, row: TeamHoursRow) => {
						const stated = hoursOf(row);
						const [from, to] = stated ?? [0, 0];

						if (row.userId !== session?.user?.id)
							return (
								<Typography.Text
									className={styles.figure}
									type={stated ? undefined : "secondary"}
								>
									{stated ? span(from, to) : unknown}
								</Typography.Text>
							);

						// The author's own line is editable here: they are the one
						// deciding whether these 28 days are worth buying.
						return (
							<Flex gap={8} align="center" justify="flex-end">
								<Typography.Text type="secondary" className={styles.inputLabel}>
									{t("checkpoints.when.teamFrom", "From")}
								</Typography.Text>
								<InputNumber
									variant="filled"
									min={0}
									max={80}
									value={from}
									size="small"
									className={styles.hours}
									onChange={(value) => onMine?.([value ?? 0, to])}
									onBlur={() => save.mutate([from, to])}
								/>
								<Typography.Text type="secondary" className={styles.inputLabel}>
									{t("checkpoints.when.teamTo", "To")}
								</Typography.Text>
								<InputNumber
									variant="filled"
									min={0}
									max={80}
									value={to}
									size="small"
									className={styles.hours}
									onChange={(value) => onMine?.([from, value ?? 0])}
									onBlur={() => save.mutate([from, to])}
								/>
							</Flex>
						);
					},
				},
				{
					key: "run",
					width: 180,
					align: "right",
					title: t("checkpoints.when.teamRun", "Over the 28 days"),
					render: (_: unknown, row: TeamHoursRow) => {
						const stated = hoursOf(row);
						const run = teamCapacity([{ timeForWork: stated }]).hoursPerRun;

						return (
							<Typography.Text
								className={styles.figure}
								type={run ? undefined : "secondary"}
							>
								{run ? span(run.from, run.to) : "—"}
							</Typography.Text>
						);
					},
				},
			]}
			summary={() => (
				<Table.Summary.Row>
					<Table.Summary.Cell index={0}>
						<Typography.Text strong>
							{total.stated === total.members
								? t("checkpoints.when.teamTotal", "The team")
								: t(
										"checkpoints.when.teamTotalPart",
										"The team — {stated} of {members} stated",
										{ stated: total.stated, members: total.members },
									)}
						</Typography.Text>
					</Table.Summary.Cell>
					<Table.Summary.Cell index={1} align="right">
						<Typography.Text strong className={styles.figure}>
							{total.hoursPerWeek
								? span(total.hoursPerWeek.from, total.hoursPerWeek.to)
								: "—"}
						</Typography.Text>
					</Table.Summary.Cell>
					<Table.Summary.Cell index={2} align="right">
						<Typography.Text strong className={styles.figure}>
							{total.hoursPerRun
								? span(total.hoursPerRun.from, total.hoursPerRun.to)
								: "—"}
						</Typography.Text>
					</Table.Summary.Cell>
				</Table.Summary.Row>
			)}
		/>
	);
}
