export const lectureStatusAsText = (status: LectureStatus) => {
	switch (status) {
		case 'Requested':
			return 'Запрос на лекцию'
		case 'Proposed':
			return 'Предложение лекции'
		case 'Actualized':
			return 'Скоро анонс'
		case 'Ready':
			return 'Идет регистрация'
		case 'Canceled':
			return 'Отменена'
		case 'Held':
			return 'Проведена'
	}
}

export const isValidJSON = (text: any) => {
	if (typeof text !== 'string') {
		return false
	}
	try {
		JSON.parse(text)
		return true
	} catch (error) {
		return false
	}
}
