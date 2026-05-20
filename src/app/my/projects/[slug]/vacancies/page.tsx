"use client";

import { useTranslate } from "@tolgee/react";
import MyProjectCandidates from "@/components/MyProjectCandidates";
import MyProjectVacancies from "@/components/MyProjectVacancies";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";

export default function MyProjectVacanciesPage() {
	const { t } = useTranslate();

	return (
		<ProtectedProjectLayout title={t("Project Vacancies")}>
			<MyProjectVacancies />
			<MyProjectCandidates />
		</ProtectedProjectLayout>
	);
}
