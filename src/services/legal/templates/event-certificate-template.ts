import { readFile } from "node:fs/promises";
import path from "node:path";
import type { EventType } from "@gdhub-io/gdhub-prisma";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, rgb } from "pdf-lib";

export type EventCertificateTemplateInput = {
	eventType: EventType;
	organizerName: string;
	organizerTitle: string;
	startDate: Date | null;
	endDate: Date | null;
	// per-member overrides — when null/undefined, the renderer falls back to
	// the `{{placeholder}}` text so the same function works for the preview in
	// settings AND for the fully-populated per-member certificate.
	participantName?: string | null;
	participantPosition?: string | null;
	projectName?: string | null;
	eventTitle?: string | null;
	eventShortDescription?: string | null;
	certificateNumber?: string | null;
	issuedDate?: Date | null;
	mentorName?: string | null;
};

const isSameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

const LOGO_PATH = path.join(
	process.cwd(),
	"src/assets/images/gdhub-logo-black.png",
);

// The folder stays a literal so the bundler traces only these fonts, not the whole project.
const readFont = (file: string) =>
	readFile(path.join(process.cwd(), "src/assets/fonts/mulish", file));

// Page geometry. Documenso expects field coordinates as percentages of
// page width/height with the origin at the top-left corner.
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const SIG_BASELINE_Y = 100; // PDF y (from bottom) of the signature line
const SIG_LINE_LEN = 200; // signature box width (matches the drawn line)
// Signature box keeps a 16:7 width-to-height aspect ratio, so the height
// follows the width instead of being a standalone magic number.
const SIG_BOX_ASPECT = 16 / 7;
const SIG_BOX_HEIGHT = SIG_LINE_LEN / SIG_BOX_ASPECT; // ≈ 87.5
// The box straddles the signature line: 1/4 of its height sits below the line,
// 3/4 above. That lifts the box centre above the line, so a signature drawn
// centred in the box reads as sitting just above the line.
const SIG_BOX_BELOW_LINE = SIG_BOX_HEIGHT / 4;
const SIG_LEFT_X = 60;
const SIG_RIGHT_X = PAGE_WIDTH - 60 - SIG_LINE_LEN;

const toPct = (v: number, total: number) => (v / total) * 100;

export type SignatureFieldPosition = {
	pageNumber: number;
	pageX: number;
	pageY: number;
	width: number;
	height: number;
};

const signatureFieldAt = (xPdf: number): SignatureFieldPosition => ({
	pageNumber: 1,
	pageX: toPct(xPdf, PAGE_WIDTH),
	// pageY is measured from the top edge of the page. The box straddles the
	// line: its top edge sits SIG_BOX_HEIGHT - SIG_BOX_BELOW_LINE above the line
	// (2/3 of the height), the remaining 1/3 hangs below the line.
	pageY: toPct(
		PAGE_HEIGHT - (SIG_BASELINE_Y + SIG_BOX_HEIGHT - SIG_BOX_BELOW_LINE),
		PAGE_HEIGHT,
	),
	width: toPct(SIG_LINE_LEN, PAGE_WIDTH),
	height: toPct(SIG_BOX_HEIGHT, PAGE_HEIGHT),
});

export const ORGANIZER_SIGNATURE_FIELD: SignatureFieldPosition =
	signatureFieldAt(SIG_LEFT_X);
export const MENTOR_SIGNATURE_FIELD: SignatureFieldPosition =
	signatureFieldAt(SIG_RIGHT_X);

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	day: "numeric",
	year: "numeric",
});

const valueOr = (value: string | null | undefined, placeholder: string) =>
	value?.trim() ? value : placeholder;

export async function renderEventCertificatePdf({
	eventType,
	organizerName,
	organizerTitle,
	startDate,
	endDate,
	participantName,
	participantPosition,
	projectName,
	eventTitle,
	eventShortDescription,
	certificateNumber,
	issuedDate,
	mentorName,
}: EventCertificateTemplateInput): Promise<Uint8Array> {
	const participantNameText = valueOr(participantName, "{{participant_name}}");
	const participantPositionText = valueOr(
		participantPosition,
		"{{participant_position}}",
	);
	const projectNameText = valueOr(projectName, "{{project_name}}");
	const eventTitleText = valueOr(eventTitle, "{{event_title}}");
	const eventShortDescriptionText = valueOr(
		eventShortDescription,
		"{{event_short_description}}",
	);
	const certificateNumberText = valueOr(
		certificateNumber,
		"{{certificate_number}}",
	);
	const issuedDateText = issuedDate
		? dateFormatter.format(issuedDate)
		: "{{issued_date}}";
	const mentorNameText = valueOr(mentorName, "{{lead_mentor_name}}");
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const page = doc.addPage([842, 595]); // A4 landscape (pt)
	const { width, height } = page.getSize();

	const [regularBytes, boldBytes, italicBytes, boldItalicBytes] =
		await Promise.all([
			readFont("Mulish-Regular.ttf"),
			readFont("Mulish-Bold.ttf"),
			readFont("Mulish-Italic.ttf"),
			readFont("Mulish-BoldItalic.ttf"),
		]);
	const sans = await doc.embedFont(regularBytes, { subset: true });
	const sansBold = await doc.embedFont(boldBytes, { subset: true });
	const serifItalic = await doc.embedFont(italicBytes, { subset: true });
	const serifBoldItalic = await doc.embedFont(boldItalicBytes, {
		subset: true,
	});

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
	const numText = `No. ${certificateNumberText}`;
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
	drawCentered(participantNameText, 395, sansBold, 44, ink);

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

	const eventTypeLabel: Record<EventType, string> = {
		Meetup: "meetup",
		Workshop: "workshop",
		GameJam: "game jam",
		Conference: "conference",
		GameLab: "incubator", // unused — GameLab takes a different layout branch
	};

	if (isGameLab) {
		drawCentered("participated in the project", 335, sans, 11, muted);
		drawCentered(projectNameText, 308, sansBold, 22, ink);
		drawCentered(
			`in the position of ${participantPositionText}`,
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
		drawCentered(eventTitleText, 308, sansBold, 22, ink);
	}

	const sz = 11;

	if (isGameLab) {
		// "as part of <eventTitle>, GDHub's collaborative game-development incubator,"
		const seg1 = "as part of ";
		const seg2 = eventTitleText;
		const seg3 = eventShortDescriptionText
			? `, ${eventShortDescriptionText},`
			: "";
		// const seg3 = ", GDHub's game-development incubation program,";
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

	// Date line: layout decided by schedule (same-day vs range). For preview we
	// leave the values as {{placeholder}} text; for per-member renders we
	// inline the formatted dates.
	const isPerMember = !!(participantName || certificateNumber || issuedDate);
	const startDateText =
		isPerMember && startDate
			? dateFormatter.format(startDate)
			: "{{start_date}}";
	const endDateText =
		isPerMember && endDate ? dateFormatter.format(endDate) : "{{end_date}}";
	const line2Y = isGameLab ? 228 : 275;
	if (startDate && endDate) {
		if (isSameDay(startDate, endDate)) {
			const lead = "on ";
			const date = startDateText;
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
			const f2 = startDateText;
			const f3 = " to ";
			const f4 = endDateText;
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
	const sigY = SIG_BASELINE_Y;
	const sigLineLen = SIG_LINE_LEN;
	const sigNameSize = 13; // printed signer name under the line

	// left signature
	const leftX = SIG_LEFT_X;
	page.drawLine({
		start: { x: leftX, y: sigY },
		end: { x: leftX + sigLineLen, y: sigY },
		thickness: 0.6,
		color: ink,
	});
	page.drawText(organizerName, {
		x: leftX,
		y: sigY - 16,
		size: sigNameSize,
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
	drawCentered(issuedDateText, sigY - 16, sansBold, 11, ink);

	// right signature — lead mentor block only for GameLab events; in preview
	// (no per-member data) we still draw a placeholder, but in per-member
	// renders the block is shown only when a mentor is actually assigned.
	const showMentorBlock = isGameLab && (!isPerMember || !!mentorName?.trim());
	if (showMentorBlock) {
		const rightX = SIG_RIGHT_X;
		page.drawLine({
			start: { x: rightX, y: sigY },
			end: { x: rightX + sigLineLen, y: sigY },
			thickness: 0.6,
			color: ink,
		});
		page.drawText(mentorNameText, {
			x: rightX,
			y: sigY - 16,
			size: sigNameSize,
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
