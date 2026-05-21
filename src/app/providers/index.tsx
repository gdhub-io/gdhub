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
					<AntdRegistry>{children}</AntdRegistry>
				</QueryProvider>
			</SessionProvider>
		</TolgeeClientProvider>
	);
}
