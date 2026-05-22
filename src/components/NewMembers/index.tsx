import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar } from "antd";
import axios from "axios";
import Link from "next/link";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
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
				linkLabel={`${t("hub.view-all", "View all")} →`}
			/>

			<HubSectionBody>
				<HubSectionBleed className={styles.list}>
					{latestUsers.slice(0, 5).map((user) => (
						<Link
							key={user.id}
							href="/hub/members"
							className={styles.memberItem}
						>
							<div className={styles.memberMain}>
								<Avatar src={user.image} size={28} className={styles.avatar}>
									{user.speciality?.charAt(0)?.toUpperCase()}
								</Avatar>
								<div className={styles.copy}>
									<div className={styles.primary}>
										{user.speciality || t("page.hub.member", "Member")}
									</div>
									<div className={styles.secondary}>
										{t("page.hub.member-joined", "Recently joined")}
									</div>
								</div>
							</div>
							<FaChevronRight className={styles.itemIcon} />
						</Link>
					))}
				</HubSectionBleed>
			</HubSectionBody>
		</section>
	);
}
