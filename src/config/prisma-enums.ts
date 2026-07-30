import type {
	AdviceRequestStatus as AdviceRequestStatusType,
	AIThreadStatus as AIThreadStatusType,
	ApplauseActivityType as ApplauseActivityTypeType,
	AuditAction as AuditActionType,
	BlogPostStatus as BlogPostStatusType,
	ChatRoomKind as ChatRoomKindType,
	ChatRoomStatus as ChatRoomStatusType,
	CourseGroupStatus as CourseGroupStatusType,
	CourseInvoiceStatus as CourseInvoiceStatusType,
	CoursePaymentStatus as CoursePaymentStatusType,
	CourseStatus as CourseStatusType,
	CourseStudentStatus as CourseStudentStatusType,
	Currency as CurrencyType,
	EquityTransactionType as EquityTransactionTypeType,
	EventFormat as EventFormatType,
	EventMemberStatus as EventMemberStatusType,
	EventStatus as EventStatusType,
	EventType as EventTypeType,
	InvitationStatus as InvitationStatusType,
	Language as LanguageType,
	LectureStage as LectureStageType,
	LegalAcceptanceContext as LegalAcceptanceContextType,
	LegalActorRole as LegalActorRoleType,
	LegalDocumentCode as LegalDocumentCodeType,
	LegalTemplateStatus as LegalTemplateStatusType,
	PayableType as PayableTypeType,
	PaymentProvider as PaymentProviderType,
	PaymentRateType as PaymentRateTypeType,
	PaymentStatus as PaymentStatusType,
	PrimaryInterest as PrimaryInterestType,
	ProjectLegalEventType as ProjectLegalEventTypeType,
	ProjectLegalSnapshotStatus as ProjectLegalSnapshotStatusType,
	ProjectStatus as ProjectStatusType,
	QueueJobStatus as QueueJobStatusType,
	QueueJobType as QueueJobTypeType,
	SkillLevel as SkillLevelType,
	SubscriptionStatus as SubscriptionStatusType,
	TeamDocumentType as TeamDocumentTypeType,
	TeamMemberStatus as TeamMemberStatusType,
	TeamVacancyStatus as TeamVacancyStatusType,
	UserRole as UserRoleType,
} from "@gdhub-io/gdhub-prisma";

/**
 * Browser-safe mirrors of the Prisma string enums.
 *
 * `@gdhub-io/gdhub-prisma` has no browser entry point: the package root imports
 * `node:module` and `@prisma/adapter-pg`, and its `exports` map hides Prisma's
 * generated browser build. Importing an enum *value* from anything that ends up
 * in a client bundle therefore drags the whole Prisma client into the browser
 * and fails `next build`. Type-only imports are erased at compile time, so
 * `import type { User } from "@gdhub-io/gdhub-prisma"` stays fine everywhere —
 * only values need this module.
 *
 * Each enum is exported twice, as a value and as a type alias, so this module is
 * a drop-in replacement: `import { UserRole } from "@/config/prisma-enums"`
 * works in both positions exactly like the Prisma enum it mirrors.
 *
 * Use it in client components and in any shared module they reach. Server-only
 * code (route handlers, server components, server actions, queues) should keep
 * importing enums straight from the package.
 *
 * `satisfies Record<XType, XType>` keeps every mirror exhaustive: a member
 * added, renamed or removed in the schema fails `bun run type-check` here.
 */

export const AIThreadStatus = {
	ACTIVE: "ACTIVE",
	ARCHIVED: "ARCHIVED",
} as const satisfies Record<AIThreadStatusType, AIThreadStatusType>;
export type AIThreadStatus = AIThreadStatusType;

export const AdviceRequestStatus = {
	Created: "Created",
	Approved: "Approved",
	Rejected: "Rejected",
	Executed: "Executed",
	Closed: "Closed",
} as const satisfies Record<AdviceRequestStatusType, AdviceRequestStatusType>;
export type AdviceRequestStatus = AdviceRequestStatusType;

export const ApplauseActivityType = {
	Project: "Project",
	ProjectReport: "ProjectReport",
} as const satisfies Record<ApplauseActivityTypeType, ApplauseActivityTypeType>;
export type ApplauseActivityType = ApplauseActivityTypeType;

export const AuditAction = {
	CREATE: "CREATE",
	UPDATE: "UPDATE",
	UPSERT: "UPSERT",
	DELETE: "DELETE",
	CREATE_MANY: "CREATE_MANY",
	UPDATE_MANY: "UPDATE_MANY",
	DELETE_MANY: "DELETE_MANY",
} as const satisfies Record<AuditActionType, AuditActionType>;
export type AuditAction = AuditActionType;

export const BlogPostStatus = {
	Draft: "Draft",
	Published: "Published",
	Archived: "Archived",
} as const satisfies Record<BlogPostStatusType, BlogPostStatusType>;
export type BlogPostStatus = BlogPostStatusType;

export const ChatRoomKind = {
	Direct: "Direct",
	AdviceRequest: "AdviceRequest",
	VacancyOffer: "VacancyOffer",
	ProjectGroup: "ProjectGroup",
	EventGroup: "EventGroup",
	CourseGroup: "CourseGroup",
} as const satisfies Record<ChatRoomKindType, ChatRoomKindType>;
export type ChatRoomKind = ChatRoomKindType;

export const ChatRoomStatus = {
	Open: "Open",
	Closed: "Closed",
} as const satisfies Record<ChatRoomStatusType, ChatRoomStatusType>;
export type ChatRoomStatus = ChatRoomStatusType;

export const CourseGroupStatus = {
	Draft: "Draft",
	Recruitment: "Recruitment",
	InProgress: "InProgress",
	Finished: "Finished",
	Canceled: "Canceled",
} as const satisfies Record<CourseGroupStatusType, CourseGroupStatusType>;
export type CourseGroupStatus = CourseGroupStatusType;

export const CourseInvoiceStatus = {
	Pending: "Pending",
	Paid: "Paid",
	Canceled: "Canceled",
} as const satisfies Record<CourseInvoiceStatusType, CourseInvoiceStatusType>;
export type CourseInvoiceStatus = CourseInvoiceStatusType;

export const CoursePaymentStatus = {
	Pending: "Pending",
	Paid: "Paid",
	Failed: "Failed",
	Canceled: "Canceled",
} as const satisfies Record<CoursePaymentStatusType, CoursePaymentStatusType>;
export type CoursePaymentStatus = CoursePaymentStatusType;

export const CourseStatus = {
	Draft: "Draft",
	Published: "Published",
	Archived: "Archived",
} as const satisfies Record<CourseStatusType, CourseStatusType>;
export type CourseStatus = CourseStatusType;

export const CourseStudentStatus = {
	Enrolled: "Enrolled",
	Expelled: "Expelled",
	Finished: "Finished",
	Blocked: "Blocked",
} as const satisfies Record<CourseStudentStatusType, CourseStudentStatusType>;
export type CourseStudentStatus = CourseStudentStatusType;

export const Currency = {
	USD: "USD",
	EUR: "EUR",
	XTR: "XTR",
} as const satisfies Record<CurrencyType, CurrencyType>;
export type Currency = CurrencyType;

export const EquityTransactionType = {
	InitialAllocation: "InitialAllocation",
	Vesting: "Vesting",
	Transfer: "Transfer",
	Dilution: "Dilution",
	Increase: "Increase",
} as const satisfies Record<
	EquityTransactionTypeType,
	EquityTransactionTypeType
>;
export type EquityTransactionType = EquityTransactionTypeType;

export const EventFormat = {
	Online: "Online",
	Offline: "Offline",
} as const satisfies Record<EventFormatType, EventFormatType>;
export type EventFormat = EventFormatType;

export const EventMemberStatus = {
	Pending: "Pending",
	Approved: "Approved",
	Rejected: "Rejected",
	Canceled: "Canceled",
} as const satisfies Record<EventMemberStatusType, EventMemberStatusType>;
export type EventMemberStatus = EventMemberStatusType;

export const EventStatus = {
	Draft: "Draft",
	Published: "Published",
	Closed: "Closed",
	Archived: "Archived",
} as const satisfies Record<EventStatusType, EventStatusType>;
export type EventStatus = EventStatusType;

export const EventType = {
	Meetup: "Meetup",
	Workshop: "Workshop",
	GameJam: "GameJam",
	GameLab: "GameLab",
	Conference: "Conference",
} as const satisfies Record<EventTypeType, EventTypeType>;
export type EventType = EventTypeType;

export const InvitationStatus = {
	Pending: "Pending",
	Accepted: "Accepted",
	Declined: "Declined",
	Expired: "Expired",
} as const satisfies Record<InvitationStatusType, InvitationStatusType>;
export type InvitationStatus = InvitationStatusType;

export const Language = {
	ru: "ru",
	en: "en",
} as const satisfies Record<LanguageType, LanguageType>;
export type Language = LanguageType;

export const LectureStage = {
	Requested: "Requested",
	Proposed: "Proposed",
	Actualized: "Actualized",
	Ready: "Ready",
	Held: "Held",
	Canceled: "Canceled",
} as const satisfies Record<LectureStageType, LectureStageType>;
export type LectureStage = LectureStageType;

export const LegalAcceptanceContext = {
	ProjectCreate: "ProjectCreate",
	InviteJoin: "InviteJoin",
	VacancyHire: "VacancyHire",
	MentorJoin: "MentorJoin",
	ShareChange: "ShareChange",
	MemberExclusion: "MemberExclusion",
} as const satisfies Record<
	LegalAcceptanceContextType,
	LegalAcceptanceContextType
>;
export type LegalAcceptanceContext = LegalAcceptanceContextType;

export const LegalActorRole = {
	Author: "Author",
	Member: "Member",
	Mentor: "Mentor",
	Platform: "Platform",
} as const satisfies Record<LegalActorRoleType, LegalActorRoleType>;
export type LegalActorRole = LegalActorRoleType;

export const LegalDocumentCode = {
	CoDevelopmentAgreement: "CoDevelopmentAgreement",
} as const satisfies Record<LegalDocumentCodeType, LegalDocumentCodeType>;
export type LegalDocumentCode = LegalDocumentCodeType;

export const LegalTemplateStatus = {
	Draft: "Draft",
	Published: "Published",
	Archived: "Archived",
} as const satisfies Record<LegalTemplateStatusType, LegalTemplateStatusType>;
export type LegalTemplateStatus = LegalTemplateStatusType;

export const PayableType = {
	VACANCY: "VACANCY",
	EVENT: "EVENT",
	COURSE: "COURSE",
} as const satisfies Record<PayableTypeType, PayableTypeType>;
export type PayableType = PayableTypeType;

export const PaymentProvider = {
	PADDLE: "PADDLE",
} as const satisfies Record<PaymentProviderType, PaymentProviderType>;
export type PaymentProvider = PaymentProviderType;

export const PaymentRateType = {
	Hourly: "Hourly",
	OneTime: "OneTime",
	Monthly: "Monthly",
} as const satisfies Record<PaymentRateTypeType, PaymentRateTypeType>;
export type PaymentRateType = PaymentRateTypeType;

export const PaymentStatus = {
	PENDING: "PENDING",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
	CANCELED: "CANCELED",
	REFUNDED: "REFUNDED",
	PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
	DISPUTED: "DISPUTED",
} as const satisfies Record<PaymentStatusType, PaymentStatusType>;
export type PaymentStatus = PaymentStatusType;

export const PrimaryInterest = {
	Specialist: "Specialist",
	Author: "Author",
	Mentor: "Mentor",
} as const satisfies Record<PrimaryInterestType, PrimaryInterestType>;
export type PrimaryInterest = PrimaryInterestType;

export const ProjectLegalEventType = {
	ProjectCreated: "ProjectCreated",
	AgreementAccepted: "AgreementAccepted",
	MemberJoined: "MemberJoined",
	MentorJoined: "MentorJoined",
	ShareChanged: "ShareChanged",
	MemberExcluded: "MemberExcluded",
	MemberLeft: "MemberLeft",
	AgreementUpdated: "AgreementUpdated",
} as const satisfies Record<
	ProjectLegalEventTypeType,
	ProjectLegalEventTypeType
>;
export type ProjectLegalEventType = ProjectLegalEventTypeType;

export const ProjectLegalSnapshotStatus = {
	Active: "Active",
	Superseded: "Superseded",
	Void: "Void",
} as const satisfies Record<
	ProjectLegalSnapshotStatusType,
	ProjectLegalSnapshotStatusType
>;
export type ProjectLegalSnapshotStatus = ProjectLegalSnapshotStatusType;

export const ProjectStatus = {
	Registered: "Registered",
	Approved: "Approved",
	Rejected: "Rejected",
	Dormant: "Dormant",
	Archived: "Archived",
	Released: "Released",
	KilledWithDignity: "KilledWithDignity",
} as const satisfies Record<ProjectStatusType, ProjectStatusType>;
export type ProjectStatus = ProjectStatusType;

export const QueueJobStatus = {
	Completed: "Completed",
	Failed: "Failed",
} as const satisfies Record<QueueJobStatusType, QueueJobStatusType>;
export type QueueJobStatus = QueueJobStatusType;

export const QueueJobType = {
	Broker: "Broker",
	Cron: "Cron",
} as const satisfies Record<QueueJobTypeType, QueueJobTypeType>;
export type QueueJobType = QueueJobTypeType;

export const SkillLevel = {
	Novice: "Novice",
	Beginner: "Beginner",
	Skillful: "Skillful",
	Experienced: "Experienced",
	Expert: "Expert",
} as const satisfies Record<SkillLevelType, SkillLevelType>;
export type SkillLevel = SkillLevelType;

export const SubscriptionStatus = {
	Active: "Active",
	Paused: "Paused",
	Canceled: "Canceled",
} as const satisfies Record<SubscriptionStatusType, SubscriptionStatusType>;
export type SubscriptionStatus = SubscriptionStatusType;

export const TeamDocumentType = {
	JDA: "JDA",
	Concept: "Concept",
	GDD: "GDD",
	NDA: "NDA",
	Other: "Other",
} as const satisfies Record<TeamDocumentTypeType, TeamDocumentTypeType>;
export type TeamDocumentType = TeamDocumentTypeType;

export const TeamMemberStatus = {
	Applicant: "Applicant",
	Hired: "Hired",
	Rejected: "Rejected",
	Fired: "Fired",
	Founder: "Founder",
} as const satisfies Record<TeamMemberStatusType, TeamMemberStatusType>;
export type TeamMemberStatus = TeamMemberStatusType;

export const TeamVacancyStatus = {
	Draft: "Draft",
	Published: "Published",
	Closed: "Closed",
} as const satisfies Record<TeamVacancyStatusType, TeamVacancyStatusType>;
export type TeamVacancyStatus = TeamVacancyStatusType;

export const UserRole = {
	Guest: "Guest",
	Member: "Member",
	Author: "Author",
	Mentor: "Mentor",
	Admin: "Admin",
} as const satisfies Record<UserRoleType, UserRoleType>;
export type UserRole = UserRoleType;
