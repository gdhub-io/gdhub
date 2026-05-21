"use client";

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import axios from "axios";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import styles from "./style.module.scss";

const ConnectProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/ConnectProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const GeneralProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/GeneralProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const InterestsProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/InterestsProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const MentorshipProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/MentorshipProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const ResourcesProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/ResourcesProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const SpecialitiesProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/SpecialitiesProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const DangerProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/DangerProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);

const { Header, Sider, Content } = Layout;

export default function ProfileSettingsPage() {
	const [content, setContent] = useState<React.JSX.Element>();
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const params = useParams<{ item?: string }>();
	const currentItem = (params?.item as string) || "general";
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const { data: session } = useSession();
	const { data: profile } = useQuery({
		queryKey: ["profile-setting", session?.user.id],
		queryFn: () =>
			axios.get<prismaClient.Profile & { user: Partial<prismaClient.User> }>(
				"/api/user/profile",
			),
		enabled: !!session?.user,
	});
	const { mutateAsync: saveProfileMutate } = useMutation({
		mutationFn: (variables: any) =>
			axios.put<void>("/api/user/profile", variables),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
	});

	const saveProfile = useCallback(
		async (variables: any) => {
			await saveProfileMutate(variables);
		},
		[saveProfileMutate],
	);

	const settingsMenu: any[] = [
		{ label: t("profile.settings.menu.general", "General"), key: "general" },
		{
			label: t("profile.settings.menu.specialities", "Specialities"),
			key: "specialities",
		},
		{
			label: t("profile.settings.menu.mentorship", "Mentorship"),
			key: "mentorship",
		},
		{
			label: t("profile.settings.menu.resources", "Resources"),
			key: "resources",
		},
		{
			label: t("profile.settings.menu.connections", "Connections"),
			key: "connections",
		},
		{
			label: t("profile.settings.menu.interests", "Interests"),
			key: "interests",
		},
		{ label: t("profile.settings.menu.danger", "Danger Zone"), key: "danger" },
	];

	const switchContent = useCallback(
		(key: string) => {
			if (!profile) return;

			let _content = (
				<GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />
			);

			switch (key) {
				case "general":
					_content = (
						<GeneralProfileForm
							profile={profile.data}
							saveProfile={saveProfile}
						/>
					);
					break;
				case "specialities":
					_content = <SpecialitiesProfileForm profile={profile.data} />;
					break;
				case "mentorship":
					_content = (
						<MentorshipProfileForm
							profile={profile.data}
							onUpdate={async () => {
								await queryClient.invalidateQueries({ queryKey: ["profile"] });
							}}
						/>
					);
					break;
				case "resources":
					_content = (
						<ResourcesProfileForm
							profile={profile.data}
							saveProfile={saveProfile}
						/>
					);
					break;
				case "connections":
					_content = (
						<ConnectProfileForm
							profile={profile.data}
							saveProfile={saveProfile}
						/>
					);
					break;
				case "interests":
					_content = (
						<InterestsProfileForm
							profile={profile.data}
							saveProfile={saveProfile}
						/>
					);
					break;
				case "danger":
					_content = <DangerProfileForm />;
					break;
			}

			setContent(_content);
		},
		[profile, queryClient.invalidateQueries, saveProfile],
	);

	useEffect(() => {
		if (profile?.data) {
			switchContent(currentItem);
		}
	}, [currentItem, profile?.data, switchContent]);

	if (!profile?.data)
		return (
			<ProtectedLayout title={t("Settings")}>
				<></>
			</ProtectedLayout>
		);

	return (
		<ProtectedLayout title={t("Settings")}>
			{!screens.lg ? (
				<Header style={{ padding: 0, height: 100 }}>
					<Select
						options={settingsMenu.map((d) => ({
							label: d.label,
							value: d.key,
						}))}
						value={currentItem}
						style={{ width: "100%", margin: "8px 0" }}
						onChange={(value) => router.push(`/profile/settings/${value}`)}
					/>
				</Header>
			) : null}
			<Layout>
				<Sider
					width={200}
					theme="light"
					className={styles.sider}
					breakpoint="lg"
					collapsedWidth="0"
					trigger={null}
				>
					{screens.lg ? (
						<Menu
							mode="vertical"
							theme="light"
							defaultSelectedKeys={[currentItem]}
							style={{ height: "100%", borderRight: 0 }}
							items={settingsMenu}
							onSelect={({ key }) => router.push(`/profile/settings/${key}`)}
						/>
					) : null}
				</Sider>
				<Content className={styles.content}>{content}</Content>
			</Layout>
		</ProtectedLayout>
	);
}
