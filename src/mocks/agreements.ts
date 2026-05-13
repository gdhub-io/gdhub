import {
	type LegalAcceptance,
	LegalAcceptanceContext,
	LegalActorRole,
	LegalDocumentContext,
	type LegalDocumentTemplate,
	type LegalUser,
	type ProjectLegalEvent,
	ProjectLegalEventType,
	type ProjectLegalSnapshot,
	ProjectLegalSnapshotStatus,
} from "@/types/agreements";

export const MOCK_USERS: LegalUser[] = [
	{ id: "u1", name: "Anna Sorokina", email: "as@example.com" },
	{ id: "u2", name: "Mikhail Kozlov", email: "mk@example.com" },
	{ id: "u3", name: "Petr Ivanov", email: "pi@example.com" },
	{ id: "u4", name: "Elena Vasileva", email: "ev@example.com" },
	{ id: "u5", name: "Denis Novikov", email: "dn@example.com" },
	{ id: "u0", name: "Alex Petrov", email: "ap@example.com" },
];

// ─── Templates ─────────────────────────────────────────────────────────────────

export const MOCK_TEMPLATES: LegalDocumentTemplate[] = [
	// Platform
	{
		id: "tpl-privacy",
		context: LegalDocumentContext.Platform,
		version: 3,
		locale: "en",
		title: "Privacy Policy",
		createdAt: "2024-09-01T10:00:00Z",
		updatedAt: "2025-03-01T10:00:00Z",
		snapshotCount: 1,
		variables: [{ key: "effective_date", label: "Effective Date" }],
		contentMarkdown: `**Effective date: {{effective_date}}**

GDHub ("we", "us", "our") respects your privacy and is committed to protecting your personal data.

**1. Data we collect**
We collect information you provide directly: name, email, profile details.

**2. How we use your data**
To provide and improve our services, send updates, and comply with legal obligations.

**3. Data retention**
We retain your data for as long as your account is active or as needed to provide services.

**4. Your rights**
You have the right to access, correct, or delete your personal data at any time.

By registering on GDHub, you acknowledge you have read and understood this Privacy Policy.`,
	},
	{
		id: "tpl-cookie",
		context: LegalDocumentContext.Platform,
		version: 2,
		locale: "en",
		title: "Cookie Policy",
		createdAt: "2024-09-01T10:00:00Z",
		updatedAt: "2025-03-01T10:00:00Z",
		snapshotCount: 1,
		variables: [],
		contentMarkdown: `GDHub uses cookies and similar technologies to operate our platform.

**Essential cookies** — required for the platform to function.
**Analytics cookies** — help us understand how users interact with GDHub.
**Preference cookies** — remember your settings and choices.

You can control non-essential cookies in your browser settings. Continued use of GDHub implies acceptance of this policy.`,
	},
	{
		id: "tpl-terms",
		context: LegalDocumentContext.Platform,
		version: 4,
		locale: "en",
		title: "Terms of Use",
		createdAt: "2024-09-01T10:00:00Z",
		updatedAt: "2025-04-01T10:00:00Z",
		snapshotCount: 1,
		variables: [{ key: "effective_date", label: "Effective Date" }],
		contentMarkdown: `**Effective date: {{effective_date}}**

These Terms of Use govern your access to and use of GDHub platform.

**1. Eligibility**
You must be at least 18 years old to use GDHub.

**2. Acceptable use**
You agree not to misuse the platform, infringe others' intellectual property, or violate applicable laws.

**3. Content ownership**
You retain ownership of content you create. You grant GDHub a licence to display it on the platform.

**4. Termination**
We reserve the right to suspend or terminate accounts that violate these terms.`,
	},
	// Project
	{
		id: "tpl-requirements",
		context: LegalDocumentContext.Project,
		version: 2,
		locale: "en",
		title: "Requirements for Game Projects on GDHub",
		createdAt: "2025-01-01T10:00:00Z",
		updatedAt: "2025-02-01T10:00:00Z",
		snapshotCount: 3,
		variables: [
			{ key: "project_name", label: "Project Name" },
			{ key: "author_name", label: "Project Author Name" },
		],
		contentMarkdown: `**Project: {{project_name}}**
**Author: {{author_name}}**

By participating in a project on GDHub you confirm that:

1. The project aims to produce an original game or interactive experience.
2. All contributors must have a verified GDHub account.
3. The project must comply with GDHub platform guidelines and content policies.
4. Revenue distribution and IP rights are governed by separate project agreements.
5. GDHub reserves the right to remove projects that violate platform rules.`,
	},
	{
		id: "tpl-codev",
		context: LegalDocumentContext.Project,
		version: 2,
		locale: "en",
		title: "Project Co-Development Agreement",
		createdAt: "2025-01-01T10:00:00Z",
		updatedAt: "2025-04-15T10:00:00Z",
		snapshotCount: 8,
		variables: [
			{ key: "author_name", label: "Author Name" },
			{ key: "participant_name", label: "Participant Name" },
			{ key: "project_name", label: "Project Name" },
			{ key: "join_date", label: "Join Date" },
			{
				key: "notice_days",
				label: "Notice Period (days)",
				description: "Days to opt-out after an amendment",
			},
			{ key: "jurisdiction", label: "Jurisdiction" },
		],
		contentMarkdown: `This Co-Development Agreement is entered into between **{{author_name}}** (Author) and **{{participant_name}}** (Participant) within the project **{{project_name}}**.

1. The Participant joins the project from **{{join_date}}**.
2. The Author may amend this Agreement with **{{notice_days}}** days' notice to the Participant.
3. Absence of opt-out within the notice period constitutes acceptance of amendments.
4. Applicable law: **{{jurisdiction}}**.
5. IP created during participation is subject to the share distribution agreed separately on the platform.

By accepting, the Participant confirms they have read and agree to the terms above.`,
	},
	// Person
	{
		id: "tpl-personal",
		context: LegalDocumentContext.Person,
		version: 1,
		locale: "en",
		title: "Additional Personal Agreement to the Project Co-Dev",
		createdAt: "2025-04-20T10:00:00Z",
		updatedAt: "2025-04-28T10:00:00Z",
		snapshotCount: 0,
		variables: [
			{ key: "author_name", label: "Author Name" },
			{ key: "participant_name", label: "Participant Name" },
			{ key: "project_name", label: "Project Name" },
			{ key: "role", label: "Participant Role" },
			{ key: "equity_share", label: "Equity Share (%)" },
			{ key: "responsibilities", label: "Responsibilities" },
		],
		contentMarkdown: `This Additional Personal Agreement supplements the Project Co-Development Agreement for **{{project_name}}**.

**Participant:** {{participant_name}}
**Role:** {{role}}
**Equity share:** {{equity_share}}%

**Responsibilities:**
{{responsibilities}}

This agreement takes effect upon acceptance and cannot be modified without written consent of both parties.`,
	},
];

// ─── Acceptances ───────────────────────────────────────────────────────────────

export const MOCK_ACCEPTANCES: LegalAcceptance[] = [
	{
		id: "acc-1",
		projectId: "proj-1",
		snapshotId: "snap-codev-v2",
		userId: "u1",
		actorRole: LegalActorRole.Member,
		context: LegalAcceptanceContext.InviteJoin,
		acceptedAt: "2025-04-15T14:33:12Z",
		ipAddress: "185.12.x.x",
		user: MOCK_USERS[0],
	},
	{
		id: "acc-2",
		projectId: "proj-1",
		snapshotId: "snap-codev-v2",
		userId: "u2",
		actorRole: LegalActorRole.Member,
		context: LegalAcceptanceContext.InviteJoin,
		acceptedAt: "2025-04-15T16:01:44Z",
		ipAddress: "91.220.x.x",
		user: MOCK_USERS[1],
	},
	{
		id: "acc-3",
		projectId: "proj-1",
		snapshotId: "snap-codev-v2",
		userId: "u4",
		actorRole: LegalActorRole.Member,
		context: LegalAcceptanceContext.InviteJoin,
		acceptedAt: "2025-04-16T09:15:03Z",
		ipAddress: "77.88.x.x",
		user: MOCK_USERS[3],
	},
	// Acceptances for v1 (now superseded)
	{
		id: "acc-4",
		projectId: "proj-1",
		snapshotId: "snap-codev-v1",
		userId: "u1",
		actorRole: LegalActorRole.Member,
		context: LegalAcceptanceContext.ProjectCreate,
		acceptedAt: "2025-03-01T12:00:00Z",
		ipAddress: "185.12.x.x",
		user: MOCK_USERS[0],
	},
	{
		id: "acc-5",
		projectId: "proj-1",
		snapshotId: "snap-codev-v1",
		userId: "u2",
		actorRole: LegalActorRole.Member,
		context: LegalAcceptanceContext.ProjectCreate,
		acceptedAt: "2025-03-01T13:00:00Z",
		ipAddress: "91.220.x.x",
		user: MOCK_USERS[1],
	},
	// Platform: Privacy Policy
	{
		id: "acc-6",
		projectId: "platform",
		snapshotId: "snap-privacy",
		userId: "u1",
		actorRole: LegalActorRole.Platform,
		context: LegalAcceptanceContext.PlatformRegistration,
		acceptedAt: "2025-01-10T09:00:00Z",
		ipAddress: "185.12.x.x",
		user: MOCK_USERS[0],
	},
	{
		id: "acc-7",
		projectId: "platform",
		snapshotId: "snap-privacy",
		userId: "u2",
		actorRole: LegalActorRole.Platform,
		context: LegalAcceptanceContext.PlatformRegistration,
		acceptedAt: "2025-01-15T11:30:00Z",
		ipAddress: "91.220.x.x",
		user: MOCK_USERS[1],
	},
];

// ─── Snapshots (concrete documents with filled values) ─────────────────────────

export const MOCK_SNAPSHOTS: ProjectLegalSnapshot[] = [
	// Platform document: Privacy Policy (no project)
	{
		id: "snap-privacy",
		projectId: "platform",
		templateId: "tpl-privacy",
		templateVersion: 3,
		status: ProjectLegalSnapshotStatus.Active,
		title: "Privacy Policy",
		renderedMarkdown: `**Effective date: 1 March 2025**

GDHub ("we", "us", "our") respects your privacy and is committed to protecting your personal data.

**1. Data we collect**
We collect information you provide directly: name, email, profile details.

**2. How we use your data**
To provide and improve our services, send updates, and comply with legal obligations.

**3. Data retention**
We retain your data for as long as your account is active or as needed to provide services.

**4. Your rights**
You have the right to access, correct, or delete your personal data at any time.

By registering on GDHub, you acknowledge you have read and understood this Privacy Policy.`,
		params: { effective_date: "1 March 2025" },
		createdById: "u0",
		createdAt: "2025-03-01T10:00:00Z",
		template: {
			id: "tpl-privacy",
			context: LegalDocumentContext.Platform,
			version: 3,
			title: "Privacy Policy",
		},
		createdBy: MOCK_USERS[5],
		acceptances: MOCK_ACCEPTANCES.filter(
			(a) => a.snapshotId === "snap-privacy",
		),
	},
	// Project document: Co-Dev Agreement — current active version (v2)
	{
		id: "snap-codev-v2",
		projectId: "proj-1",
		templateId: "tpl-codev",
		templateVersion: 2,
		status: ProjectLegalSnapshotStatus.Active,
		title: "Project Co-Development Agreement",
		renderedMarkdown: `This Co-Development Agreement is entered into between **Alex Petrov** (Author) and **{{participant_name}}** (Participant) within the project **AlphaLaunch**.

1. The Participant joins the project from **{{join_date}}**.
2. The Author may amend this Agreement with **14** days' notice to the Participant.
3. Absence of opt-out within the notice period constitutes acceptance of amendments.
4. Applicable law: **International**.
5. IP created during participation is subject to the share distribution agreed separately on the platform.

By accepting, the Participant confirms they have read and agree to the terms above.`,
		params: {
			author_name: "Alex Petrov",
			project_name: "AlphaLaunch",
			notice_days: "14",
			jurisdiction: "International",
		},
		createdById: "u0",
		createdAt: "2025-04-15T10:00:00Z",
		template: {
			id: "tpl-codev",
			context: LegalDocumentContext.Project,
			version: 2,
			title: "Project Co-Development Agreement",
		},
		createdBy: MOCK_USERS[5],
		acceptances: MOCK_ACCEPTANCES.filter(
			(a) => a.snapshotId === "snap-codev-v2",
		),
	},
	// Project document: Co-Dev Agreement — previous version (v1, superseded)
	{
		id: "snap-codev-v1",
		projectId: "proj-1",
		templateId: "tpl-codev",
		templateVersion: 1,
		status: ProjectLegalSnapshotStatus.Superseded,
		title: "Project Co-Development Agreement",
		renderedMarkdown: `This Co-Development Agreement is entered into between **Alex Petrov** (Author) and **{{participant_name}}** (Participant) within the project **AlphaLaunch**.

1. The Participant joins the project from **{{join_date}}**.
2. The Author may amend this Agreement with **30** days' notice to the Participant.
3. Applicable law: **Russian Federation**.`,
		params: {
			author_name: "Alex Petrov",
			project_name: "AlphaLaunch",
			notice_days: "30",
			jurisdiction: "Russian Federation",
		},
		createdById: "u0",
		createdAt: "2025-03-01T10:00:00Z",
		supersededAt: "2025-04-15T10:00:00Z",
		template: {
			id: "tpl-codev",
			context: LegalDocumentContext.Project,
			version: 1,
			title: "Project Co-Development Agreement",
		},
		createdBy: MOCK_USERS[5],
		acceptances: MOCK_ACCEPTANCES.filter(
			(a) => a.snapshotId === "snap-codev-v1",
		),
	},
	// Project document: Requirements
	{
		id: "snap-requirements",
		projectId: "proj-1",
		templateId: "tpl-requirements",
		templateVersion: 2,
		status: ProjectLegalSnapshotStatus.Active,
		title: "Requirements for Game Projects on GDHub",
		renderedMarkdown: `**Project: AlphaLaunch**
**Author: Alex Petrov**

By participating in a project on GDHub you confirm that:

1. The project aims to produce an original game or interactive experience.
2. All contributors must have a verified GDHub account.
3. The project must comply with GDHub platform guidelines and content policies.
4. Revenue distribution and IP rights are governed by separate project agreements.
5. GDHub reserves the right to remove projects that violate platform rules.`,
		params: { project_name: "AlphaLaunch", author_name: "Alex Petrov" },
		createdById: "u0",
		createdAt: "2025-04-15T09:00:00Z",
		template: {
			id: "tpl-requirements",
			context: LegalDocumentContext.Project,
			version: 2,
			title: "Requirements for Game Projects on GDHub",
		},
		createdBy: MOCK_USERS[5],
		acceptances: MOCK_ACCEPTANCES.filter(
			(a) => a.snapshotId === "snap-requirements",
		),
	},
];

// ─── Events ────────────────────────────────────────────────────────────────────

export const MOCK_EVENTS: ProjectLegalEvent[] = [
	{
		id: "evt-1",
		projectId: "proj-1",
		snapshotId: "snap-codev-v2",
		actorUserId: "u0",
		subjectUserId: "u1",
		type: ProjectLegalEventType.AgreementAccepted,
		createdAt: "2025-04-15T14:33:12Z",
		actorUser: MOCK_USERS[5],
		subjectUser: MOCK_USERS[0],
	},
	{
		id: "evt-2",
		projectId: "proj-1",
		snapshotId: "snap-codev-v2",
		actorUserId: "u0",
		subjectUserId: "u2",
		type: ProjectLegalEventType.AgreementAccepted,
		createdAt: "2025-04-15T16:01:44Z",
		actorUser: MOCK_USERS[5],
		subjectUser: MOCK_USERS[1],
	},
	{
		id: "evt-3",
		projectId: "proj-1",
		snapshotId: "snap-codev-v2",
		actorUserId: "u0",
		type: ProjectLegalEventType.AgreementUpdated,
		createdAt: "2025-04-15T10:00:00Z",
		actorUser: MOCK_USERS[5],
	},
	{
		id: "evt-4",
		projectId: "proj-1",
		snapshotId: "snap-codev-v1",
		actorUserId: "u0",
		type: ProjectLegalEventType.ProjectCreated,
		createdAt: "2025-03-01T10:00:00Z",
		actorUser: MOCK_USERS[5],
	},
];

export const MOCK_PROJECT_MEMBERS = MOCK_USERS.slice(0, 5);

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Returns only the current (Active) version of each logical document. */
export const getActiveSnapshots = () =>
	MOCK_SNAPSHOTS.filter((s) => s.status === ProjectLegalSnapshotStatus.Active);

/** Returns all versions (current + history) for a given logical document key. */
export const getSnapshotVersions = (templateId: string, projectId: string) =>
	MOCK_SNAPSHOTS.filter(
		(s) => s.templateId === templateId && s.projectId === projectId,
	).sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);

/** Returns all acceptances for a given logical document (all versions). */
export const getDocumentAcceptances = (templateId: string, projectId: string) =>
	getSnapshotVersions(templateId, projectId).flatMap(
		(s) => s.acceptances ?? [],
	);
