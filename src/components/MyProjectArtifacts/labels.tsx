import {
	type Icon,
	IconBlocks,
	IconFileText,
	IconPackage,
	IconPhoto,
	IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import type { StatusTone } from "@/components/ui";
import {
	ArtifactCheckStatus,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import type { OpenFailure } from "@/services/artifact-check/safe-fetch";
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

/** Whether the curator can open the artifact, as a dot and a word. */
export const useCheckStatus = () => {
	const { t } = useTranslate();

	return (status: ArtifactCheckStatus): { tone: StatusTone; label: string } => {
		switch (status) {
			case ArtifactCheckStatus.Readable:
				return { tone: "success", label: t("artifacts.check.ready", "Ready") };
			case ArtifactCheckStatus.Unreachable:
				return {
					tone: "danger",
					label: t("artifacts.check.unreachable", "Cannot be opened"),
				};
			case ArtifactCheckStatus.Unsupported:
				return {
					tone: "warning",
					label: t("artifacts.check.unsupported", "Saved, not readable"),
				};
			default:
				return {
					tone: "neutral",
					label: t("artifacts.check.pending", "Checking…"),
				};
		}
	};
};

/** Why a link did not open (`checkNote`), said as what to do about it. */
export const useCheckReason = () => {
	const { t } = useTranslate();

	return (note: OpenFailure | string | null) => {
		switch (note) {
			case "needsLogin":
				return t(
					"artifacts.check.reason.needsLogin",
					"This link asks for a login. Make it public or use another link.",
				);
			case "notFound":
				return t(
					"artifacts.check.reason.notFound",
					"Nothing is at this link any more. Check it or use another link.",
				);
			case "timeout":
				return t(
					"artifacts.check.reason.timeout",
					"The link did not answer in time. Try again later or use another link.",
				);
			case "unsafe":
				return t(
					"artifacts.check.reason.unsafe",
					"This address cannot be opened from outside. Use a public link.",
				);
			case "tooManyRedirects":
				return t(
					"artifacts.check.reason.tooManyRedirects",
					"The link redirects too many times. Use the final address.",
				);
			default:
				return t(
					"artifacts.check.reason.unreachable",
					"The link could not be opened. Check it or use another link.",
				);
		}
	};
};

/** Which links of this kind the AI curator can read (GDHUB-110); any other is kept. */
export const useLinkHint = () => {
	const { t } = useTranslate();

	return (kind: ArtifactKind) => {
		switch (kind) {
			case "video":
				return t(
					"artifacts.modal.link.hint.video",
					"The AI curator watches a video file: a direct .mp4 link, or a Google Drive or Dropbox file open to anyone, up to 50 MB. From YouTube or Vimeo it sees only the title and the thumbnail.",
				);
			case "image":
				return t(
					"artifacts.modal.link.hint.image",
					"The AI curator looks at an image file: a direct .png or .jpg link, or a Google Drive, Dropbox or Imgur file open to anyone. A page around the image shows it only the title.",
				);
			case "document":
				return t(
					"artifacts.modal.link.hint.document",
					"The AI curator reads Google Docs, Sheets and Slides, a PDF, a Notion page or a GitHub file, open to anyone. Figma and Miro show it only the title.",
				);
			case "build":
				return t(
					"artifacts.modal.link.hint.buildFile",
					"A link to the build file itself — Google Drive, Dropbox or another cloud, open to anyone; store pages belong in the project's links. A curator downloads and plays it; the AI curator cannot run a build, so add a gameplay video for it.",
				);
			default:
				return t(
					"artifacts.modal.link.hint.other",
					"Any link open to anyone. The AI curator reads text, images and video files; other kinds are kept but not read.",
				);
		}
	};
};
