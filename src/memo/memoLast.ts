import {
	type IFRO,
	type ReplaceOnly,
	getReplaceOnly,
	isReplaceOnly,
	makeReplaceOnly,
} from "./replaceOnly";

export const atomicMemoLast = <X, Y>(f: (value: X) => Y): IFRO<X, Y> => {
	let memo: { input: X; output: Y } | null = null;
	const invoke = (x: X): Y => {
		if (memo !== null && Object.is(x, memo.input)) {
			return memo.output;
		}
		const output = f(x);
		memo = { input: x, output };
		return output;
	};
	return {
		invoke,
		forward: (
			_x: X,
			dx: ReplaceOnly<X> | null,
			_y: Y,
		): ReplaceOnly<Y> | null => {
			if (dx === null) {
				return null;
			}
			if (isReplaceOnly(dx)) {
				return makeReplaceOnly(invoke(getReplaceOnly(dx)));
			}
			throw new Error("not reachable");
		},
	};
};
