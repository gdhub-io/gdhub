"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { setupDayjs } from "@/config/dayjs-setup";
import { productTheme } from "@/config/design";
import { installAbortErrorSuppressor } from "@/services/matrix/suppress-abort-errors";
import { QueryProvider } from "./QueryProvider";
import { TolgeeClientProvider } from "./TolgeeClientProvider";

setupDayjs();
installAbortErrorSuppressor();

/**
 * Static `message` / `Modal.confirm` / `notification` mount their own React root,
 * outside `AntdRegistry` — so their styles were injected *without* the CSS layer
 * the registry applies. Unlayered rules beat every `@layer`, so the first toast
 * on a page silently promoted antd's `a { color: … }` reset above the menu's own
 * `a { color: inherit }`, and the header turned red.
 *
 * `holderRender` is antd's hook for exactly this: it wraps the detached root, so
 * those styles land in the same layer as the rest.
 */
ConfigProvider.config({
	// A `<ConfigProvider theme>` in the tree cannot reach a root the static
	// methods mount themselves, so every `Modal.confirm` left in the codebase came
	// up in antd's stock blue on a graphite product. This is the one place that
	// theme can be handed to them. Prefer `App.useApp()` in new code — it also
	// inherits the shell's own mode and density — but a leftover static call now
	// at least looks like the app.
	theme: productTheme,
	holderRender: (children) => <StyleProvider layer>{children}</StyleProvider>,
});

export function Providers({ children }: { children: ReactNode }) {
	return (
		<TolgeeClientProvider>
			<SessionProvider>
				<QueryProvider>
					{/*
					 * `layer` puts every antd style into a CSS @layer, which always
					 * loses to unlayered rules. Without it antd's styles land in
					 * <head> after the app's CSS modules and win every tie on equal
					 * specificity — that is what collapsed the page headers and
					 * overrode titles, tabs and buttons.
					 */}
					<AntdRegistry layer>
						{/*
						 * The baseline theme for everything that renders outside a
						 * shell — the cookie banner, error screens, static `message`
						 * and `Modal.confirm` popups. Without it antd falls back to
						 * its own defaults and those surfaces show up in antd blue
						 * on a graphite product. Shells still override with their
						 * own mode and density.
						 */}
						<ConfigProvider theme={productTheme}>
							{/*
							 * `App` is what makes `App.useApp()` return working `message`,
							 * `modal` and `notification` — without it they are silent stubs,
							 * and it is also the only way those surfaces inherit the theme
							 * and the CSS layer instead of antd's raw defaults.
							 */}
							<App>{children}</App>
						</ConfigProvider>
					</AntdRegistry>
				</QueryProvider>
			</SessionProvider>
		</TolgeeClientProvider>
	);
}
