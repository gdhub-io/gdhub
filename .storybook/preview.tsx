import type { Preview } from "@storybook/nextjs";
import { ConfigProvider } from "antd";
import { mainLandingFont, publicThemeConfig } from "@/config/theme";
import "../src/styles/globals.scss";
import "./preview.css";

const preview: Preview = {
	parameters: {
		layout: "padded",
		backgrounds: { disable: true },
	},
	decorators: [
		(Story) => (
			<div className={mainLandingFont.className}>
				<ConfigProvider theme={publicThemeConfig}>
					<Story />
				</ConfigProvider>
			</div>
		),
	],
};

export default preview;
