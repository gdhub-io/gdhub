import { useTranslate } from "@tolgee/react";
import { Tag } from "antd";
import { StatusDot, type StatusTone } from "@/components/ui";
import { EvidenceMatch } from "@/config/prisma-enums";

const COLOR: Record<EvidenceMatch, string> = {
	[EvidenceMatch.Matches]: "success",
	[EvidenceMatch.Partly]: "warning",
	[EvidenceMatch.DoesNotMatch]: "error",
	[EvidenceMatch.CannotTell]: "default",
};

const TONE: Record<EvidenceMatch, StatusTone> = {
	[EvidenceMatch.Matches]: "success",
	[EvidenceMatch.Partly]: "warning",
	[EvidenceMatch.DoesNotMatch]: "danger",
	[EvidenceMatch.CannotTell]: "neutral",
};

const useMatchLabel = () => {
	const { t } = useTranslate();
	return (match: EvidenceMatch) =>
		({
			[EvidenceMatch.Matches]: t(
				"checkpoints.evidence.match.matches",
				"Matches",
			),
			[EvidenceMatch.Partly]: t("checkpoints.evidence.match.partly", "Partly"),
			[EvidenceMatch.DoesNotMatch]: t(
				"checkpoints.evidence.match.doesNotMatch",
				"Does not match",
			),
			[EvidenceMatch.CannotTell]: t(
				"checkpoints.evidence.match.cannotTell",
				"Cannot tell",
			),
		})[match];
};

/** What the AI saw in a piece of evidence, against its task (GDHUB-110). */
export function EvidenceMatchTag({ match }: { match: EvidenceMatch }) {
	const label = useMatchLabel();
	return <Tag color={COLOR[match]}>{label(match)}</Tag>;
}

/** The same read as a dot and a word, where it repeats down a list. */
export function EvidenceMatchDot({ match }: { match: EvidenceMatch }) {
	const label = useMatchLabel();
	return <StatusDot tone={TONE[match]} label={label(match)} />;
}
