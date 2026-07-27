import { DEFAULT_DEPTH } from "./genUtils";
import type { ArbChangeConfig } from "./types";

export const isLeaf = <T>(opts?: ArbChangeConfig<T> | undefined) => {
	if (typeof opts?.depth === "number" && opts.depth <= 0) {
		return true;
	}
	return;
};

/** Given an `ArbChangeConfig` of a parent, returns an `ArbChangeConfig` for its child. */
export const diveArbChangeConfig = <A, B>(
	func: (input: A) => B,
	opts: ArbChangeConfig<A>,
): ArbChangeConfig<B> => {
	const { value: _, depth, ...rest } = opts;
	return opts
		? {
				...rest,
				...(opts && Object.hasOwn(opts, "value")
					? { value: func(opts.value as A) }
					: {}),
				depth: depth - 1,
			}
		: { depth: DEFAULT_DEPTH - 1 };
};

export { DEFAULT_DEPTH } from "./genUtils";
