export type CategoryKey = 'logic' | 'calc' | 'validation' | 'ranges' | 'required';

export interface FieldEntry {
	tag: string | null;
	path: string | null;
	structuralPath: string | null;
}

export interface RuleEntry {
	id?: string;
	type?: CategoryKey;
	identifier?: string | null;
	triggerValue?: unknown;
	targetIdentifier?: string | null;
	targetPath?: string | null;
	showValue?: unknown;
	hideValue?: unknown;
	key?: string;
	index?: string | number;
	triggerTag?: string | null;
	triggerPath?: string | null;
	targetTag?: string | null;
	actionName?: string | null;
	description?: string;
	field?: string | null;
	fieldPath?: string | null;
	suffix?: string | null;
	rmType?: string | null;
	unit?: string | null;
	min?: number | null;
	max?: number | null;
	minOp?: string | null;
	maxOp?: string | null;
	expression?: string;
}

export interface ParsedForm {
	name: string;
	dependencies: RuleEntry[];
	validations: RuleEntry[];
	valueRanges: RuleEntry[];
	requiredFields: RuleEntry[];
	calculations: RuleEntry[];
	fields?: Set<string>;
	fieldIndex?: Map<string, string[]>;
}

export interface ScopeLevels {
	top: string;
	mid: string;
	leaf: string;
}

export interface SerializedTest {
	title: string;
	callType: string;
	actions: string[];
	body?: string;
}

export interface GeneratedGroup {
	name: string;
	tests: SerializedTest[];
	extrasText?: string;
}
