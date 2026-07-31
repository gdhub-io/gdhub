"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { setupDayjs } from "@/config/dayjs-setup";
import { installAbortErrorSuppressor } from "@/services/matrix/suppress-abort-errors";
import { QueryProvider } from "./QueryProvider";
import { TolgeeClientProvider } from "./TolgeeClientProvider";

setupDayjs();
installAbortErrorSuppressor();

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
					<AntdRegistry layer>{children}</AntdRegistry>
				</QueryProvider>
			</SessionProvider>
		</TolgeeClientProvider>
	);
}
