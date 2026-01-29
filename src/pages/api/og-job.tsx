/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

export const config = {
	runtime: "edge",
};

export default async function handler(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// ?img=<imageId>
		// https://cdn.sanity.io/images/3ao2jrg0/prod/6819158b4ecfd87ff4aac88b84dbb433d863d76d-616x353.jpg

		const terms = searchParams.get("vTerms");
		const vDate = searchParams.get("vDate");
		const project = searchParams.get("p");
		const projectCover = searchParams.get("img");

		let title = searchParams.get("t");
		title = title
			? decodeURIComponent(title).length > 45
				? decodeURIComponent(title).slice(0, 45) + "..."
				: decodeURIComponent(title)
			: "Title";

		const subTitle = searchParams.get("st") || `The open position`;

		const fontData = await fetch(
			new URL("../../assets/fonts/geist/Geist-Regular.ttf", import.meta.url),
		).then((res) => res.arrayBuffer());

		return new ImageResponse(
			<div
				style={{
					display: "flex",
					color: "black",
					background: "#000",
					width: "100%",
					height: "100%",
					// paddingTop: 50,
					flexDirection: "column",
					justifyContent: "center",
					// alignItems: 'center',
					position: "relative",
					fontFamily: '"Mulish"',
				}}
			>
				{projectCover ? (
					<img
						aria-label="OG Image"
						width="1200"
						height="630"
						src={projectCover}
						style={{ position: "absolute" }}
					/>
				) : (
					<div
						style={{
							position: "absolute",
							width: "1200px",
							height: "630px",
							background: "#f00",
						}}
					/>
				)}

				<div
					style={{
						width: "100%",
						height: "100%",
						display: "flex",
						background:
							"linear-gradient(to right, rgb(0, 0, 0) 0%, rgba(0, 0, 0, 0.85) 40%, rgba(117, 19, 93, 0.2))",
						position: "absolute",
					}}
				></div>

				<div
					style={{
						display: "flex",
						position: "absolute",
						width: "100%",
						height: "100%",
						justifyContent: "flex-start",
						alignItems: "flex-start",
						padding: 64,
					}}
				>
					<svg
						role="img"
						aria-label="OG Image"
						viewBox="0 0 156 43"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M94.0485 22.4415C94.0485 26.8196 90.4993 30.3687 86.1212 30.3687C81.7431 30.3687 78.1939 26.8196 78.1939 22.4415C78.1939 18.0634 81.7431 14.5142 86.1212 14.5142C90.4993 14.5142 94.0485 18.0634 94.0485 22.4415Z"
							stroke="#FFFDFC"
							stroke-width="4.11044"
						/>
						<path
							d="M153.944 22.4415C153.944 26.8196 150.395 30.3687 146.017 30.3687C141.639 30.3687 138.089 26.8196 138.089 22.4415C138.089 18.0634 141.639 14.5142 146.017 14.5142C150.395 14.5142 153.944 18.0634 153.944 22.4415Z"
							stroke="#FFFDFC"
							stroke-width="4.11044"
						/>
						<path
							d="M72.9098 22.4415C72.9098 26.8196 69.3607 30.3687 64.9825 30.3687C60.6044 30.3687 57.0552 26.8196 57.0552 22.4415C57.0552 18.0634 60.6044 14.5142 64.9825 14.5142C69.3607 14.5142 72.9098 18.0634 72.9098 22.4415Z"
							stroke="#FFFDFC"
							stroke-width="4.11044"
						/>
						<rect
							x="91.9932"
							y="5.99976"
							width="4.11045"
							height="16.4418"
							fill="#FFFDFC"
						/>
						<rect
							x="136.034"
							y="5.99976"
							width="4.11045"
							height="16.4418"
							fill="#FFFDFC"
						/>
						<rect
							x="110.783"
							y="22.4417"
							width="4.11045"
							height="9.98249"
							fill="#FFFDFC"
						/>
						<rect
							x="98.4521"
							y="6"
							width="4.11045"
							height="26.4242"
							fill="#FFFDFC"
						/>
						<rect
							x="117.243"
							y="12.459"
							width="4.11045"
							height="9.98249"
							fill="#FFFDFC"
						/>
						<rect
							x="129.574"
							y="12.459"
							width="4.11045"
							height="9.98249"
							fill="#FFFDFC"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M117.245 22.4417C117.245 27.9548 119.953 32.424 125.466 32.424C130.979 32.424 133.687 27.9548 133.687 22.4417H129.576C129.576 25.6846 128.709 28.3135 125.466 28.3135C122.223 28.3135 121.356 25.6846 121.356 22.4417H117.245Z"
							fill="#FFFDFC"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M114.897 22.4417C114.897 16.9285 112.19 12.4592 106.677 12.4592C101.163 12.4592 98.4557 16.9285 98.4557 22.4417L102.566 22.4417C102.566 19.1986 103.434 16.5696 106.677 16.5696C109.92 16.5696 110.787 19.1986 110.787 22.4417L114.897 22.4417Z"
							fill="#FFFDFC"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M57.4941 39.025C59.3233 41.0984 62.0002 42.4062 64.9825 42.4062C70.4956 42.4062 74.9648 37.9371 74.965 32.4241H70.8546C70.8544 35.667 68.2255 38.2958 64.9825 38.2958C63.135 38.2958 61.4868 37.4426 60.4104 36.1087L57.4941 39.025Z"
							fill="#FFFDFC"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M28.1411 0L53.061 42.3448L3.74219 42.4788L28.1411 0Z"
							fill="#F15541"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M11.2246 17.8762L18.0762 21.2748L20.6179 28.4112L7.19102 38.954L2.63644 39.2378L0 24.9652L3.74154 23.0491L3.55209 18.8856L11.2246 17.8762Z"
							fill="#F15541"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M3.59946 18.8855L0 24.9652L3.79679 23.0332L3.59946 18.8855Z"
							fill="#5F0B00"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M18.0774 21.283L12.994 23.8615L13.9096 29.5153L6.90808 34.0652L5.87402 39.0331L7.19224 38.9542L20.6113 28.4114L18.0774 21.283Z"
							fill="#5F0B00"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M28.1409 0C28.133 14.136 28.1251 28.2719 28.1172 42.4078C36.4315 42.3895 44.746 42.3711 53.0608 42.3526C44.7544 28.2351 36.4478 14.1176 28.1409 0Z"
							fill="#8C1000"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M29.9238 21.5035C29.9238 21.5035 33.1215 18.9766 36.4834 18.7515C36.4834 18.7515 37.418 21.7236 34.5337 23.4512C34.5337 23.4512 31.3328 24.35 29.9238 21.5035Z"
							fill="#FFFDFC"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M26.5381 21.5035C26.5381 21.5035 23.3404 18.9766 19.9785 18.7515C19.9785 18.7515 19.0438 21.7236 21.9282 23.4512C21.9282 23.4512 25.1291 24.35 26.5381 21.5035Z"
							fill="#FFFDFC"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M51.0467 23.0411L58.5614 5.07025L63.1001 1.75049L64 6.51329L56.5011 24.3028L60.3927 27.1021L54.9935 28.2692C54.9935 28.2692 53.5442 31.0627 49.1128 32.9689C49.1128 32.9689 48.6715 29.3937 49.6653 26.7552L46.8789 22.9623L51.0467 23.0411Z"
							fill="#F15541"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M63.1001 1.75049L53.1621 24.2082L56.5011 24.3028L63.9999 6.51329L63.1001 1.75049Z"
							fill="#5F0B00"
						/>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M49.1133 32.9612C49.1133 32.9612 51.5753 29.347 52.6417 27.4966L60.3853 27.1023L54.994 28.2615C54.994 28.2615 53.2661 31.3091 49.1133 32.9612Z"
							fill="#5F0B00"
						/>
					</svg>
				</div>

				{!!subTitle && (
					<p
						style={{
							paddingTop: 32,
							lineHeight: 1,
							color: "#ffffff80",
							fontSize: 32,
							paddingLeft: 64,
							textAlign: "left",
						}}
					>
						{decodeURIComponent(subTitle)}
					</p>
				)}

				<p
					style={{
						color: "#fff",
						fontSize: 90,
						lineHeight: 1,
						paddingLeft: 64,
						textAlign: "left",
					}}
				>
					{title ? decodeURIComponent(title) : "Title"}
				</p>

				<div
					style={{
						position: "absolute",
						top: 100,
						right: 40,
						zIndex: 10,
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
					}}
				>
					<span
						style={{
							color: "#fff",
							fontSize: 24,
							fontWeight: 500,
							// background: '#000',
							// borderRadius: 12,
							padding: "6px 20px",
							// boxShadow: '0 2px 12px #0002',
						}}
					>
						{terms && terms !== "0"
							? `Equity offered: ${decodeURIComponent(terms)}%`
							: "negotiable terms of cooperation"}
					</span>
				</div>

				{vDate && (
					<div
						style={{
							position: "absolute",
							top: 40,
							right: 40,
							zIndex: 10,
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
						}}
					>
						<span
							style={{
								color: "#fff",
								fontSize: 32,
								fontWeight: 700,
								background: "#000",
								borderRadius: 12,
								padding: "6px 20px",
								boxShadow: "0 2px 12px #0002",
							}}
						>
							Relevant to {decodeURIComponent(vDate)}
						</span>
					</div>
				)}
			</div>,
			{
				width: 1200,
				height: 630,
				fonts: [
					{
						name: "Mulish",
						data: fontData,
						style: "normal",
					},
				],
			},
		);
	} catch (e: any) {
		console.log(`${e.message}`);
		return new Response(`Failed to generate the image`, {
			status: 500,
		});
	}
}
