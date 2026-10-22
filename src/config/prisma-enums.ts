import type {
	AdviceRequestStatus as AdviceRequestStatusType,
	AdvisorAvailabilityStatus as AdvisorAvailabilityStatusType,
	AIThreadStatus as AIThreadStatusType,
	ApplauseActivityType as ApplauseActivityTypeType,
	ArtifactCheckStatus as ArtifactCheckStatusType,
	AuditAction as AuditActionType,
	BlogPostStatus as BlogPostStatusType,
	CertificateSource as CertificateSourceType,
	ChatRoomKind as ChatRoomKindType,
	ChatRoomStatus as ChatRoomStatusType,
	CheckpointCuratorKind as CheckpointCuratorKindType,
	CheckpointFeeReason as CheckpointFeeReasonType,
	CheckpointItemKind as CheckpointItemKindType,
	CheckpointSessionContentStatus as CheckpointSessionContentStatusType,
	CheckpointStatus as CheckpointStatusType,
	CheckpointVerdict as CheckpointVerdictType,
	ContentViewSubject as ContentViewSubjectType,
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
	ExpertInvoicing as ExpertInvoicingType,
	InvitationStatus as InvitationStatusType,
	Language as LanguageType,
	PayableType as PayableTypeType,
	PaymentProvider as PaymentProviderType,
	PaymentRateType as PaymentRateTypeType,
	PaymentStatus as PaymentStatusType,
	PrimaryInterest as PrimaryInterestType,
	ProjectArtifactType as ProjectArtifactTypeType,
	ProjectStatus as ProjectStatusType,
	QueueJobStatus as QueueJobStatusType,
	QueueJobType as QueueJobTypeType,
	ScoutType as ScoutTypeType,
	SkillLevel as SkillLevelType,
	SpaceRole as SpaceRoleType,
	SubscriptionStatus as SubscriptionStatusType,
	TeamMemberStatus as TeamMemberStatusType,
	TeamVacancyStatus as TeamVacancyStatusType,
	UserRole as UserRoleType,
	WaitlistFeature as WaitlistFeatureType,
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
	ACCESS_DENIED: "ACCESS_DENIED",
	ACCESS_OVERRIDE: "ACCESS_OVERRIDE",
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
	Checkpoint: "Checkpoint",
} as const satisfies Record<ChatRoomKindType, ChatRoomKindType>;
export type ChatRoomKind = ChatRoomKindType;

export const CertificateSource = {
	Event: "Event",
	Course: "Course",
	Checkpoint: "Checkpoint",
} as const satisfies Record<CertificateSourceType, CertificateSourceType>;
export type CertificateSource = CertificateSourceType;

export const ChatRoomStatus = {
	Open: "Open",
	Closed: "Closed",
} as const satisfies Record<ChatRoomStatusType, ChatRoomStatusType>;
export type ChatRoomStatus = ChatRoomStatusType;

export const ArtifactCheckStatus = {
	Pending: "Pending",
	Readable: "Readable",
	Unreachable: "Unreachable",
	Unsupported: "Unsupported",
} as const satisfies Record<ArtifactCheckStatusType, ArtifactCheckStatusType>;
export type ArtifactCheckStatus = ArtifactCheckStatusType;

export const CheckpointCuratorKind = {
	AI: "AI",
	Human: "Human",
} as const satisfies Record<
	CheckpointCuratorKindType,
	CheckpointCuratorKindType
>;
export type CheckpointCuratorKind = CheckpointCuratorKindType;

export const CheckpointFeeReason = {
	Full: "Full",
	RefundReduced: "RefundReduced",
	Replacement: "Replacement",
} as const satisfies Record<CheckpointFeeReasonType, CheckpointFeeReasonType>;
export type CheckpointFeeReason = CheckpointFeeReasonType;

export const CheckpointItemKind = {
	Input: "Input",
	Outcome: "Outcome",
} as const satisfies Record<CheckpointItemKindType, CheckpointItemKindType>;
export type CheckpointItemKind = CheckpointItemKindType;

export const CheckpointStatus = {
	Draft: "Draft",
	AwaitingCurator: "AwaitingCurator",
	Active: "Active",
	Review: "Review",
	Closed: "Closed",
	Cancelled: "Cancelled",
} as const satisfies Record<CheckpointStatusType, CheckpointStatusType>;
export type CheckpointStatus = CheckpointStatusType;

export const CheckpointVerdict = {
	StageClosed: "StageClosed",
	GoalMet: "GoalMet",
	GoalMissed: "GoalMissed",
} as const satisfies Record<CheckpointVerdictType, CheckpointVerdictType>;
export type CheckpointVerdict = CheckpointVerdictType;

export const AdvisorAvailabilityStatus = {
	Open: "Open",
	ConsultationsOnly: "ConsultationsOnly",
	Away: "Away",
} as const satisfies Record<
	AdvisorAvailabilityStatusType,
	AdvisorAvailabilityStatusType
>;
export type AdvisorAvailabilityStatus = AdvisorAvailabilityStatusType;

export const CheckpointSessionContentStatus = {
	Pending: "Pending",
	Ready: "Ready",
} as const satisfies Record<
	CheckpointSessionContentStatusType,
	CheckpointSessionContentStatusType
>;
export type CheckpointSessionContentStatus = CheckpointSessionContentStatusType;

export const ContentViewSubject = {
	ProjectReport: "ProjectReport",
	BlogPost: "BlogPost",
	CoursePage: "CoursePage",
	EventPage: "EventPage",
	ExpertPage: "ExpertPage",
	ScoutPage: "ScoutPage",
	VacancyPage: "VacancyPage",
	ProjectPage: "ProjectPage",
} as const satisfies Record<ContentViewSubjectType, ContentViewSubjectType>;
export type ContentViewSubject = ContentViewSubjectType;

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

export const ExpertInvoicing = {
	SelfEmployed: "SelfEmployed",
	Company: "Company",
	SelfBilling: "SelfBilling",
} as const satisfies Record<ExpertInvoicingType, ExpertInvoicingType>;
export type ExpertInvoicing = ExpertInvoicingType;

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

export const PayableType = {
	VACANCY: "VACANCY",
	EVENT: "EVENT",
	COURSE: "COURSE",
	CHECKPOINT: "CHECKPOINT",
} as const satisfies Record<PayableTypeType, PayableTypeType>;
export type PayableType = PayableTypeType;

export const PaymentProvider = {
	PADDLE: "PADDLE",
	STRIPE: "STRIPE",
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
	Scout: "Scout",
} as const satisfies Record<PrimaryInterestType, PrimaryInterestType>;
export type PrimaryInterest = PrimaryInterestType;

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

export const ScoutType = {
	Angel: "Angel",
	Fund: "Fund",
	Publisher: "Publisher",
	Studio: "Studio",
	Other: "Other",
} as const satisfies Record<ScoutTypeType, ScoutTypeType>;
export type ScoutType = ScoutTypeType;

export const SkillLevel = {
	Novice: "Novice",
	Beginner: "Beginner",
	Skillful: "Skillful",
	Experienced: "Experienced",
	Expert: "Expert",
} as const satisfies Record<SkillLevelType, SkillLevelType>;
export type SkillLevel = SkillLevelType;

export const SpaceRole = {
	Owner: "Owner",
	Admin: "Admin",
	Member: "Member",
	Guest: "Guest",
} as const satisfies Record<SpaceRoleType, SpaceRoleType>;
export type SpaceRole = SpaceRoleType;

export const SubscriptionStatus = {
	Active: "Active",
	Paused: "Paused",
	Canceled: "Canceled",
} as const satisfies Record<SubscriptionStatusType, SubscriptionStatusType>;
export type SubscriptionStatus = SubscriptionStatusType;

export const ProjectArtifactType = {
	JDA: "JDA",
	Concept: "Concept",
	GDD: "GDD",
	NDA: "NDA",
	Art: "Art",
	GameplayVideo: "GameplayVideo",
	PrototypeVideo: "PrototypeVideo",
	ExecutableBuild: "ExecutableBuild",
	Other: "Other",
} as const satisfies Record<ProjectArtifactTypeType, ProjectArtifactTypeType>;
export type ProjectArtifactType = ProjectArtifactTypeType;

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

export const WaitlistFeature = {
	ExpertCheckpoint: "ExpertCheckpoint",
} as const satisfies Record<WaitlistFeatureType, WaitlistFeatureType>;
export type WaitlistFeature = WaitlistFeatureType;
