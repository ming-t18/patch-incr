export type TrackedPath = unknown[];

export interface PathTracker<T = unknown> {
	_path: TrackedPath;
	_target?: T;
}
export type OnGetSymbolReturn =
	| { type: "value"; result: unknown }
	| { type: "callable"; invoke: (...args: unknown[]) => unknown };

export type OnGetSymbol<T = unknown> = (
	target: PathTracker<T>,
	key: symbol,
) => OnGetSymbolReturn;

export type OnApplyReturn =
	| { type: "value"; result: unknown }
	| { type: "path"; result: TrackedPath }
	| undefined;

export type OnApply<T = unknown> = (
	target: PathTracker<T>,
	path: TrackedPath,
	func: string,
	args: unknown[],
) => OnApplyReturn;

export interface TrackedParams<T = unknown> {
	onGetSymbol?: OnGetSymbol<T>;
	onApply?: OnApply<T>;
}
