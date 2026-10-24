import { useTranslate } from "@tolgee/react";
import { Tag } from "antd";
import { EvidenceMatch } from "@/config/prisma-enums";

const COLOR: Record<EvidenceMatch, string> = {
	[EvidenceMatch.Matches]: "success",
	[EvidenceMatch.Partly]: "warning",
	[EvidenceMatch.DoesNotMatch]: "error",
	[EvidenceMatch.CannotTell]: "default",
};

/** What the AI saw in a piece of evidence, against its task (GDHUB-110). */
export function EvidenceMatchTag({ match }: { match: EvidenceMatch }) {
	const { t } = useTranslate();
	const label: Record<EvidenceMatch, string> = {
		[EvidenceMatch.Matches]: t("checkpoints.evidence.match.matches", "Matches"),
		[EvidenceMatch.Partly]: t("checkpoints.evidence.match.partly", "Partly"),
		[EvidenceMatch.DoesNotMatch]: t(
			"checkpoints.evidence.match.doesNotMatch",
			"Does not match",
		),
		[EvidenceMatch.CannotTell]: t(
			"checkpoints.evidence.match.cannotTell",
			"Cannot tell",
		),
	};

	return <Tag color={COLOR[match]}>{label[match]}</Tag>;
}
