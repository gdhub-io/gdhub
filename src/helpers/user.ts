import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'

export const hasRole = (role: prismaClient.UserRole, { data }: any) => {
	if (!data) {
		return false
	}

	const findRole = data.user.roles.find((r: prismaClient.UserRole) => r === role)

	return findRole ? true : false
}
