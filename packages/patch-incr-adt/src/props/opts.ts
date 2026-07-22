import type { ArbChangeConfig } from "./types";

/** Given an `ArbChangeConfig` of a parent, returns an `ArbChangeConfig` for its child. */
export const diveArbChangeConfig = <A, B>(
	func: (input: A) => B,
	opts?: ArbChangeConfig<A> | undefined,
): ArbChangeConfig<B> => {
	if (!opts) {
		return { depth: DEFAULT_DEPTH };
	}
	const { value: _, ...rest } = opts;
	return opts
		? {
				...rest,
				...(opts && Object.hasOwn(opts, "value")
					? { value: func(opts.value as A) }
					: {}),
				depth: rest.depth ?? DEFAULT_DEPTH ?? -1,
			}
		: {};
};

export const DEFAULT_DEPTH = 8;
