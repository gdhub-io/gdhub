import { useTranslate } from "@tolgee/react";

/**
 * "Devlog #15" in the reader's language; plain "Devlog" for a system post,
 * which has no number. The share text and the OG card use the English
 * `devlogTitle` instead — they leave the site.
 */
export const useDevlogName = () => {
	const { t } = useTranslate();

	return (number?: number | null) =>
		number
			? t("devlog.numbered", "Devlog #{number}", { number })
			: t("devlog.unnumbered", "Devlog");
};
