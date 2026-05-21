import "@/styles/globals.scss";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { setupDayjs } from "@/config/dayjs-setup";
import { Providers } from "./providers";

setupDayjs();

export const metadata: Metadata = {
	title: "Gamelab",
	icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
			<body suppressHydrationWarning>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
