"use client";

import { useTranslate } from "@tolgee/react";
import MyProjectDocuments from "@/components/MyProjectDocuments";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";

export default function MyProjectDocumentsPage() {
	const { t } = useTranslate();

	return (
		<ProtectedProjectLayout
			title={t("project.documents.title", "Documents")}
			description={t(
				"project.documents.description",
				"Links to project-specific documents accessible to you and your team",
			)}
		>
			<MyProjectDocuments />
		</ProtectedProjectLayout>
	);
}
