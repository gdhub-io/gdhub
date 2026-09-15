"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { App, Flex, InputNumber, Table, Typography } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { SPRINTS_PER_CHECKPOINT } from "@/lib/checkpoint-sprints";
import styles from "./TeamResource.module.scss";

type TeamRow = {
	id: string;
	userId: string;
	position: string | null;
	speciality?: { name?: string | null } | null;
	user: {
		name: string | null;
		image: string | null;
		profile?: { timeForWork: number[] } | null;
	};
};

export type TeamResourceProps = {
	teamId?: string;
};

/**
 * What the team actually has to spend on these 28 days.
 *
 * Hours a week come from each member's own profile — the number they gave when
 * they said what they could put in — and the only one editable here is the
 * author's own: correcting somebody else's availability from a purchase screen
 * would be putting words in their mouth. Four sprints, so the checkpoint's
 * figure is that week times four; it is a range because the profile stores one.
 */
export function TeamResource({ teamId }: TeamResourceProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const [mine, setMine] = useState<number[]>();

	const { data, isLoading } = useQuery({
		queryKey: ["user-project-team", teamId],
		queryFn: async () =>
			(
				await axios.get<{ members: TeamRow[] }>("/api/user/project/team", {
					params: { teamId },
				})
			).data,
		enabled: !!teamId,
	});

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

	const members = data?.members ?? [];

	const hoursOf = (row: TeamRow) => {
		const own = row.userId === session?.user?.id ? mine : undefined;
		const stated = own ?? row.user.profile?.timeForWork ?? [];

		return [stated[0] ?? 0, stated[1] ?? stated[0] ?? 0];
	};

	const total = members.reduce(
		(sum, row) => {
			const [from, to] = hoursOf(row);

			return [sum[0] + from, sum[1] + to];
		},
		[0, 0],
	);

	const span = (from: number, to: number) =>
		from === to ? `${from}` : `${from}–${to}`;

	return (
		<Flex vertical gap={8}>
			<Typography.Text strong>
				{t("checkpoints.when.teamTitle", "What the team has for these 28 days")}
			</Typography.Text>

			<Table<TeamRow>
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
						render: (_: unknown, row: TeamRow) => (
							<Flex gap={10} align="center">
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
						width: 220,
						title: t("checkpoints.when.teamWeek", "Hours a week"),
						render: (_: unknown, row: TeamRow) => {
							const [from, to] = hoursOf(row);

							if (row.userId !== session?.user?.id)
								return (
									<Typography.Text className={styles.figure}>
										{span(from, to)}
									</Typography.Text>
								);

							// The author's own line is editable here: they are the one
							// deciding whether these 28 days are worth buying.
							return (
								<Flex gap={6} align="center">
									<InputNumber
										min={0}
										max={80}
										value={from}
										size="small"
										onChange={(value) => setMine([value ?? 0, to])}
										onBlur={() => save.mutate([from, to])}
									/>
									<span>–</span>
									<InputNumber
										min={0}
										max={80}
										value={to}
										size="small"
										onChange={(value) => setMine([from, value ?? 0])}
										onBlur={() => save.mutate([from, to])}
									/>
								</Flex>
							);
						},
					},
					{
						key: "run",
						width: 160,
						align: "right",
						title: t("checkpoints.when.teamRun", "Over the 28 days"),
						render: (_: unknown, row: TeamRow) => {
							const [from, to] = hoursOf(row);

							return (
								<Typography.Text className={styles.figure}>
									{span(
										from * SPRINTS_PER_CHECKPOINT,
										to * SPRINTS_PER_CHECKPOINT,
									)}
								</Typography.Text>
							);
						},
					},
				]}
				summary={() => (
					<Table.Summary.Row>
						<Table.Summary.Cell index={0}>
							<Typography.Text strong>
								{t("checkpoints.when.teamTotal", "The team")}
							</Typography.Text>
						</Table.Summary.Cell>
						<Table.Summary.Cell index={1}>
							<Typography.Text strong className={styles.figure}>
								{span(total[0], total[1])}
							</Typography.Text>
						</Table.Summary.Cell>
						<Table.Summary.Cell index={2} align="right">
							<Typography.Text strong className={styles.figure}>
								{span(
									total[0] * SPRINTS_PER_CHECKPOINT,
									total[1] * SPRINTS_PER_CHECKPOINT,
								)}
							</Typography.Text>
						</Table.Summary.Cell>
					</Table.Summary.Row>
				)}
			/>

			<Typography.Text type="secondary" className={styles.note}>
				{t(
					"checkpoints.when.teamNote",
					"Hours come from each member's own profile. Only your own line is yours to correct here.",
				)}
			</Typography.Text>
		</Flex>
	);
}
