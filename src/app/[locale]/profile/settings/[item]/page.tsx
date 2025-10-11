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
import { useEffect, useMemo, useState } from "react";
import ConnectProfileForm from "@/components/profile-forms/ConnectProfileForm";
import GeneralProfileForm from "@/components/profile-forms/GeneralProfileForm";
import InterestsProfileForm from "@/components/profile-forms/InterestsProfileForm";
import MentorshipProfileForm from "@/components/profile-forms/MentorshipProfileForm";
import ResourcesProfileForm from "@/components/profile-forms/ResourcesProfileForm";
import SpecialitiesProfileForm from "@/components/profile-forms/SpecialitiesProfileForm";
import styles from "./style.module.scss";

const ProtectedLayout = dynamic(
	() => import("@/layouts/ProtectedLayoutApp").then((m) => m.ProtectedLayout),
	{ ssr: false },
);

const { Header, Sider, Content } = Layout;

export default function ProfileSettingsPage() {
	const [content, setContent] = useState<React.JSX.Element>();
	const screens = Grid.useBreakpoint();
	const router = useRouter();
	const params = useParams<{ locale: string; item: string }>();
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const { data: session } = useSession();

	const { data: profile } = useQuery({
		queryKey: ["profile-setting", session?.user?.id],
		queryFn: () =>
			axios.get<prismaClient.Profile & { user: Partial<prismaClient.User> }>("/api/user/profile"),
		enabled: !!session?.user,
	});

	const { mutateAsync: saveProfileMutate } = useMutation({
		mutationFn: (data: Partial<prismaClient.Profile>) => axios.put<void>("/api/user/profile", data),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
	});

	const saveProfile = async (data: Partial<prismaClient.Profile>) => {
		await saveProfileMutate(data);
	};

	const settingsMenu = useMemo(
		() => [
			{ label: t("profile.settings.menu.general", "General"), key: "general" },
			{ label: t("profile.settings.menu.specialities", "Specialities"), key: "specialities" },
			{ label: t("profile.settings.menu.mentorship", "Mentorship"), key: "mentorship" },
			{ label: t("profile.settings.menu.resources", "Resources"), key: "resources" },
			{ label: t("profile.settings.menu.connections", "Connections"), key: "connections" },
			{ label: t("profile.settings.menu.interests", "Interests"), key: "interests" },
		],
		[t],
	);

	const switchContent = (key: string) => {
		if (!profile) return;
		let nextContent: React.JSX.Element = (
			<GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />
		);
		switch (key) {
			case "general":
				nextContent = <GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />;
				break;
			case "specialities":
				nextContent = <SpecialitiesProfileForm profile={profile.data} />;
				break;
			case "mentorship":
				nextContent = (
					<MentorshipProfileForm
						profile={profile.data}
						onUpdate={async () => {
							await queryClient.invalidateQueries({ queryKey: ["profile"] });
						}}
					/>
				);
				break;
			case "resources":
				nextContent = <ResourcesProfileForm profile={profile.data} saveProfile={saveProfile} />;
				break;
			case "connections":
				nextContent = <ConnectProfileForm profile={profile.data} saveProfile={saveProfile} />;
				break;
			case "interests":
				nextContent = <InterestsProfileForm profile={profile.data} saveProfile={saveProfile} />;
				break;
		}
		setContent(nextContent);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (!profile?.data) return;

		const key = params?.item || "general";

		switchContent(key as string);
	}, [params?.item, profile?.data]);

	if (!profile?.data) {
		return (
			<ProtectedLayout title={t("Settings")}>
				<></>
			</ProtectedLayout>
		);
	}

	const basePath = `/${params?.locale}/profile/settings`;
	const currentItem = (params?.item as string) || "general";

	return (
		<ProtectedLayout title={t("Settings")}>
			{!screens.lg ? (
				<Header style={{ padding: 0, height: 100 }}>
					<Select
						options={settingsMenu.map((d) => ({ label: d.label, value: d.key }))}
						value={currentItem}
						style={{ width: "100%", margin: "8px 0" }}
						onChange={(value) => router.push(`${basePath}/${value}`)}
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
							selectedKeys={[currentItem]}
							style={{ height: "100%", borderRight: 0 }}
							items={settingsMenu}
							onSelect={({ key }) => router.push(`${basePath}/${String(key)}`)}
						/>
					) : null}
				</Sider>
				<Content className={styles.content}>{content}</Content>
			</Layout>
		</ProtectedLayout>
	);
}
