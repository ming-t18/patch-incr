export interface PathTracker<T = unknown> {
	_path: unknown[];
	_target?: T;
}

export type OnGetSymbol = (
	target: unknown,
	key: symbol,
) =>
	| { type: "value"; result: unknown }
	| { type: "callable"; invoke: (...args: unknown[]) => unknown };
