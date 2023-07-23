import { UserRole } from '@prisma/client'

export const hasRole = (role: UserRole, { data }: any) => {
	if (!data) {
		return false
	}

	const findRole = data.user.roles.find((r: UserRole) => r === role)

	return findRole ? true : false
}
