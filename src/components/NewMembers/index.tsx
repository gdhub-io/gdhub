import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import axios from "axios";
import dayjs from "dayjs";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { HubSectionRow } from "@/components/hub/HubSectionRow";
import { HubSidebarSkeleton } from "@/components/hub/HubSidebarSkeleton";
import { LoadError, SKILL_LEVEL_STEP } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import type { SkillLevel } from "@/config/prisma-enums";
import styles from "./styles.module.scss";

interface LatestUser {
	id: string;
	image: string | null;
	speciality: string;
	level: SkillLevel | null;
	joinedAt: string;
}

export default function NewMembers() {
	const { t } = useTranslate();

	const {
		data: latestUsers,
		isPending,
		isLoadingError,
		refetch,
	} = useQuery<LatestUser[]>({
		queryKey: ["latest-users"],
		queryFn: () =>
			axios.get<LatestUser[]>("/api/users/latest").then((r) => r.data),
		staleTime: 1000 * 60 * 5,
	});

	const title = t("page.hub.new-members", "New members");

	if (isPending) return <HubSidebarSkeleton title={title} media="circle" />;
	if (!isLoadingError && !latestUsers?.length) return null;

	return (
		<section
			className={`${styles.container} ${getHubSectionShellClass("sidebar")}`}
		>
			<HubSectionHeader
				title={title}
				linkHref={isLoadingError ? undefined : "/hub/members"}
				linkLabel={t("hub.view-all", "View all")}
			/>

			<HubSectionBody flush={!isLoadingError}>
				{isLoadingError ? (
					<LoadError
						bare
						title={t(
							"page.hub.newMembers.error",
							"Members could not be loaded",
						)}
						onRetry={refetch}
					/>
				) : (
					latestUsers?.slice(0, 5).map((user) => (
						<HubSectionRow
							key={user.id}
							href="/hub/members"
							title={user.speciality || t("page.hub.member", "Member")}
							// "Recently joined" said the same thing on every row of a list
							// whose whole premise is that everyone here joined recently.
							// The level is the word only: a filled meter next to five names
							// in a sidebar column pulls the eye away from the names.
							subtitle={[
								user.level && SKILL_LEVEL_STEP[user.level]
									? t(user.level, user.level)
									: null,
								user.joinedAt ? dayjs(user.joinedAt).fromNow() : null,
							]
								.filter(Boolean)
								.join(" · ")}
							media={
								<AppAvatar src={user.image} size={32} className={styles.avatar}>
									{user.speciality?.charAt(0)?.toUpperCase()}
								</AppAvatar>
							}
						/>
					))
				)}
			</HubSectionBody>
		</section>
	);
}
