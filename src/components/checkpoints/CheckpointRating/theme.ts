import type { ThemeConfig } from "antd";
import { space } from "@/config/design";

/**
 * Rate's stars per spec §5: amber filled over the disabled grey. Variables, not
 * values, so the stars follow the role on whatever surface they sit on.
 */
export const rateTheme = ({
	empty = "var(--gd-neutral-300)",
	size = 20,
	sizeSm = 16,
}: {
	empty?: string;
	size?: number;
	sizeSm?: number;
} = {}): ThemeConfig => ({
	components: {
		Rate: {
			starColor: "var(--gd-warning-solid)",
			starBg: empty,
			starSize: size,
			starSizeSM: sizeSm,
			marginXS: space[1],
		},
	},
});
