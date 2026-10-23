import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";
import { CONTACT_EMAIL } from "@/config/contact";
import { joinWaitlist } from "@/repositories/feature-waitlist";

const limited = vi.fn();
const sendMail = vi.fn();
const sendTransacEmail = vi.fn();

vi.mock("@/auth", () => ({ auth: () => Promise.resolve(null) }));
vi.mock("@/lib/rate-limit", () => ({ limitAiCalls: () => limited() }));
vi.mock("@/repositories/feature-waitlist", () => ({ joinWaitlist: vi.fn() }));
vi.mock("nodemailer", () => ({
	createTransport: () => ({ sendMail: (letter: unknown) => sendMail(letter) }),
}));
vi.mock("@/services/brevo", () => ({
	brevoApi: {
		smtp: { sendTransacEmail: (letter: unknown) => sendTransacEmail(letter) },
	},
}));

const letter = {
	email: "anna@studio.com",
	subject: "Question",
	message: "Hi <b>team</b>\nsecond line",
};

const post = (body: unknown) =>
	POST(
		new NextRequest("http://test/api/contact", {
			method: "POST",
			body: JSON.stringify(body),
		}),
		{ params: Promise.resolve({}) },
		{} as never,
	);

beforeEach(() => {
	vi.clearAllMocks();
	limited.mockResolvedValue(null);
	sendTransacEmail.mockResolvedValue({ error: null });
	vi.stubEnv("EMAIL_SERVER", "smtp://localhost:1025");
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("the landing's contact form", () => {
	it("writes to the team with the sender as the reply address", async () => {
		const response = await post(letter);

		expect(response.status).toBe(200);
		expect(sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: CONTACT_EMAIL,
				replyTo: "anna@studio.com",
				subject: "[General] Question",
			}),
		);
		expect(joinWaitlist).not.toHaveBeenCalled();
	});

	it("escapes what the sender typed before it goes into the letter", async () => {
		await post(letter);

		const { html } = sendMail.mock.calls[0][0];
		expect(html).toContain("Hi &lt;b&gt;team&lt;/b&gt;<br>second line");
		expect(html).not.toContain("<b>team</b>");
	});

	it("puts a Scout access request on the Scout space waitlist", async () => {
		const response = await post({ ...letter, topic: "ScoutSpace" });

		expect(response.status).toBe(200);
		expect(joinWaitlist).toHaveBeenCalledWith("ScoutSpace", "anna@studio.com");
		expect(sendMail.mock.calls[0][0].subject).toBe("[ScoutSpace] Question");
	});

	it("refuses a letter with no email to reply to", async () => {
		const response = await post({ ...letter, email: "nope" });

		expect(response.status).toBe(400);
		expect(sendMail).not.toHaveBeenCalled();
	});

	it("stops a sender past the rate limit before anything is written", async () => {
		limited.mockResolvedValue(new Response(null, { status: 429 }));

		const response = await post({ ...letter, topic: "ScoutSpace" });

		expect(response.status).toBe(429);
		expect(joinWaitlist).not.toHaveBeenCalled();
		expect(sendMail).not.toHaveBeenCalled();
	});

	it("sends through Brevo in production and reports its refusal", async () => {
		vi.stubEnv("NODE_ENV", "production");
		sendTransacEmail.mockResolvedValue({ error: { message: "sender" } });

		const response = await post(letter);

		expect(response.status).toBe(500);
		expect(sendMail).not.toHaveBeenCalled();
		expect(sendTransacEmail).toHaveBeenCalledWith(
			expect.objectContaining({ replyTo: { email: "anna@studio.com" } }),
		);
	});
});
