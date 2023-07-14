import { UserRole } from '@prisma/client'

export const hasRole = (role: UserRole, { data }: any) => {
	if (!data) {
		return false
	}

	const findRole = data.user.roles.find((role: UserRole) => role === role)

	return findRole ? true : false
}
