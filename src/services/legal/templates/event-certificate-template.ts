import { readFile } from "node:fs/promises";
import path from "node:path";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";

export type EventCertificateTemplateInput = {
	eventType: prismaClient.$Enums.EventType;
	organizerName: string;
	organizerTitle: string;
	startDate: Date | null;
	endDate: Date | null;
};

const isSameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

const LOGO_PATH = path.join(
	process.cwd(),
	"src/assets/images/gdhub-logo-black.png",
);

export async function renderEventCertificatePdf({
	eventType,
	organizerName,
	organizerTitle,
	startDate,
	endDate,
}: EventCertificateTemplateInput): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	const page = doc.addPage([842, 595]); // A4 landscape (pt)
	const { width, height } = page.getSize();

	const sans = await doc.embedFont(StandardFonts.Helvetica);
	const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
	const serifBoldItalic = await doc.embedFont(
		StandardFonts.TimesRomanBoldItalic,
	);

	const ink = rgb(0.13, 0.13, 0.15);
	const muted = rgb(0.55, 0.55, 0.6);
	const accent = rgb(0.85, 0.36, 0.32);
	const borderColor = rgb(0.9, 0.9, 0.9);

	// outer thin border
	page.drawRectangle({
		x: 20,
		y: 20,
		width: width - 40,
		height: height - 40,
		borderColor,
		borderWidth: 1,
	});

	const drawCentered = (
		text: string,
		y: number,
		font: PDFFont,
		size: number,
		color = ink,
	) => {
		const w = font.widthOfTextAtSize(text, size);
		page.drawText(text, { x: (width - w) / 2, y, size, font, color });
	};

	// approximate letter-spaced (tracked) text by drawing each glyph manually
	const drawTrackedCentered = (
		text: string,
		y: number,
		font: PDFFont,
		size: number,
		tracking: number,
		color = ink,
	) => {
		const chars = [...text];
		const widths = chars.map((c) => font.widthOfTextAtSize(c, size));
		const total =
			widths.reduce((s, v) => s + v, 0) + tracking * (chars.length - 1);
		let x = (width - total) / 2;
		chars.forEach((c, i) => {
			page.drawText(c, { x, y, size, font, color });
			x += widths[i] + tracking;
		});
	};

	const drawTracked = (
		text: string,
		x: number,
		y: number,
		font: PDFFont,
		size: number,
		tracking: number,
		color = ink,
	) => {
		const chars = [...text];
		const widths = chars.map((c) => font.widthOfTextAtSize(c, size));
		let cx = x;
		chars.forEach((c, i) => {
			page.drawText(c, { x: cx, y, size, font, color });
			cx += widths[i] + tracking;
		});
	};

	// triangle (filled). Path is SVG-style: y increases downward inside the
	// path, pdf-lib flips it back to PDF space at (x, y).
	const drawTriangle = (cx: number, baseY: number, size: number) => {
		const half = size / 2;
		page.drawSvgPath(
			`M ${half} 0 L ${size} ${size * 0.9} L 0 ${size * 0.9} Z`,
			{
				x: cx - half,
				y: baseY + size * 0.9,
				color: accent,
			},
		);
	};

	// --- HEADER ---
	const headerY = 550;

	// left: gdhub wordmark (PNG with transparent padding)
	const logoBytes = await readFile(LOGO_PATH);
	const logoImage = await doc.embedPng(logoBytes);
	const logoBoxWidth = 110;
	const logoBoxHeight = (logoImage.height / logoImage.width) * logoBoxWidth;

	page.drawImage(logoImage, {
		x: 30,
		y: headerY - logoBoxHeight / 2 + 4,
		width: logoBoxWidth,
		height: logoBoxHeight,
	});

	// center: tracked title
	drawTrackedCentered(
		"CERTIFICATE OF PARTICIPATION",
		headerY + 2,
		sans,
		11,
		3,
		ink,
	);

	// right: certificate number + verify URL
	const numText = "No. {{certificate_number}}";
	const verifyText = "gdhub.io/verify";
	const numW = sans.widthOfTextAtSize(numText, 9);
	const verifyW = sans.widthOfTextAtSize(verifyText, 9);
	page.drawText(numText, {
		x: width - 50 - numW,
		y: headerY + 6,
		size: 9,
		font: sans,
		color: muted,
	});
	page.drawText(verifyText, {
		x: width - 50 - verifyW,
		y: headerY - 6,
		size: 9,
		font: sans,
		color: muted,
	});

	// --- BODY ---
	drawCentered("This is to certify that", 460, serifItalic, 17, muted);

	// participant name — large hero
	drawCentered("{{participant_name}}", 395, sansBold, 44, ink);

	// divider with accent triangle
	const divY = 360;
	page.drawLine({
		start: { x: width / 2 - 78, y: divY },
		end: { x: width / 2 - 14, y: divY },
		thickness: 0.6,
		color: muted,
	});
	page.drawLine({
		start: { x: width / 2 + 14, y: divY },
		end: { x: width / 2 + 78, y: divY },
		thickness: 0.6,
		color: muted,
	});
	drawTriangle(width / 2, divY, 10);

	const isGameLab = eventType === "GameLab";

	const eventTypeLabel: Record<prismaClient.$Enums.EventType, string> = {
		Meetup: "meetup",
		Workshop: "workshop",
		GameJam: "game jam",
		Conference: "conference",
		GameLab: "incubator", // unused — GameLab takes a different layout branch
	};

	if (isGameLab) {
		drawCentered("participated in the project", 335, sans, 11, muted);
		drawCentered("{{project_name}}", 308, sansBold, 22, ink);
		drawCentered(
			"in the position of {{participant_position}}",
			278,
			serifBoldItalic,
			17,
			accent,
		);
	} else {
		drawCentered(
			`participated in the ${eventTypeLabel[eventType]}`,
			335,
			sans,
			11,
			muted,
		);
		drawCentered("{{event_title}}", 308, sansBold, 22, ink);
	}

	const sz = 11;

	if (isGameLab) {
		// "as part of <eventTitle>, GDHub's collaborative game-development incubator,"
		const seg1 = "as part of ";
		const seg2 = "{{event_title}}";
		const seg3 = ", GDHub's collaborative game-development incubator,";
		const w1 = sans.widthOfTextAtSize(seg1, sz);
		const w2 = sansBold.widthOfTextAtSize(seg2, sz);
		const w3 = sans.widthOfTextAtSize(seg3, sz);
		let cx1 = (width - (w1 + w2 + w3)) / 2;
		const line1Y = 245;
		page.drawText(seg1, {
			x: cx1,
			y: line1Y,
			size: sz,
			font: sans,
			color: ink,
		});
		cx1 += w1;
		page.drawText(seg2, {
			x: cx1,
			y: line1Y,
			size: sz,
			font: sansBold,
			color: ink,
		});
		cx1 += w2;
		page.drawText(seg3, {
			x: cx1,
			y: line1Y,
			size: sz,
			font: sans,
			color: ink,
		});
	}

	// Date line: layout decided by schedule (same-day vs range), values stay
	// as Documenso placeholders so they get filled per envelope.
	const line2Y = isGameLab ? 228 : 275;
	if (startDate && endDate) {
		if (isSameDay(startDate, endDate)) {
			const lead = "on ";
			const date = "{{start_date}}";
			const dot = ".";
			const lw = sans.widthOfTextAtSize(lead, sz);
			const dw = sansBold.widthOfTextAtSize(date, sz);
			const dotW = sans.widthOfTextAtSize(dot, sz);
			let cx2 = (width - (lw + dw + dotW)) / 2;
			page.drawText(lead, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sans,
				color: ink,
			});
			cx2 += lw;
			page.drawText(date, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sansBold,
				color: ink,
			});
			cx2 += dw;
			page.drawText(dot, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sans,
				color: ink,
			});
		} else {
			const f1 = "from ";
			const f2 = "{{start_date}}";
			const f3 = " to ";
			const f4 = "{{end_date}}";
			const f5 = ".";
			const fw1 = sans.widthOfTextAtSize(f1, sz);
			const fw2 = sansBold.widthOfTextAtSize(f2, sz);
			const fw3 = sans.widthOfTextAtSize(f3, sz);
			const fw4 = sansBold.widthOfTextAtSize(f4, sz);
			const fw5 = sans.widthOfTextAtSize(f5, sz);
			let cx2 = (width - (fw1 + fw2 + fw3 + fw4 + fw5)) / 2;
			page.drawText(f1, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sans,
				color: ink,
			});
			cx2 += fw1;
			page.drawText(f2, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sansBold,
				color: ink,
			});
			cx2 += fw2;
			page.drawText(f3, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sans,
				color: ink,
			});
			cx2 += fw3;
			page.drawText(f4, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sansBold,
				color: ink,
			});
			cx2 += fw4;
			page.drawText(f5, {
				x: cx2,
				y: line2Y,
				size: sz,
				font: sans,
				color: ink,
			});
		}
	}

	// --- FOOTER (signatures) ---
	const sigY = 100;
	const sigLineLen = 200;

	// left signature
	const leftX = 60;
	page.drawLine({
		start: { x: leftX, y: sigY },
		end: { x: leftX + sigLineLen, y: sigY },
		thickness: 0.6,
		color: ink,
	});
	page.drawText(organizerName, {
		x: leftX,
		y: sigY - 16,
		size: 11,
		font: sansBold,
		color: ink,
	});
	page.drawText(organizerTitle, {
		x: leftX,
		y: sigY - 30,
		size: 9,
		font: sans,
		color: muted,
	});

	// center: ISSUED label + date
	drawTrackedCentered("ISSUED", sigY + 6, sans, 9, 2, muted);
	drawCentered("{{issued_date}}", sigY - 16, sansBold, 11, ink);

	// right signature — lead mentor block only for GameLab events
	if (isGameLab) {
		const rightX = width - 60 - sigLineLen;
		page.drawLine({
			start: { x: rightX, y: sigY },
			end: { x: rightX + sigLineLen, y: sigY },
			thickness: 0.6,
			color: ink,
		});
		page.drawText("{{lead_mentor_name}}", {
			x: rightX,
			y: sigY - 16,
			size: 11,
			font: sansBold,
			color: ink,
		});
		page.drawText("Lead Mentor", {
			x: rightX,
			y: sigY - 30,
			size: 9,
			font: sans,
			color: muted,
		});
	}

	// silence unused helper warning
	void drawTracked;

	return await doc.save();
}
