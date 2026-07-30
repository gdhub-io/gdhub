import type { UserRole } from "@gdhub-io/gdhub-prisma";

export const hasRole = (role: UserRole, { data }: any) => {
	if (!data) {
		return false;
	}

	const findRole = data.user.roles.find((r: UserRole) => r === role);

	return findRole ? true : false;
};
