import {
	type Icon,
	IconBlocks,
	IconFileText,
	IconPackage,
	IconPhoto,
	IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { ProjectArtifactType } from "@/config/prisma-enums";
import type { ArtifactKind } from "./artifacts";

export const KIND_ICON: Record<ArtifactKind, Icon> = {
	video: IconPlayerPlay,
	document: IconFileText,
	image: IconPhoto,
	build: IconPackage,
	other: IconBlocks,
};

// Hooks rather than maps so the Tolgee extractor sees literal keys.
export const useArtifactKindLabel = () => {
	const { t } = useTranslate();

	return (kind: ArtifactKind) => {
		switch (kind) {
			case "video":
				return t("artifacts.kind.video", "Video");
			case "image":
				return t("artifacts.kind.image", "Image");
			case "build":
				return t("artifacts.kind.build", "Build");
			case "other":
				return t("artifacts.kind.other", "Other");
			default:
				return t("artifacts.kind.document", "Document");
		}
	};
};

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
