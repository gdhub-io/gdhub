"use client";

import "@/config/dayjs-setup";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { TolgeeClientProvider } from "./TolgeeClientProvider";

export function Providers({ children }: { children: ReactNode }) {
	return (
		<TolgeeClientProvider>
			<SessionProvider>
				<QueryProvider>
					<AntdRegistry>{children}</AntdRegistry>
				</QueryProvider>
			</SessionProvider>
		</TolgeeClientProvider>
	);
}
