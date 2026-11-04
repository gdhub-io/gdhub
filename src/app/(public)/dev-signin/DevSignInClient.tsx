"use client";

import { IconUsersGroup } from "@tabler/icons-react";
import { Alert, Button, Flex, Tag, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FixtureUser } from "@/repositories/admin/dev-fixture-users";
import styles from "./style.module.scss";

const { Title, Text } = Typography;

/** A person owning three projects reads "project · owner ×3", not three equal tags. */
const countBadges = (badges: string[]) => [
	...badges.reduce(
		(counts, badge) => counts.set(badge, (counts.get(badge) ?? 0) + 1),
		new Map<string, number>(),
	),
];

/**
 * Untranslated on purpose: the screen only exists where `E2E_TEST_AUTH=1` is
 * set, so pushing its copy to Tolgee would put unreachable strings in front of
 * every translator.
 */
export function DevSignInClient({ users }: { users: FixtureUser[] }) {
	const [signingIn, setSigningIn] = useState<string | null>(null);

	return (
		<Flex
			vertical
			gap={24}
			style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}
		>
			<Flex vertical gap={4}>
				<Title level={2} style={{ margin: 0 }}>
					Sign in as a fixture
				</Title>
				<Text type="secondary">
					Test accounts from the throwaway database, so a screen can be checked
					as the kind of person it was built for.
				</Text>
			</Flex>

			<Alert
				type="info"
				showIcon
				title="This screen does not exist without E2E_TEST_AUTH=1, and never in production."
			/>

			{users.length === 0 ? (
				<EmptyState
					icon={IconUsersGroup}
					title="No fixture accounts in this database"
					description="Run `bun run test-env up` to build one with migrations, reference data, fixtures and personas, then point the app at it with `bun run dev:test`."
				/>
			) : (
				// ui-guard-ignore antd's List is deprecated in v6; this is the same outlined list without it.
				<div className={styles.list}>
					{users.map((user) => (
						<Flex
							key={user.email}
							gap={16}
							align="center"
							className={styles.row}
						>
							<AppAvatar size={40} src={user.image}>
								{user.name.charAt(0)}
							</AppAvatar>
							<Flex vertical gap={4} flex={1} className={styles.min0}>
								<Text strong>{user.name}</Text>
								<Text code type="secondary">
									{user.email}
								</Text>
								{user.badges.length > 0 && (
									<Flex wrap gap={4}>
										{countBadges(user.badges).map(([badge, count]) => (
											<Tag key={badge} variant="filled">
												{count > 1 ? `${badge} ×${count}` : badge}
											</Tag>
										))}
									</Flex>
								)}
							</Flex>
							<Button
								type="primary"
								loading={signingIn === user.email}
								onClick={() => {
									setSigningIn(user.email);
									signIn("e2e-credentials", {
										email: user.email,
										callbackUrl: "/hub",
									});
								}}
							>
								Sign in
							</Button>
						</Flex>
					))}
				</div>
			)}
		</Flex>
	);
}
