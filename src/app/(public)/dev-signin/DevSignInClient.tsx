"use client";

import { IconUsersGroup } from "@tabler/icons-react";
import { Alert, Button, Flex, List, Tag, Typography } from "antd";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FixtureUser } from "@/repositories/admin/dev-fixture-users";

const { Title, Text } = Typography;

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
				message="This screen does not exist without E2E_TEST_AUTH=1, and never in production."
			/>

			{users.length === 0 ? (
				<EmptyState
					icon={IconUsersGroup}
					title="No fixture accounts in this database"
					description="Run `bun run test-env up` to build one with migrations, reference data, fixtures and personas, then point the app at it with `bun run dev:test`."
				/>
			) : (
				<List
					bordered
					dataSource={users}
					renderItem={(user) => (
						<List.Item
							key={user.email}
							actions={[
								<Button
									key="signin"
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
								</Button>,
							]}
						>
							<List.Item.Meta
								avatar={
									<AppAvatar size={40} src={user.image}>
										{user.name.charAt(0)}
									</AppAvatar>
								}
								title={user.name}
								description={
									<Flex vertical gap={4}>
										<Text code type="secondary">
											{user.email}
										</Text>
										{user.badges.length > 0 && (
											<Flex wrap gap={4}>
												{user.badges.map((badge) => (
													<Tag key={badge} bordered={false}>
														{badge}
													</Tag>
												))}
											</Flex>
										)}
									</Flex>
								}
							/>
						</List.Item>
					)}
				/>
			)}
		</Flex>
	);
}
