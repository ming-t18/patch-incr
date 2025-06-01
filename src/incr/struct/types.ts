export type TupleOrRecord<T = unknown> = Record<string, unknown> | T[];

export type InferRecordInput<Entries extends TupleOrRecord> = {
	[key in keyof Entries]: Entries[key] extends {
		// biome-ignore lint/suspicious/noExplicitAny: used in infer
		invoke: (arg: infer Input) => any;
	}
		? Input
		: never;
}[keyof Entries];

export type InferRecordOutput<Entries extends TupleOrRecord> = {
	[key in keyof Entries]: Entries[key] extends {
		// biome-ignore lint/suspicious/noExplicitAny: used in infer
		invoke: (...args: any[]) => infer Output;
	}
		? Output
		: Entries[key];
};
