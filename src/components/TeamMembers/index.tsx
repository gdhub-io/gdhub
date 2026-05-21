import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Flex, List, Space, Typography } from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import ReactNiceAvatar, { genConfig } from "react-nice-avatar";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import styles from "./styles.module.scss";

const { Title, Text } = Typography;

interface TeamMembersArgs {
	teamId: string;
	variant?: "default" | "hubSidebar";
}

const TeamMembers = ({ teamId, variant = "default" }: TeamMembersArgs) => {
	const { data: session } = useSession();
	const { t } = useTranslate();

	const { data: team } = useQuery({
		queryKey: ["team-members", teamId],
		queryFn: () =>
			axios.get<
				prismaClient.Team & {
					members: (prismaClient.TeamMember & { user: prismaClient.User })[];
				}
			>("/api/project/team", {
				params: { teamId },
			}),
		enabled: !!teamId,
		refetchOnWindowFocus: false,
	});

	const data:
		| {
				title: string | null;
				description: string | null;
				avatar: string | null;
		  }[]
		| undefined = useMemo(() => {
		if (!team?.data) return [];

		return team.data.members.map(
			(member: prismaClient.TeamMember & { user: prismaClient.User }) => ({
				title: member.user.name,
				description: member.position,
				avatar: member.user.image,
			}),
		);
	}, [team]);

	if (team && team?.data.members.length == 0) return null;

	if (variant === "hubSidebar") {
		return (
			<section className={getHubSectionShellClass("sidebar")}>
				<HubSectionHeader title={t("team-members.title", "Team")} />
				<HubSectionBody>
					<HubSectionBleed>
						<Flex vertical>
							{data?.map((item, idx) => (
								<Flex
									key={`team-member-${idx.toString()}`}
									align="center"
									gap={12}
									className={styles.item}
								>
									{session ? (
										item.avatar ? (
											<Avatar size={40} src={item.avatar} />
										) : (
											<Avatar size={40}>
												{item.title?.charAt(0)?.toUpperCase()}
											</Avatar>
										)
									) : (
										<ReactNiceAvatar
											style={{ width: 40, height: 40 }}
											{...genConfig(item.description || "")}
											earSize="big"
											eyeStyle="circle"
											hairStyle="normal"
										/>
									)}
									<Flex vertical className={styles.textWrap}>
										{session && (
											<Text strong title={item.title || ""} ellipsis>
												{item.title}
											</Text>
										)}
										<Text
											type="secondary"
											title={item.description || ""}
											ellipsis
											className={styles.secondary}
										>
											{item.description}
										</Text>
									</Flex>
								</Flex>
							))}
						</Flex>
					</HubSectionBleed>
				</HubSectionBody>
			</section>
		);
	}

	return (
		<Space orientation="vertical" style={{ marginTop: 60, width: "100%" }}>
			<Title level={2}>{t("team-members.title", "Team")}</Title>

			{!!session && (
				<List
					grid={{ gutter: 16, xs: 1, sm: 1, md: 1, column: 1 }}
					itemLayout="horizontal"
					dataSource={data}
					renderItem={(item, index) =>
						session ? (
							<List.Item key={index}>
								<List.Item.Meta
									avatar={<Avatar size={64} src={item.avatar} />}
									title={item.title}
									description={item.description}
								/>
							</List.Item>
						) : (
							<></>
						)
					}
				/>
			)}

			{!session && (
				<Flex wrap="wrap" gap={16}>
					{data.map((item, idx) => (
						<Space key={`team-member-${idx.toString()}`}>
							<ReactNiceAvatar
								style={{ width: "42px", height: "42px" }}
								{...genConfig(item.description || "")}
								earSize="big"
								eyeStyle="circle"
								hairStyle="normal"
							/>
							<Text>{item.description}</Text>
						</Space>
					))}
				</Flex>
			)}
		</Space>
	);
};

export default TeamMembers;
