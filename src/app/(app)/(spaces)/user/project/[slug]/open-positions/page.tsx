"use client";

import { useTranslate } from "@tolgee/react";
import MyProjectCandidates from "@/components/MyProjectCandidates";
import MyProjectVacancies from "@/components/MyProjectVacancies";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";

export default function MyProjectVacanciesPage() {
	const { t } = useTranslate();

	return (
		<ProjectSpace title={t("Project Vacancies")}>
			<MyProjectVacancies />
			<MyProjectCandidates />
		</ProjectSpace>
	);
}
