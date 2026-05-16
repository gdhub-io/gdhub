import { DocusealApi } from "@docuseal/api";

const CERTIFICATE_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body {
    font-family: 'Georgia', serif;
    color: #1a1a1a;
    margin: 0;
    padding: 60px 80px;
    background: #fff;
  }
  .certificate {
    border: 8px solid #2e3a59;
    padding: 60px;
    text-align: center;
  }
  .title {
    font-size: 42px;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .subtitle {
    font-size: 18px;
    color: #6b7280;
    margin-bottom: 48px;
  }
  .label {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #6b7280;
    margin-top: 32px;
  }
  .field {
    font-size: 24px;
    margin-top: 8px;
    min-height: 36px;
  }
  .event {
    font-size: 28px;
    font-weight: bold;
    margin-top: 24px;
    margin-bottom: 24px;
  }
  .signatures {
    display: flex;
    justify-content: space-around;
    margin-top: 64px;
  }
  .signature-block {
    width: 40%;
  }
  .signature-line {
    border-top: 1px solid #1a1a1a;
    margin-top: 60px;
    padding-top: 8px;
    font-size: 12px;
    color: #6b7280;
    letter-spacing: 1px;
  }
</style>
</head>
<body>
  <div class="certificate">
    <div class="title">Certificate</div>
    <div class="subtitle">of Participation</div>
    <div class="label">This is to certify that</div>
    <div class="field">
      <text-field name="participant_name" role="Participant" required="true" />
    </div>
    <div class="label">has successfully participated in</div>
    <div class="event">{{event_title}}</div>
    <div class="label">on</div>
    <div class="field">
      <date-field name="award_date" role="Organizer" required="true" />
    </div>
    <div class="signatures">
      <div class="signature-block">
        <signature-field name="organizer_signature" role="Organizer" required="true" />
        <div class="signature-line">Organizer</div>
      </div>
      <div class="signature-block">
        <signature-field name="mentor_signature" role="Mentor" />
        <div class="signature-line">Mentor</div>
      </div>
    </div>
  </div>
</body>
</html>`;

export class SignDocumentService {
	private instance: DocusealApi;

	constructor() {
		this.instance = new DocusealApi({
			url: process.env.LEGAL_DOCUMENT_SIGNING_SERVER_URL,
			key: process.env.LEGAL_DOCUMENT_SIGNING_AUTH_TOKEN,
		});
	}

	async createCertificateTemplate({
		eventId,
		eventTitle,
	}: {
		eventId: string;
		eventTitle: string;
	}) {
		const html = CERTIFICATE_TEMPLATE_HTML.replace(
			"{{event_title}}",
			escapeHtml(eventTitle),
		);

		const result = await this.instance.createTemplateFromHtml({
			name: `Certificate — ${eventTitle}`,
			html,
			external_id: `event:${eventId}`,
		});

		return result;
	}

	async getTemplate(id: number) {
		return await this.instance.getTemplate(id);
	}
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
