import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar } from "antd";
import axios from "axios";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { HubSectionRow } from "@/components/hub/HubSectionRow";
import styles from "./styles.module.scss";

interface LatestUser {
	id: string;
	image: string | null;
	speciality: string;
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
						subtitle={t("page.hub.member-joined", "Recently joined")}
						media={
							<Avatar src={user.image} size={32} className={styles.avatar}>
								{user.speciality?.charAt(0)?.toUpperCase()}
							</Avatar>
						}
					/>
				))}
			</HubSectionBody>
		</section>
	);
}
