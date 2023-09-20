import { TeamVacancyStatus } from '@prisma/client'

export const vacancyStatusToText = (status: TeamVacancyStatus) => {
	switch (status) {
		case TeamVacancyStatus.Draft:
			return 'Черновик'
		case TeamVacancyStatus.Published:
			return 'Размещена'
		case TeamVacancyStatus.Closed:
			return 'Закрыта'
	}
}
