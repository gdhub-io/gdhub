import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	buildProjectLegalSnapshotMarkdown,
	type ProjectLegalSnapshotInput,
} from "@/helpers/legal/projectLegalSnapshot";
import { prisma } from "@/services/prisma";

const agreementPath = path.join(
	process.cwd(),
	"docs",
	"co-development-agreement.md",
);

const buildChecksum = (value: string) =>
	createHash("sha256").update(value).digest("hex");

const loadAgreementTemplate = async () => {
	return readFile(agreementPath, "utf8");
};

const ensureLegalTemplate = async (contentMarkdown: string) => {
	const contentChecksum = buildChecksum(contentMarkdown);
	const latestTemplate = await prisma.legalDocumentTemplate.findFirst({
		where: {
			code: prismaClient.LegalDocumentCode.CoDevelopmentAgreement,
			locale: prismaClient.Language.ru,
		},
		orderBy: { version: "desc" },
	});

	if (latestTemplate && latestTemplate.contentChecksum === contentChecksum) {
		if (latestTemplate.status !== prismaClient.LegalTemplateStatus.Published) {
			return prisma.legalDocumentTemplate.update({
				where: { id: latestTemplate.id },
				data: {
					status: prismaClient.LegalTemplateStatus.Published,
					publishedAt: latestTemplate.publishedAt || new Date(),
				},
			});
		}

		return latestTemplate;
	}

	return prisma.legalDocumentTemplate.create({
		data: {
			code: prismaClient.LegalDocumentCode.CoDevelopmentAgreement,
			version: (latestTemplate?.version || 0) + 1,
			locale: prismaClient.Language.ru,
			title: "Co-development agreement",
			status: prismaClient.LegalTemplateStatus.Published,
			contentMarkdown,
			contentChecksum,
			publishedAt: new Date(),
		},
	});
};

type PersistProjectLegalSnapshotInput = {
	projectId: string;
	projectName: string;
	projectSlug?: string | null;
	authorName?: string | null;
	agreementDate?: string | Date | null;
	mentorFundShare?: number | null;
	platformShare?: number | null;
	damageCompensationEnabled?: boolean | null;
	damageCompensationAmount?: number | null;
	damageCompensationCurrency?: string | null;
	createdById: string;
	eventType: "ProjectCreated" | "AgreementUpdated";
	payload?: Record<string, unknown>;
};

export const persistProjectLegalSnapshot = async (
	input: PersistProjectLegalSnapshotInput,
) => {
	const contentMarkdown = await loadAgreementTemplate();
	const template = await ensureLegalTemplate(contentMarkdown);
	const params: ProjectLegalSnapshotInput = {
		projectName: input.projectName,
		projectId: input.projectId,
		projectSlug: input.projectSlug,
		authorName: input.authorName,
		agreementDate: input.agreementDate,
		mentorFundShare: input.mentorFundShare,
		platformShare: input.platformShare,
		damageCompensationEnabled: input.damageCompensationEnabled ?? undefined,
		damageCompensationAmount: input.damageCompensationAmount,
		damageCompensationCurrency: input.damageCompensationCurrency,
	};
	const renderedMarkdown = buildProjectLegalSnapshotMarkdown(
		contentMarkdown,
		params,
	);
	const renderedChecksum = buildChecksum(renderedMarkdown);

	const activeSnapshot = await prisma.projectLegalSnapshot.findFirst({
		where: {
			projectId: input.projectId,
			status: prismaClient.ProjectLegalSnapshotStatus.Active,
		},
		orderBy: { createdAt: "desc" },
	});

	if (activeSnapshot?.renderedChecksum === renderedChecksum) {
		return activeSnapshot;
	}

	return prisma.$transaction(async (tx) => {
		if (activeSnapshot) {
			await tx.projectLegalSnapshot.update({
				where: { id: activeSnapshot.id },
				data: {
					status: prismaClient.ProjectLegalSnapshotStatus.Superseded,
					supersededAt: new Date(),
				},
			});
		}

		const snapshot = await tx.projectLegalSnapshot.create({
			data: {
				projectId: input.projectId,
				templateId: template.id,
				templateVersion: template.version,
				status: prismaClient.ProjectLegalSnapshotStatus.Active,
				title: template.title,
				renderedMarkdown,
				renderedChecksum,
				params,
				createdById: input.createdById,
			},
		});

		await tx.project.update({
			where: { id: input.projectId },
			data: { activeLegalSnapshotId: snapshot.id },
		});

		await tx.projectLegalEvent.create({
			data: {
				projectId: input.projectId,
				snapshotId: snapshot.id,
				type: input.eventType,
				payload: input.payload,
				actorUserId: input.createdById,
			},
		});

		return snapshot;
	});
};
