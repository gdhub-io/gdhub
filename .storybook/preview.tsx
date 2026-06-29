import type { Preview } from "@storybook/nextjs";
import { ConfigProvider } from "antd";
import type { ReactElement } from "react";
import { geistFont } from "../src/assets/fonts/geist";
import { appThemeConfig } from "../src/config/theme";
// App global styles (reset, CSS layers, variables) so components match the app.
import "../src/styles/globals.scss";

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
				<ConfigProvider theme={appThemeConfig}>
					<Story />
				</ConfigProvider>
			</div>
		),
	],
};

export default preview;
