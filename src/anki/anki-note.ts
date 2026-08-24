export interface AnkiNote {
	noteId: number;

	fields: {
		Front: {
			value: string;
			order: number;
		};

		Back: {
			value: string;
			order: number;
		};
	};

	tags: string[];
}
