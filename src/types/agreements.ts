// Enums mirroring Prisma schema

export enum LegalDocumentContext {
	Platform = "Platform",
	Project = "Project",
	Person = "Person",
	// Event = "Event",   // future
	// Course = "Course", // future
}

export enum ProjectLegalSnapshotStatus {
	Active = "Active",
	Superseded = "Superseded",
	Void = "Void",
}

export enum LegalActorRole {
	Author = "Author",
	Member = "Member",
	Mentor = "Mentor",
	Platform = "Platform",
}

export enum LegalAcceptanceContext {
	// Platform-level (public docs)
	PlatformRegistration = "PlatformRegistration",
	// Project-level (private docs)
	ProjectCreate = "ProjectCreate",
	InviteJoin = "InviteJoin",
	VacancyHire = "VacancyHire",
	MentorJoin = "MentorJoin",
	ShareChange = "ShareChange",
	MemberExclusion = "MemberExclusion",
}

export enum ProjectLegalEventType {
	ProjectCreated = "ProjectCreated",
	AgreementAccepted = "AgreementAccepted",
	MemberJoined = "MemberJoined",
	MentorJoined = "MentorJoined",
	ShareChanged = "ShareChanged",
	MemberExcluded = "MemberExcluded",
	MemberLeft = "MemberLeft",
	AgreementUpdated = "AgreementUpdated",
}

// Domain types

export type LegalTemplateVariable = {
	key: string;
	label: string;
	description?: string;
};

export type LegalDocumentTemplate = {
	id: string;
	/** Public = platform-wide (Privacy Policy, etc.). Private = project-scoped. */
	context: LegalDocumentContext;
	version: number;
	locale: string;
	title: string;
	contentMarkdown: string;
	contentHtml?: string;
	createdAt: string;
	updatedAt: string;
	variables?: LegalTemplateVariable[];
	snapshotCount?: number;
};

export type ProjectLegalSnapshot = {
	id: string;
	projectId: string;
	templateId: string;
	templateVersion: number;
	status: ProjectLegalSnapshotStatus;
	title: string;
	renderedMarkdown: string;
	renderedHtml?: string;
	params?: Record<string, string>;
	createdById: string;
	createdAt: string;
	supersededAt?: string;
	template?: Pick<
		LegalDocumentTemplate,
		"id" | "context" | "version" | "title"
	>;
	createdBy?: LegalUser;
	acceptances?: LegalAcceptance[];
};

export type LegalAcceptance = {
	id: string;
	projectId: string;
	snapshotId: string;
	userId: string;
	actorRole: LegalActorRole;
	context: LegalAcceptanceContext;
	acceptedAt: string;
	ipAddress?: string;
	meta?: Record<string, unknown>;
	user?: LegalUser;
};

export type ProjectLegalEvent = {
	id: string;
	projectId: string;
	snapshotId?: string;
	actorUserId?: string;
	subjectUserId?: string;
	type: ProjectLegalEventType;
	payload?: Record<string, unknown>;
	effectiveAt?: string;
	createdAt: string;
	actorUser?: LegalUser;
	subjectUser?: LegalUser;
};

export type LegalUser = {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
};

// Notification settings (frontend-only shape, will be stored as JSON)
export type AgreementNotificationSettings = {
	optOutDays: number;
	channels: "email+inapp" | "email" | "inapp";
	emailSubject: string;
	emailBody: string;
};

// Signer status (derived from acceptances)
export type SignerStatus = {
	user: LegalUser;
	actorRole: LegalActorRole;
	acceptance?: LegalAcceptance;
	deadline?: string;
};
