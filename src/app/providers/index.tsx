"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";

export function Providers({ children }: { children: ReactNode }) {
	return (
		<SessionProvider>
			<QueryProvider>
				<AntdRegistry>{children}</AntdRegistry>
			</QueryProvider>
		</SessionProvider>
	);
}
