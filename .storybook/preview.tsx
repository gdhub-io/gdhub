import type { Preview } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormatIcu } from "@tolgee/format-icu";
import { Tolgee, TolgeeProvider } from "@tolgee/react";
import { ConfigProvider } from "antd";
import { SessionProvider } from "next-auth/react";
import type { CSSProperties, ReactElement } from "react";
import { productTheme } from "../src/config/design/antd";
import { designCssVariables } from "../src/config/design/css";
import { fontClassName, uiFont } from "../src/config/design/fonts";
// App global styles (reset, CSS layers, variables) so components match the app.
import "../src/styles/globals.scss";
// Override the app's dark html/body background with a light canvas for stories.
import "./preview.css";

// Minimal Tolgee instance so `useTranslate`/`useTolgee` resolve to the inline
// defaults (`t(key, "Default {value}")`) without hitting the Tolgee server.
const tolgee = Tolgee()
	.use(FormatIcu())
	.init({
		defaultLanguage: "en",
		availableLanguages: ["en"],
		staticData: { en: {} },
	});

// Never retry and never refetch: components fetching over axios stay in their
// empty state, and stories that seed the cache keep the data they seeded.
const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
	},
});

// The root layout puts the `--gd-*` tokens, both font variables and the theme
// flag on <body>. They go on <body> here too rather than on the decorator,
// because antd portals its overlays (dropdown, select, modal, tooltip) to the
// end of <body> — outside any decorator, where the tokens would not reach and
// the overlay would fall back to an unstyled font on a colourless surface.
if (typeof document !== "undefined") {
	for (const [name, value] of Object.entries(designCssVariables())) {
		document.body.style.setProperty(name, value);
	}
	document.body.classList.add(...fontClassName.split(" ").filter(Boolean));
	document.body.dataset.gdTheme = "product";
}

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		layout: "padded",
		backgrounds: { disable: true },
		// Most stories render App Router components (next/navigation hooks).
		nextjs: { appDirectory: true },
	},
	decorators: [
		// The root layout puts the `--gd-*` tokens and both font variables on
		// <body>; without them here every SCSS module reading `var(--gd-…)`
		// resolves to nothing — direction tints, status dots and surfaces all
		// silently disappear in the canvas.
		(Story: () => ReactElement) => (
			<div
				className={fontClassName}
				data-gd-theme="product"
				style={{
					...(designCssVariables() as CSSProperties),
					fontFamily: uiFont.style.fontFamily,
					background: "#fff",
					minHeight: "100vh",
				}}
			>
				{/* `session={null}` keeps SessionProvider from calling /api/auth/session. */}
				<SessionProvider session={null}>
					<QueryClientProvider client={queryClient}>
						<TolgeeProvider tolgee={tolgee} fallback={null}>
							{/* The canvas is the design system's reference, so it runs the
							    token theme rather than the legacy one the public shells
							    still use. */}
							<ConfigProvider theme={productTheme}>
								<Story />
							</ConfigProvider>
						</TolgeeProvider>
					</QueryClientProvider>
				</SessionProvider>
			</div>
		),
	],
};

export default preview;
