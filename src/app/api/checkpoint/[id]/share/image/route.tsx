/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { brand, semantic } from "@/config/design/tokens";
import type { CheckpointVerdict } from "@/config/prisma-enums";
import { optimizedImage } from "@/helpers/image";
import { dataUrl, ogAsset } from "@/helpers/og-asset";
import { ogPalette } from "@/helpers/og-palette";
import { apiError, type SessionUser, withAuth } from "@/lib/api-handlers";
import { roadLine, SHARE_VERDICT_LABEL } from "@/lib/checkpoints/share-card";
import { VERDICT_TONE } from "@/lib/checkpoints/verdict-tone";
import { shareCardOf } from "@/services/checkpoints/flows/share";

/**
 * The verdict share card as a 1200×630 PNG the author downloads and attaches to
 * their post (GDHUB-144, Pen 12.20 `n3Pen`): the curator's line like a chat
 * message — who, what, when — then the checkpoint, the project and the logo.
 * The project's cover fades in on the right; without one, the red glow.
 */

const SIZE = { width: 1200, height: 630 };
const COVER = { width: 680, height: 630 };

const dotOf = (verdict: CheckpointVerdict) =>
	semantic[VERDICT_TONE[verdict]].solid;

// Read once a process: the logo and the fonts never change between requests.
const STATIC = Promise.all([
	ogAsset("src/assets/images/gdhub-beta-logo.svg"),
	ogAsset("public/fonts/Onest-Regular.woff"),
	ogAsset("public/fonts/Onest-Medium.woff"),
	ogAsset("public/fonts/Onest-Bold.woff"),
]);

// The image renderer reads no WebP, and the curators' avatars are WebP; there are a score of them.
const AVATARS = new Map<string, Promise<string>>();
const avatarPng = (path: string) => {
	let png = AVATARS.get(path);
	if (!png) {
		png = ogAsset(`public${path}`)
			.then((webp) => sharp(webp).resize(128, 128).png().toBuffer())
			.then((bytes) => dataUrl(bytes, "image/png"));
		AVATARS.set(path, png);
	}
	return png;
};

const dayOf = (iso: string | null) =>
	(iso ? new Date(iso) : new Date()).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const card = await shareCardOf(id, caller.id);
	if (!card) return apiError.notFound();

	const [avatar, [logo, regular, medium, bold]] = await Promise.all([
		avatarPng(card.curator.avatar),
		STATIC,
	]);
	const cover = optimizedImage(card.project.cover, {
		...COVER,
		fit: "crop",
		quality: 75,
		format: "jpg",
	});

	return new ImageResponse(
		<div
			style={{
				display: "flex",
				position: "relative",
				width: "100%",
				height: "100%",
				flexDirection: "column",
				padding: "72px 72px 56px",
				background: ogPalette.backdrop,
				color: ogPalette.ink,
				fontFamily: "Onest",
			}}
		>
			{cover ? (
				<div
					style={{
						display: "flex",
						position: "absolute",
						right: 0,
						top: 0,
						...COVER,
					}}
				>
					<img alt="" src={cover} {...COVER} style={{ objectFit: "cover" }} />
					<div
						style={{
							display: "flex",
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							background: `linear-gradient(to right, ${ogPalette.backdrop} 0%, ${ogPalette.backdrop}E6 20%, ${ogPalette.backdrop}80 50%, ${ogPalette.backdrop}00 100%)`,
						}}
					/>
					<div
						style={{
							display: "flex",
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							background: `linear-gradient(to bottom, ${ogPalette.backdrop}00 50%, ${ogPalette.backdrop}B3 82%, ${ogPalette.backdrop}F2 100%)`,
						}}
					/>
				</div>
			) : (
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						background: `radial-gradient(circle at 88% 0%, ${brand[500]}40 0%, ${brand[500]}00 55%)`,
					}}
				/>
			)}

			<div
				style={{
					display: "flex",
					flex: 1,
					flexDirection: "column",
					justifyContent: "center",
					gap: 28,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
					<img
						alt=""
						src={avatar}
						width={64}
						height={64}
						style={{ borderRadius: 999, border: `2px solid ${brand[500]}66` }}
					/>
					<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
						<div style={{ fontSize: 24, fontWeight: 700 }}>
							{card.curator.name ?? "AI curator"}
						</div>
						<div style={{ fontSize: 18, color: ogPalette.inkMuted }}>
							{card.curator.name ? "AI curator" : "GDHub"}
						</div>
					</div>
				</div>
				<div
					style={{
						display: "flex",
						maxWidth: cover ? 700 : 1056,
						fontSize: cover ? 40 : 46,
						fontWeight: 500,
						lineHeight: 1.22,
					}}
				>
					{card.line}
				</div>
				<div style={{ fontSize: 18, color: ogPalette.inkMuted }}>
					{dayOf(card.decidedAt)}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-end",
					paddingTop: 24,
					borderTop: `1px solid ${ogPalette.ink}1F`,
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<div
							style={{
								width: 10,
								height: 10,
								borderRadius: 999,
								background: dotOf(card.verdict),
							}}
						/>
						<div style={{ fontSize: 18, color: ogPalette.inkSoft }}>
							{`${roadLine(card.number, card.verdict)} · ${SHARE_VERDICT_LABEL[card.verdict]}`}
						</div>
					</div>
					<div style={{ fontSize: 22, fontWeight: 700 }}>
						{card.project.name}
					</div>
				</div>
				<img
					alt=""
					src={dataUrl(logo, "image/svg+xml")}
					width={115}
					height={31}
				/>
			</div>
		</div>,
		{
			...SIZE,
			fonts: [
				{ name: "Onest", data: regular, weight: 400 },
				{ name: "Onest", data: medium, weight: 500 },
				{ name: "Onest", data: bold, weight: 700 },
			],
			// The address carries the card's version, so a cached drawing is never stale.
			headers: { "Cache-Control": "private, max-age=86400" },
		},
	);
});
