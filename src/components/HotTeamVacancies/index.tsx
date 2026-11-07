import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Skeleton } from "antd";
import axios from "axios";
import { getWorkDirection } from "@/components/DirectionBadge";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { HubSectionRow } from "@/components/hub/HubSectionRow";
import { IconTile, LoadError } from "@/components/ui";
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
	direction: string | null;
}

export default function HotTeamVacancies() {
	const { t } = useTranslate();

	const {
		data: vacancies,
		isLoading,
		isFetched,
		isError,
		refetch,
	} = useQuery<HotVacancyItem[]>({
		queryKey: ["hot-team-vacancies"],
		queryFn: () =>
			axios.get<HotVacancyItem[]>("/api/vacancies/hot").then((r) => r.data),
		staleTime: 1000 * 60 * 3,
	});

	const title = t("hub.hot-vacancies.title", "Open positions");

	if (isError && !vacancies)
		return (
			<section
				className={`${styles.container} ${getHubSectionShellClass("sidebar")}`}
			>
				<HubSectionHeader title={title} />
				<HubSectionBody>
					<LoadError
						bare
						title={t(
							"hub.hot-vacancies.error",
							"Open positions could not be loaded",
						)}
						onRetry={() => refetch()}
					/>
				</HubSectionBody>
			</section>
		);
	if (!vacancies?.length && isFetched) return null;

	return (
		<Skeleton active loading={isLoading}>
			<section
				className={`${styles.container} ${getHubSectionShellClass("sidebar")}`}
			>
				<HubSectionHeader
					title={title}
					linkHref="/hub/jobs"
					linkLabel={t("hub.view-all", "View all")}
				/>

				<HubSectionBody flush>
					{vacancies?.slice(0, 5).map((v) => (
						<HubSectionRow
							key={v.id}
							href={`/job/${v.id}`}
							title={v.title}
							subtitle={v.project.name}
							media={
								<IconTile
									size="sm"
									direction={v.direction ?? undefined}
									icon={getWorkDirection(v.direction ?? "").icon}
								/>
							}
						/>
					))}
				</HubSectionBody>
			</section>
		</Skeleton>
	);
}
