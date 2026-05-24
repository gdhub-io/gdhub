import { FaChevronRight } from "@react-icons/all-files/fa/FaChevronRight";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Skeleton } from "antd";
import axios from "axios";
import Link from "next/link";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import styles from "./styles.module.scss";

const VACANCY_DOT_COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"];

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

export default function HotTeamVacancies() {
	const { t } = useTranslate();

	const {
		data: vacancies,
		isLoading,
		isFetched,
	} = useQuery<HotVacancyItem[]>({
		queryKey: ["hot-team-vacancies"],
		queryFn: () =>
			axios.get<HotVacancyItem[]>("/api/vacancies/hot").then((r) => r.data),
		staleTime: 1000 * 60 * 3,
	});

	if (!vacancies?.length && isFetched) return null;

	return (
		<Skeleton active loading={isLoading}>
			<section
				className={`${styles.container} ${getHubSectionShellClass("sidebar")}`}
			>
				<HubSectionHeader
					title={t("hub.hot-vacancies.title", "Open positions")}
					linkHref="/hub/jobs"
					linkLabel={`${t("hub.view-all", "View all")} →`}
				/>

				<HubSectionBody>
					<HubSectionBleed className={styles.list}>
						{vacancies?.slice(0, 5).map((v, index) => (
							<Link key={v.id} href={`/job/${v.id}`} className={styles.item}>
								<div className={styles.itemLeft}>
									<span
										className={styles.accentDot}
										style={{
											background:
												VACANCY_DOT_COLORS[index % VACANCY_DOT_COLORS.length],
										}}
										aria-hidden
									/>
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
					</HubSectionBleed>
				</HubSectionBody>
			</section>
		</Skeleton>
	);
}
