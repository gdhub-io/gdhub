"use client";

import { IconVideo } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { EmptyState } from "@/components/ui";

export default function ProjectRoomPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace
			title={t("project.room.title", "Room")}
			description={t(
				"project.room.subtitle",
				"Video calls with the project's curator",
			)}
		>
			<EmptyState
				icon={IconVideo}
				title={t("project.room.planned.title", "The room is on its way")}
				description={t(
					"project.room.planned.description",
					"Video calls with your curator are planned and will open here.",
				)}
			/>
		</ProjectSpace>
	);
}
