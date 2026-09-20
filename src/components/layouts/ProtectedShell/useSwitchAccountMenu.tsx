"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { type MenuProps, Space, Tag, Tooltip, Typography } from "antd";
import axios from "axios";
import { signIn, useSession } from "next-auth/react";
import { useMemo } from "react";
import { endChatSession } from "@/components/Chat/session";
import { AppAvatar } from "@/components/ui/AppAvatar";
import type { FixtureUser } from "@/repositories/dev-fixture-users.repository";
import styles from "./style.module.scss";

const { Text } = Typography;

// Inlined by the bundler, so the request below is never even built into a
// production bundle.
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * "Switch account" for the header menu — signs in as one of the fixture users
 * the `/dev-signin` page lists, without going through it.
 *
 * Returns nothing unless `/api/dev/fixture-users` answers, which it only does
 * where the credentials provider that performs the switch exists
 * (`E2E_TEST_AUTH=1`, never production). Untranslated for the same reason the
 * dev sign-in screen is: unreachable copy has no business in Tolgee.
 *
 * Belongs at the top of the menu: the submenu opens level with its own row, and
 * from the bottom of a long menu it would have to flip upwards to fit.
 */
export function useSwitchAccountMenuItems(): NonNullable<MenuProps["items"]> {
	const { data: session } = useSession();
	const { data: users } = useQuery<FixtureUser[]>({
		queryKey: ["dev-fixture-users"],
		// 404 is the expected answer wherever the switch cannot work, not a failure.
		queryFn: () =>
			axios
				.get<FixtureUser[]>("/api/dev/fixture-users", {
					validateStatus: (status) => status === 200 || status === 404,
				})
				.then((res) => (res.status === 200 ? res.data : [])),
		enabled: isDevelopment,
		staleTime: Number.POSITIVE_INFINITY,
	});

	return useMemo(() => {
		if (!users?.length) return [];

		return [
			{
				key: "switch-account",
				label: "Switch account",
				popupClassName: styles.switchAccountPopup,
				children: users.map((user) => {
					const isCurrent = user.email === session?.user?.email;

					return {
						key: `switch-account:${user.email}`,
						// The account in use is named, not offered: switching to it is a
						// page reload that changes nothing.
						disabled: isCurrent,
						icon: (
							<AppAvatar size={20} src={user.image}>
								{user.name.charAt(0)}
							</AppAvatar>
						),
						label: (
							<Space size={8}>
								{user.name}
								<Text type="secondary">{user.email}</Text>
								{isCurrent && (
									<Tag color="blue" bordered={false}>
										you
									</Tag>
								)}
							</Space>
						),
						extra: (
							<Tooltip
								placement="right"
								title={
									user.badges.length > 0
										? user.badges.join(", ")
										: "No roles beyond a plain account"
								}
							>
								<IconInfoCircle size={16} />
							</Tooltip>
						),
						// The Matrix session goes first: its device, pusher and cached
						// timeline would otherwise carry over to the account signed in next.
						onClick: async () => {
							await endChatSession().catch(() => {});
							signIn("e2e-credentials", {
								email: user.email,
								callbackUrl: window.location.href,
							});
						},
					};
				}),
			},
			{ type: "divider", key: "switch-account-divider" },
		];
	}, [users, session?.user?.email]);
}
