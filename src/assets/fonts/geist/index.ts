import localFont from "next/font/local";

export const geistFont = localFont({
	src: [
		{
			path: "./Geist-Black.ttf",
			weight: "900",
			style: "normal",
		},
		{
			path: "./Geist-Bold.ttf",
			weight: "700",
			style: "normal",
		},
		{
			path: "./Geist-ExtraBold.ttf",
			weight: "800",
			style: "normal",
		},
		{
			path: "./Geist-ExtraLight.ttf",
			weight: "200",
			style: "normal",
		},
		{
			path: "./Geist-Light.ttf",
			weight: "300",
			style: "normal",
		},

		{
			path: "./Geist-Medium.ttf",
			weight: "500",
			style: "normal",
		},

		{
			path: "./Geist-Regular.ttf",
			weight: "400",
			style: "normal",
		},

		{
			path: "./Geist-SemiBold.ttf",
			weight: "600",
			style: "normal",
		},

		{
			path: "./Geist-Thin.ttf",
			weight: "100",
			style: "normal",
		},
	],
	display: "swap",
	variable: "--gd-font-ui",
});
