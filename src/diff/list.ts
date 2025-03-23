export interface Splice<T> {
	deleteRange: [number, number];
	insert: T[];
}

const EMPTY: Splice<never> = {
	deleteRange: [0, 0],
	insert: [],
};

export const findFirstSplice = <T>(xs: T[], ys: T[]): Splice<T> => {
	if (xs.length === 0) {
		if (ys.length === 0) {
			return EMPTY;
		}
	}
	const n = xs.length < ys.length ? xs.length : ys.length;
	let i = 0;
	for (; i < n; i++) {
		if (Object.is(xs[i], ys[i])) {
			continue;
		}
		break;
	}

	let j = xs.length;
	let k = ys.length;
	for (; j >= i && k >= i; j--, k--) {
		if (Object.is(xs[k], ys[j])) {
			continue;
		}
		break;
	}

	return {
		deleteRange: [i, j],
		insert: ys.slice(j),
	};
};
