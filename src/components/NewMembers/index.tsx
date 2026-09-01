import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { HubSectionRow } from "@/components/hub/HubSectionRow";
import { SKILL_LEVEL_STEP } from "@/components/ui";
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

	const { data: latestUsers } = useQuery<LatestUser[]>({
		queryKey: ["latest-users"],
		queryFn: () =>
			axios.get<LatestUser[]>("/api/users/latest").then((r) => r.data),
		staleTime: 1000 * 60 * 5,
	});

	if (!latestUsers || latestUsers.length === 0) {
		return null;
	}

	return (
		<section
			className={`${styles.container} ${getHubSectionShellClass("sidebar")}`}
		>
			<HubSectionHeader
				title={t("page.hub.new-members", "New members")}
				linkHref="/hub/members"
				linkLabel={t("hub.view-all", "View all")}
			/>

			<HubSectionBody flush>
				{latestUsers.slice(0, 5).map((user) => (
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
				))}
			</HubSectionBody>
		</section>
	);
}
