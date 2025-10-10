"use client";

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Grid, Layout, Menu, Select } from "antd";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import ConnectProfileForm from "@/components/profile-forms/ConnectProfileForm";
import GeneralProfileForm from "@/components/profile-forms/GeneralProfileForm";
import InterestsProfileForm from "@/components/profile-forms/InterestsProfileForm";
import MentorshipProfileForm from "@/components/profile-forms/MentorshipProfileForm";
import ResourcesProfileForm from "@/components/profile-forms/ResourcesProfileForm";
import SpecialitiesProfileForm from "@/components/profile-forms/SpecialitiesProfileForm";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import type { NextPageWithLayout } from "@/pages/_app";
import styles from "./style.module.scss";

const { Header, Sider, Content } = Layout;

const ProfilePage: NextPageWithLayout = () => {
	const [content, setContent] = useState<React.JSX.Element>();
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const { data: session } = useSession();
	const { data: profile } = useQuery({
		queryKey: ["profile-setting", session?.user.id],
		queryFn: () =>
			axios.get<prismaClient.Profile & { user: Partial<prismaClient.User> }>("/api/user/profile"),
		enabled: !!session?.user,
	});
	const { mutateAsync: saveProfileMutate } = useMutation({
		mutationFn: (variables: any) => axios.put<void>("/api/user/profile", variables),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
	});

	const saveProfile = async (variables: any) => {
		await saveProfileMutate(variables);
	};

	const settingsMenu: any[] = [
		{
			label: t("profile.settings.menu.general", "General"),
			key: "general",
		},
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
	];

	useEffect(() => {
		if (profile?.data && router.query.item) {
			switchContent((router.query.item as string) || "general");
		}
	}, [router.query.item, profile?.data]);

	const switchContent = (key: string) => {
		if (!profile) return;

		let _content = <GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />;

		switch (key) {
			case "general":
				_content = <GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />;
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
				_content = <ResourcesProfileForm profile={profile.data} saveProfile={saveProfile} />;
				break;
			case "connections":
				_content = <ConnectProfileForm profile={profile.data} saveProfile={saveProfile} />;
				break;
			case "interests":
				_content = <InterestsProfileForm profile={profile.data} saveProfile={saveProfile} />;
				break;
		}

		setContent(_content);
	};

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
						options={settingsMenu.map((d) => ({ label: d.label, value: d.key }))}
						value={(router.query?.item as string) || "general"}
						style={{ width: "100%", margin: "8px 0" }}
						onChange={(value) => router.push(`/profile/settings/${value}`)}
					/>
				</Header>
			) : null}
			<Layout>
				<Sider
					width={200}
					className={styles.sider}
					breakpoint="lg"
					collapsedWidth="0"
					trigger={null}
				>
					{screens.lg ? (
						<Menu
							mode="vertical"
							defaultSelectedKeys={[(router.query?.item as string) || "general"]}
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
};

export default ProfilePage;
