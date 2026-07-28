import type { $A, IFA } from "@/types";

export const fixA = <A extends $A, B extends $A>(
	getFunc: (inner: IFA<A, B>) => IFA<A, B>,
): IFA<A, B> => {
	let _cached: IFA<A, B>;
	const rec = {
		get func() {
			if (!_cached) {
				_cached = getFunc(rec.func);
			}
			return _cached;
		},
	};
	return rec.func;
};
