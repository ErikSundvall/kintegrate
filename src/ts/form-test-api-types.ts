export interface FillFieldOptions {
	multiIndex?: number;
	searchWithinContainerTag?: string;
	containerMultiIndex?: number;
}

export interface VisibilityOptions {
	searchWithinContainerTag?: string;
	containerMultiIndex?: number;
}

export interface GetFieldValueOptions extends VisibilityOptions {
	multiIndex?: number;
	simpleValue?: boolean;
}

export interface FormTestApi {
	setFieldValue(
		path: string,
		value: unknown,
		multiIndex?: number,
		searchWithinContainerTag?: string,
		containerMultiIndex?: number
	): void;
	getFieldValue(
		path: string,
		multiIndex?: number,
		searchWithinContainerTag?: string,
		containerMultiIndex?: number,
		simpleValue?: boolean
	): unknown;
	isHidden(path: string, searchWithinContainerTag?: string, containerMultiIndex?: number): boolean | null;
	isReady(): boolean;
	resetForm(): void;
}