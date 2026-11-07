"use client";

import type { Profile, User } from "@gdhub-io/gdhub-prisma";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import axios from "axios";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect } from "react";
import { LoadError, PageLoading } from "@/components/ui";
import {
	FormSkeleton,
	type FormSkeletonProps,
} from "@/components/ui/FormSkeleton";

const SKELETONS: Record<string, FormSkeletonProps> = {
	general: { fields: 7 },
	specialities: { fields: 3 },
	mentorship: { fields: 3, textarea: true },
	resources: { fields: 4, textarea: true },
	connections: { fields: 2 },
	interests: { fields: 5, textarea: true },
};

// Shared by `dynamic()` and the mount effect, so a form's chunk downloads alongside the profile query.
const FORM_IMPORTS = {
	general: () => import("@/components/profile-forms/GeneralProfileForm"),
	specialities: () =>
		import("@/components/profile-forms/SpecialitiesProfileForm"),
	mentorship: () => import("@/components/profile-forms/MentorshipProfileForm"),
	resources: () => import("@/components/profile-forms/ResourcesProfileForm"),
	connections: () => import("@/components/profile-forms/ConnectProfileForm"),
	interests: () => import("@/components/profile-forms/InterestsProfileForm"),
};

const ConnectProfileForm = dynamic(
	() => FORM_IMPORTS.connections().then((m) => m.default),
	{ ssr: false, loading: () => <FormSkeleton {...SKELETONS.connections} /> },
);
const GeneralProfileForm = dynamic(
	() => FORM_IMPORTS.general().then((m) => m.default),
	{ ssr: false, loading: () => <FormSkeleton {...SKELETONS.general} /> },
);
const InterestsProfileForm = dynamic(
	() => FORM_IMPORTS.interests().then((m) => m.default),
	{ ssr: false, loading: () => <FormSkeleton {...SKELETONS.interests} /> },
);
const MentorshipProfileForm = dynamic(
	() => FORM_IMPORTS.mentorship().then((m) => m.default),
	{ ssr: false, loading: () => <FormSkeleton {...SKELETONS.mentorship} /> },
);
const ResourcesProfileForm = dynamic(
	() => FORM_IMPORTS.resources().then((m) => m.default),
	{ ssr: false, loading: () => <FormSkeleton {...SKELETONS.resources} /> },
);
const SpecialitiesProfileForm = dynamic(
	() => FORM_IMPORTS.specialities().then((m) => m.default),
	{ ssr: false, loading: () => <FormSkeleton {...SKELETONS.specialities} /> },
);
const DangerProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/DangerProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false, loading: () => <PageLoading /> },
);
const MyDocuments = dynamic(
	() => import("@/components/legal/MyDocuments").then((m) => m.MyDocuments),
	{ ssr: false, loading: () => <PageLoading /> },
);
const PaymentsList = dynamic(
	() => import("@/components/PaymentsList").then((m) => m.default),
	{ ssr: false, loading: () => <PageLoading /> },
);

export function SettingsItemClient() {
	const params = useParams<{ item?: string }>();
	const currentItem = params?.item || "general";
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const { data: session } = useSession();

	useEffect(() => {
		const imports: Record<string, () => unknown> = FORM_IMPORTS;
		if (Object.hasOwn(imports, currentItem)) imports[currentItem]();
	}, [currentItem]);

	const {
		data: profile,
		isPending,
		isLoadingError,
		refetch,
	} = useQuery({
		queryKey: ["profile-setting", session?.user.id],
		queryFn: () =>
			axios.get<Profile & { user: Partial<User> }>("/api/user/profile"),
		enabled: !!session?.user,
	});

	const { mutateAsync: saveProfileMutate } = useMutation({
		mutationFn: (variables: any) =>
			axios.put<void>("/api/user/profile", variables),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
	});

	const saveProfile = useCallback(
		async (variables: any) => {
			await saveProfileMutate(variables);
		},
		[saveProfileMutate],
	);

	// These sections don't depend on the profile payload — render before the guard.
	if (currentItem === "payments") return <PaymentsList />;
	if (currentItem === "documents") return <MyDocuments />;
	if (currentItem === "danger") return <DangerProfileForm />;

	// Saving an unloaded form would overwrite the profile with blanks.
	if (isLoadingError) {
		return (
			<LoadError
				title={t(
					"profile.settings.load-error",
					"Your profile could not be loaded",
				)}
				onRetry={refetch}
			/>
		);
	}

	if (isPending) {
		return <FormSkeleton {...(SKELETONS[currentItem] ?? SKELETONS.general)} />;
	}
	if (!profile?.data) return null;

	switch (currentItem) {
		case "specialities":
			return <SpecialitiesProfileForm profile={profile.data} />;
		case "mentorship":
			return (
				<MentorshipProfileForm
					profile={profile.data}
					onUpdate={async () => {
						await queryClient.invalidateQueries({ queryKey: ["profile"] });
					}}
				/>
			);
		case "resources":
			return (
				<ResourcesProfileForm
					profile={profile.data}
					saveProfile={saveProfile}
				/>
			);
		case "connections":
			return (
				<ConnectProfileForm profile={profile.data} saveProfile={saveProfile} />
			);
		case "interests":
			return (
				<InterestsProfileForm
					profile={profile.data}
					saveProfile={saveProfile}
				/>
			);
		default:
			return (
				<GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />
			);
	}
}
