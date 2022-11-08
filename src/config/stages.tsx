import { Button } from 'antd'
import Link from 'next/link'

export const stagesConfig: { [key: string]: any } = {
	Searching: {
		title: 'Этап исследования',
		description: (
			<p>
				На данном этапе потенциальные авторы игровых проектов исследуют тренды, генерируют идеи, анализируют
				существующие игры. Лучшие свои идеи игр они регистрируют нажав кнопку &quot;Добавить идею игры&quot;
			</p>
		),
		materials: (
			<p>
				Полезный материал:{' '}
				<Link className="text-link" href="/hub/docs/work-with-ideas" target="_blank">
					Работа с идеями
				</Link>
			</p>
		),
		actions: [<Button key="add-game-idea">Добавить идею игры</Button>],
	},
	'Pre-production': {
		title: 'Этап подготовки проекта',
	},
	Recruiting: {
		title: 'Этап набора начальной команды',
	},
	Production: {
		title: 'Этап разработки проекта',
	},
	Pitching: {
		title: 'Питчи проектов',
	},
	Planning: {
		title: 'Планируется',
	},
	Done: {
		title: 'Завершен',
	},
}
