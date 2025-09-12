import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

export const useCurrentProject = () => {
	const router = useRouter()
	const { slug } = router.query
	const { data: session } = useSession()

	const {
		data: project,
		refetch,
		isLoading,
		isFetched,
	} = useQuery({
		queryKey: ['project-data', slug, session?.user.id],
		queryFn: () => axios.get<prismaClient.Project>('/api/user/project', { params: { slug } }),
		enabled: !!slug,
		refetchOnWindowFocus: false,
	})

	return { project: project?.data, refetch, isLoading, isFetched }
}
