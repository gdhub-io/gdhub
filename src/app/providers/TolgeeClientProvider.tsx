"use client";

import { TolgeeProvider } from "@tolgee/react";
import type { ReactNode } from "react";
import { tolgeeService } from "@/services/tolgee";

export function TolgeeClientProvider({ children }: { children: ReactNode }) {
	return (
		<TolgeeProvider tolgee={tolgeeService} fallback={null}>
			{children}
		</TolgeeProvider>
	);
}
