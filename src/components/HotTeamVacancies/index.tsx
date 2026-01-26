import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import { IconFlame } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Flex, Space, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
import styles from "./styles.module.scss";

interface HotVacancyItem {
	id: string;
	title: string;
	finishedAt: string;
	project: {
		name: string;
		coverImage: string | null;
		slug: string;
	};
}

const { Title, Text } = Typography;

export default function HotTeamVacancies() {
	const { t } = useTranslate();

	const { data: vacancies } = useQuery<HotVacancyItem[]>({
		queryKey: ["hot-team-vacancies"],
		queryFn: () =>
			axios.get<HotVacancyItem[]>("/api/vacancies/hot").then((r) => r.data),
		staleTime: 1000 * 60 * 3,
	});

	if (!vacancies?.length) return null;

	return (
		<div className={styles.container}>
			<Flex align="center" justify="space-between" className={styles.header}>
				<Space>
					<IconFlame size={24} style={{ position: "relative", top: 2 }} />
					<Title level={4} className={styles.title}>
						{t("hub.hot-vacancies.title", "Hot vacancies")}
					</Title>
				</Space>

				<Link href="/hub/vacancies" className={styles.seeAll}>
					<Text type="secondary">
						{t("hub.hot-vacancies.see-all", "See all")}
					</Text>
					<FaChevronRight className={styles.seeAllIcon} />
				</Link>
			</Flex>

			<div className={styles.list}>
				{vacancies.slice(0, 5).map((v) => (
					<Link key={v.id} href={`/job/${v.id}`} className={styles.item}>
						<div className={styles.itemLeft}>
							<Avatar
								src={v.project.coverImage ?? undefined}
								size={40}
								className={styles.avatar}
							>
								{v.project.name?.charAt(0)?.toUpperCase()}
							</Avatar>
							<div className={styles.textWrap}>
								<div className={styles.primary} title={v.title}>
									{v.title}
								</div>
								<div className={styles.secondary} title={v.project.name}>
									{v.project.name}
								</div>
							</div>
						</div>
						<FaChevronRight className={styles.itemIcon} />
					</Link>
				))}
			</div>
		</div>
	);
}
