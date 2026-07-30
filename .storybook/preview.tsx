import type { Preview } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormatIcu } from "@tolgee/format-icu";
import { Tolgee, TolgeeProvider } from "@tolgee/react";
import { ConfigProvider } from "antd";
import { SessionProvider } from "next-auth/react";
import type { ReactElement } from "react";
import { geistFont } from "../src/assets/fonts/geist";
import { appThemeConfig } from "../src/config/theme";
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
		(Story: () => ReactElement) => (
			<div
				className={geistFont.className}
				style={{
					fontFamily: geistFont.style.fontFamily,
					background: "#fff",
					minHeight: "100vh",
				}}
			>
				{/* `session={null}` keeps SessionProvider from calling /api/auth/session. */}
				<SessionProvider session={null}>
					<QueryClientProvider client={queryClient}>
						<TolgeeProvider tolgee={tolgee} fallback={null}>
							<ConfigProvider theme={appThemeConfig}>
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
