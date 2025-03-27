export const getProjectByIdForUser = async (
	projectId: string,
	userId: string
): Promise<{ id: string; isProjectAuthor: boolean } | null> => {
	// В реальном приложении здесь был бы запрос к базе данных
	// Для демонстрационных целей просто возвращаем мок-объект
	return {
		id: projectId,
		isProjectAuthor: true, // Предполагаем, что пользователь является автором проекта
	}
}
