"use client";

import type { Profile, User } from "@gdhub-io/gdhub-prisma";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback } from "react";

const ConnectProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/ConnectProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const GeneralProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/GeneralProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const InterestsProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/InterestsProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const MentorshipProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/MentorshipProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const ResourcesProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/ResourcesProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const SpecialitiesProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/SpecialitiesProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const DangerProfileForm = dynamic(
	() =>
		import("@/components/profile-forms/DangerProfileForm").then(
			(m) => m.default,
		),
	{ ssr: false },
);
const PaymentsList = dynamic(
	() => import("@/components/PaymentsList").then((m) => m.default),
	{ ssr: false },
);

export function SettingsItemClient() {
	const params = useParams<{ item?: string }>();
	const currentItem = params?.item || "general";
	const queryClient = useQueryClient();
	const { data: session } = useSession();

	const { data: profile } = useQuery({
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

	// Payments don't depend on the profile payload — render before the guard.
	if (currentItem === "payments") return <PaymentsList />;

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
		case "danger":
			return <DangerProfileForm />;
		default:
			return (
				<GeneralProfileForm profile={profile.data} saveProfile={saveProfile} />
			);
	}
}
