import { type ThemeConfig, theme } from "antd";
import { type DesignDensity, type DesignMode, densities, roles } from "./roles";
import {
	brand,
	elevation,
	focusRingWidth,
	fontFamily,
	fontSize,
	fontWeight,
	lineHeight,
	neutral,
	radius,
	semantic,
	space,
} from "./tokens";

export type BuildThemeOptions = {
	mode?: DesignMode;
	density?: DesignDensity;
	/**
	 * Namespaces the emitted `--ant-*` variables. Two themes rendered on the same
	 * page need different keys or the second one overwrites the first on `:root`;
	 * omit it to keep styles hashed instead.
	 */
	cssVarKey?: string;
};

const ring = (color: string) => `0 0 0 ${focusRingWidth}px ${color}`;

/**
 * Builds an antd theme from the design tokens.
 *
 * `colorPrimary` is the action colour, not the brand: inside the product the
 * committing button is graphite, and the brand appears through the orientation
 * tokens below (ink bar, selected row, focus ring, links).
 */
export function buildAntdTheme({
	mode = "light",
	density = "product",
	cssVarKey,
}: BuildThemeOptions = {}): ThemeConfig {
	const r = roles[mode];
	const d = densities[density];
	const isInverse = mode === "inverse";

	return {
		algorithm: isInverse ? theme.darkAlgorithm : theme.defaultAlgorithm,
		...(cssVarKey ? { cssVar: { key: cssVarKey } } : {}),
		token: {
			fontFamily: fontFamily.ui,
			fontSize: d.fontSize,
			fontSizeHeading1: fontSize.h1,
			fontSizeHeading2: fontSize.h2,
			fontSizeHeading3: fontSize.h3,
			fontSizeHeading4: fontSize.h4,
			fontSizeHeading5: fontSize.body,
			fontWeightStrong: fontWeight.semibold,
			lineHeight: lineHeight.body,
			lineHeightHeading1: lineHeight.heading,
			lineHeightHeading2: lineHeight.heading,
			lineHeightHeading3: lineHeight.heading,

			colorPrimary: r.action,
			colorLink: r.link,
			colorInfo: semantic.info.solid,
			colorSuccess: semantic.success.solid,
			colorWarning: semantic.warning.solid,
			colorError: semantic.danger.solid,

			colorTextBase: r.text,
			colorBgBase: r.bg,
			colorBgContainer: r.surface,
			colorBgElevated: r.surface,
			colorBgLayout: r.bg,
			colorBgSpotlight: r.surfaceInverse,
			colorBgMask: "rgba(15, 15, 14, 0.4)",

			// The single biggest visual fix: default borders used to be near-black,
			// which made every finished screen read as a wireframe.
			colorBorder: r.border,
			colorBorderSecondary: r.border,

			borderRadius: radius.control,
			borderRadiusLG: radius.card,
			borderRadiusSM: radius.chip,
			borderRadiusXS: 4,

			controlHeight: d.controlHeight,
			controlHeightSM: d.controlHeightSm,
			controlHeightLG: d.controlHeightLg,

			sizeUnit: 4,
			sizeStep: 4,
			wireframe: false,
			boxShadow: elevation.e1,
			boxShadowSecondary: elevation.e2,
			boxShadowTertiary: elevation.e1,
		},
		components: {
			Button: {
				fontWeight: fontWeight.medium,
				contentFontSize: d.fontSize,
				contentFontSizeSM: fontSize.caption,
				contentFontSizeLG: d.fontSize + 2,
				paddingInline: space[4],
				paddingInlineSM: space[3],
				paddingInlineLG: space[6],
				defaultShadow: "none",
				primaryShadow: "none",
				dangerShadow: "none",
				defaultBg: "transparent",
				defaultColor: r.text,
				defaultBorderColor: r.borderStrong,
				defaultHoverBg: r.surfaceSunken,
				defaultHoverColor: r.text,
				defaultHoverBorderColor: r.borderStrong,
				defaultActiveBg: r.surfaceSunken,
				defaultActiveColor: r.text,
				defaultActiveBorderColor: r.borderFocus,
				borderColorDisabled: r.border,
				textHoverBg: r.surfaceSunken,
				primaryColor: r.onAction,
			},
			Input: {
				paddingInline: space[3],
				paddingBlock: space[2],
				inputFontSize: d.fontSize,
				hoverBorderColor: r.borderStrong,
				activeBorderColor: r.accent,
				activeShadow: ring("rgba(241, 85, 65, 0.2)"),
				errorActiveShadow: ring("rgba(180, 35, 24, 0.2)"),
				warningActiveShadow: ring("rgba(180, 105, 14, 0.2)"),
			},
			InputNumber: {
				paddingInline: space[3],
				hoverBorderColor: r.borderStrong,
				activeBorderColor: r.accent,
			},
			Select: {
				optionHeight: 32,
				optionPadding: "6px 12px",
				optionFontSize: d.fontSize,
				optionSelectedBg: r.accentSubtle,
				optionSelectedColor: r.text,
				optionActiveBg: r.surfaceSunken,
				multipleItemHeight: 26,
				hoverBorderColor: r.borderStrong,
				activeBorderColor: r.accent,
			},
			DatePicker: {
				hoverBorderColor: r.borderStrong,
				activeBorderColor: r.accent,
				activeShadow: ring("rgba(241, 85, 65, 0.2)"),
			},
			Menu: {
				itemBg: "transparent",
				subMenuItemBg: "transparent",
				itemBorderRadius: radius.control,
				itemHeight: 40,
				itemMarginInline: space[2],
				itemPaddingInline: space[3],
				itemColor: r.textSecondary,
				itemHoverColor: r.text,
				itemHoverBg: r.surfaceSunken,
				// Navigation is not a brand surface. Colouring the current tab
				// orange reads as an alert on a bar the user looks at all day, so
				// "you are here" is carried by a neutral fill and extra weight.
				itemSelectedColor: r.text,
				itemSelectedBg: r.surfaceSunken,
				horizontalItemSelectedColor: r.text,
				horizontalItemSelectedBg: r.surfaceSunken,
				activeBarHeight: 0,
			},
			Tabs: {
				inkBarColor: r.accent,
				itemColor: r.textSecondary,
				itemHoverColor: r.text,
				itemSelectedColor: r.text,
				titleFontSize: d.fontSize,
			},
			Table: {
				headerBg: "transparent",
				headerColor: r.textSecondary,
				headerSplitColor: "transparent",
				headerBorderRadius: radius.card,
				borderColor: r.border,
				rowHoverBg: r.surfaceSunken,
				rowSelectedBg: r.accentSubtle,
				rowSelectedHoverBg: r.accentSubtle,
				cellPaddingBlock: d.cellPaddingBlock,
				cellPaddingInline: d.cellPaddingInline,
				cellFontSize: d.fontSize,
				footerBg: "transparent",
			},
			Card: {
				bodyPadding: d.cardPadding,
				headerBg: "transparent",
				headerFontSize: fontSize.h4,
				extraColor: r.link,
			},
			Modal: {
				titleFontSize: fontSize.h3,
				titleLineHeight: lineHeight.heading,
				contentBg: r.surface,
				headerBg: r.surface,
				footerBg: "transparent",
				padding: space[6],
				paddingLG: space[6],
				borderRadiusLG: radius.panel,
			},
			Tag: {
				defaultBg: r.surfaceSunken,
				defaultColor: r.text,
				fontSize: fontSize.label,
				lineWidth: 0,
				borderRadiusSM: radius.chip,
			},
			Tooltip: {
				colorBgSpotlight: r.surfaceInverse,
				colorTextLightSolid: r.textInverse,
				borderRadius: radius.control,
			},
			Segmented: {
				trackBg: r.surfaceSunken,
				itemSelectedBg: r.surface,
				itemSelectedColor: r.text,
				itemColor: r.textSecondary,
			},
			Checkbox: {
				controlInteractiveSize: 18,
			},
			Radio: {
				radioSize: 18,
				dotSize: 8,
			},
			Progress: {
				defaultColor: r.accent,
				remainingColor: r.surfaceSunken,
			},
			Layout: {
				bodyBg: "transparent",
				headerBg: "transparent",
				siderBg: r.surface,
			},
			Typography: {
				titleMarginTop: 0,
			},
			Avatar: {
				groupOverlapping: -8,
			},
			Divider: {
				colorSplit: r.border,
			},
		},
	};
}

/** Product surfaces: hub, my, admin, auth. */
export const productTheme = buildAntdTheme({
	mode: "light",
	density: "product",
});

/** Public marketing pages rendered on a light background. */
export const publicTheme = buildAntdTheme({
	mode: "light",
	density: "marketing",
	cssVarKey: "gd-public",
});

/** Landing and the dark header/footer bands. */
export const inverseTheme = buildAntdTheme({
	mode: "inverse",
	density: "marketing",
	cssVarKey: "gd-inverse",
});

export const paletteReference = { brand, neutral, semantic };
