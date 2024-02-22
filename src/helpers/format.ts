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

export function formatNestedJson(obj: any, parentKey = '', output = '') {
	if (Array.isArray(obj)) {
		// Обработка массива
		obj.forEach((item, index) => {
			const key = `${parentKey}[${index}]`
			if (typeof item === 'object' && item !== null && item instanceof Date === false) {
				// Рекурсивный вызов для объектов внутри массива
				output = formatNestedJson(item, key, output)
			} else {
				// Вывод простых значений в массиве
				// console.log(`${key}: ${item}`)
				if (item instanceof Date) {
					item = item.toISOString()
				}

				output += `${key}: ${item}\n`
			}
		})
	} else {
		// Обработка объекта
		Object.entries(obj).forEach(([key, value]) => {
			// Формируем полный ключ для вложенных объектов или массивов
			const fullKey = parentKey ? `${parentKey}.${key}` : key

			if (typeof value === 'object' && value !== null && value instanceof Date === false) {
				// Рекурсивный вызов для объектов и массивов
				output = formatNestedJson(value, fullKey, output)
			} else {
				// Вывод простых значений
				// console.log(`${fullKey}: ${value}`)
				if (value instanceof Date) {
					value = value.toISOString()
				}

				output += `${fullKey}: ${value}\n`
			}
		})
	}

	return output
}
