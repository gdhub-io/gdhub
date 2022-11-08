export const hasRole = (roleName: string, { data }: any) => {
	if (!data) {
		return false
	}

	const role = data.user.roles.find((role: string) => role === roleName.toLowerCase())

	return role ? true : false
}
