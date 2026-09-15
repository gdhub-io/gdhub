"use client";

import { useTranslate } from "@tolgee/react";
import { ProjectArtifactType } from "@/config/prisma-enums";

/**
 * The artifact kind in words.
 *
 * A hook rather than a map so the Tolgee extractor sees literal keys, and shared
 * so the evidence row and the picker cannot drift into calling the same kind two
 * different things.
 */
export const useArtifactTypeLabel = () => {
	const { t } = useTranslate();

	return (type: ProjectArtifactType) => {
		switch (type) {
			case ProjectArtifactType.GameplayVideo:
				return t("artifacts.type.gameplayVideo", "Gameplay video");
			case ProjectArtifactType.PrototypeVideo:
				return t("artifacts.type.prototypeVideo", "Prototype video");
			case ProjectArtifactType.ExecutableBuild:
				return t("artifacts.type.build", "Build");
			case ProjectArtifactType.Art:
				return t("artifacts.type.art", "Art");
			case ProjectArtifactType.JDA:
				return t("artifacts.type.jda", "Agreement");
			case ProjectArtifactType.NDA:
				return t("artifacts.type.nda", "NDA");
			case ProjectArtifactType.Concept:
				return t("artifacts.type.concept", "Concept document");
			case ProjectArtifactType.GDD:
				return t("artifacts.type.gdd", "Game design document");
			default:
				return t("artifacts.type.other", "Other");
		}
	};
};
