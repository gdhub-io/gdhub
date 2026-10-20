/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_DAYS,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { ogPalette } from "@/helpers/og-palette";

/**
 * The card a shared /checkpoint link unfurls into — frame `S4VcOt` in Pencil.
 *
 * Drawn here rather than exported as a picture so the price comes from config:
 * built once at build time, it follows the next price change on its own.
 */

export const alt =
	"Checkpoint — step by step to your game's release, a 28-day program for game developers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = (path: string) => readFile(join(process.cwd(), path));

const POINTS = [
	"Set your game a goal for four weeks",
	"Work towards it with a curator beside you",
	"Get the result, go to the next checkpoint",
];

export default async function Image() {
	const [art, logo, medium, semiBold, bold] = await Promise.all([
		asset("src/assets/images/checkpoint/checkpoint-hero-bridge.jpg"),
		asset("src/assets/images/gdhub-beta-logo.svg"),
		asset("public/fonts/Onest-Medium.woff"),
		asset("public/fonts/Onest-SemiBold.woff"),
		asset("public/fonts/Onest-Bold.woff"),
	]);
	const dataUrl = (bytes: Buffer, type: string) =>
		`data:${type};base64,${bytes.toString("base64")}`;

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				background: ogPalette.backdrop,
				fontFamily: "Onest",
				color: ogPalette.ink,
			}}
		>
			<img
				alt=""
				src={dataUrl(art, "image/jpeg")}
				width={1000}
				height={670}
				style={{
					position: "absolute",
					left: 200,
					top: -20,
					width: 1000,
					height: 670,
					objectFit: "cover",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					width: 1200,
					height: 630,
					display: "flex",
					background: `linear-gradient(90deg, ${ogPalette.backdrop} 0%, ${ogPalette.backdrop}E6 38%, ${ogPalette.backdrop}00 62%)`,
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 0,
					height: 200,
					display: "flex",
					background: `linear-gradient(180deg, ${ogPalette.backdrop}00 0%, ${ogPalette.backdrop}CC 100%)`,
				}}
			/>

			<div
				style={{
					position: "absolute",
					left: 72,
					top: 64,
					width: 780,
					display: "flex",
					flexDirection: "column",
					gap: 20,
				}}
			>
				<div
					style={{
						fontSize: 16,
						fontWeight: 600,
						letterSpacing: 1.4,
						color: ogPalette.brandSoft,
					}}
				>
					{`CHECKPOINT · A ${CHECKPOINT_DAYS}-DAY PROGRAM FOR GAME DEVELOPERS`}
				</div>
				<div
					style={{
						fontSize: 72,
						fontWeight: 700,
						letterSpacing: -2,
						lineHeight: 1.02,
					}}
				>
					Step by step to your game's release
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 10,
						paddingTop: 8,
					}}
				>
					{POINTS.map((point) => (
						<div
							key={point}
							style={{ display: "flex", alignItems: "center", gap: 12 }}
						>
							<div
								style={{
									width: 8,
									height: 8,
									borderRadius: 4,
									background: ogPalette.brand,
								}}
							/>
							<div
								style={{
									fontSize: 24,
									fontWeight: 500,
									color: ogPalette.inkSoft,
								}}
							>
								{point}
							</div>
						</div>
					))}
				</div>
			</div>

			<div
				style={{
					position: "absolute",
					left: 72,
					right: 72,
					top: 530,
					height: 44,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
					<img
						alt="GDHub"
						src={dataUrl(logo, "image/svg+xml")}
						width={115}
						height={31}
					/>
					<div
						style={{
							fontSize: 20,
							fontWeight: 500,
							color: ogPalette.inkMuted,
						}}
					>
						gdhub.io/checkpoint
					</div>
				</div>
				<div
					style={{
						display: "flex",
						padding: "10px 20px",
						borderRadius: 10,
						background: ogPalette.brand,
						fontSize: 20,
						fontWeight: 600,
					}}
				>
					{`From ${CHECKPOINT_PRICE_CURRENCY}${CHECKPOINT_AI_PRICE} · AI or industry curator`}
				</div>
			</div>
		</div>,
		{
			...size,
			fonts: [
				{ name: "Onest", data: medium, weight: 500, style: "normal" },
				{ name: "Onest", data: semiBold, weight: 600, style: "normal" },
				{ name: "Onest", data: bold, weight: 700, style: "normal" },
			],
		},
	);
}
