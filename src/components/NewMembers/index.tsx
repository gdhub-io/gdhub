import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import { IconNews } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Flex, Tooltip, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
import styles from "./styles.module.scss";

interface LatestUser {
	id: string;
	image: string | null;
	speciality: string;
}

const { Title } = Typography;

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
		<div className={styles.container}>
			<Flex align="center" gap={8} style={{ marginBottom: 24 }}>
				<IconNews size={24} />
				<Title level={2}>{t("page.hub.new-members", "New members")}</Title>
			</Flex>

			<div className={styles.card}>
				<div className={styles.scroller}>
					{latestUsers.slice(0, 10).map((user) => (
						<div key={user.id} className={styles.memberItem}>
							<div className={styles.avatarWrapper}>
								<Avatar src={user.image} size={56} className={styles.avatar} />
							</div>
							<div className={styles.speciality}>{user.speciality}</div>
						</div>
					))}
				</div>

				<div className={styles.rightFade} aria-hidden="true" />
				<Tooltip title={t("all-members", "All members")}>
					<Link href="/hub/members" className={styles.navButtonLink}>
						<Button
							type="text"
							shape="circle"
							icon={<FaChevronRight />}
							className={styles.navButton}
						/>
					</Link>
				</Tooltip>
			</div>
		</div>
	);
}
