import { castOutput, identity as id } from "@/builder";
import * as Arr from "@/builder/array";
import { composeMemo } from "@/builder/compose";
import * as Option from "@/builder/option";
import { tupleFor } from "@/builder/struct";
import type { IIso } from "@/iso/types";
import type { IF } from "@/types";
import {
	type ILens,
	type IOptics,
	type IPrism,
	type ISetter,
	type ITraversal,
	OpticsKind,
} from "./types";

export const identity = <T>(): ILens<T, T> => ({
	kind: OpticsKind.Lens,
	get: id(),
	set: (f) => f,
});

export const toPrism = <T, A>(o1: ILens<T, A> | IPrism<T, A>): IPrism<T, A> => {
	if (o1.kind === OpticsKind.Prism) {
		return o1;
	}
	if (o1.kind === OpticsKind.Lens) {
		return {
			kind: OpticsKind.Prism,
			getOpt: castOutput(tupleFor<T>()(o1.get)),
			set: o1.set,
		};
	}
	throw new Error("toPrism: not allowed");
};

export const toTraversal = <T, A>(o1: IOptics<T, A>): ITraversal<T, A> => {
	if (o1.kind === OpticsKind.Traversal) {
		return o1;
	}
	if (o1.kind === OpticsKind.Prism) {
		return {
			kind: OpticsKind.Traversal,
			set: o1.set,
			getMulti: castOutput(o1.getOpt),
		};
	}
	if (o1.kind === OpticsKind.Lens) {
		return {
			kind: OpticsKind.Traversal,
			set: o1.set,
			getMulti: castOutput(tupleFor<T>()(o1.get)),
		};
	}
	throw new Error();
};

export const compose = <T extends WeakKey, A, B>(
	o1: IOptics<T, A>,
	o2: IOptics<A, B>,
): IOptics<T, B> => {
	const set: ISetter<T, B> = (func: IF<B, B>): IF<T, T> => o1.set(o2.set(func));
	if (o1.kind === OpticsKind.Traversal) {
		if (o2.kind === OpticsKind.Traversal || o2.kind === OpticsKind.Prism) {
			const o3 = toTraversal(o2);
			return {
				kind: OpticsKind.Traversal,
				getMulti: composeMemo(o1.getMulti, Arr.flatMapSingle(o3.getMulti)),
				set,
			};
		}
		return {
			kind: OpticsKind.Traversal,
			getMulti: composeMemo(o1.getMulti, Arr.map(o2.get)),
			set,
		};
	}

	if (o1.kind === OpticsKind.Prism) {
		if (o2.kind === OpticsKind.Traversal) {
			const o3 = toTraversal(o1);
			return {
				kind: OpticsKind.Traversal,
				getMulti: composeMemo(o3.getMulti, Arr.flatMapSingle(o2.getMulti)),
				set,
			};
		}
		if (o2.kind === OpticsKind.Prism) {
			return {
				kind: OpticsKind.Prism,
				getOpt: Option.compose(o1.getOpt, o2.getOpt),
				set,
			};
		}
		return {
			kind: OpticsKind.Prism,
			getOpt: composeMemo(o1.getOpt, Option.map(o2.get)),
			set,
		};
	}

	if (o2.kind === OpticsKind.Traversal) {
		return {
			kind: OpticsKind.Traversal,
			getMulti: composeMemo(o1.get, o2.getMulti),
			set,
		};
	}
	if (o2.kind === OpticsKind.Prism) {
		return {
			kind: OpticsKind.Prism,
			getOpt: composeMemo(o1.get, o2.getOpt),
			set,
		};
	}
	return {
		kind: OpticsKind.Lens,
		get: composeMemo(o1.get, o2.get),
		set,
	};
};

export const composeIso = <T extends WeakKey, A extends WeakKey, B>(
	o: IOptics<T, A>,
	{ fw, bw }: IIso<A, B>,
): IOptics<T, B> => {
	// Duplicate of {Lens,Prism,Traversal}.composeIso
	const set = (f: IF<B, B>): IF<T, T> => o.set(composeMemo(fw, f, bw));
	if (o.kind === OpticsKind.Traversal) {
		return {
			kind: OpticsKind.Traversal,
			getMulti: composeMemo(o.getMulti, Arr.map(fw)),
			set,
		};
	}
	if (o.kind === OpticsKind.Prism) {
		return {
			kind: OpticsKind.Prism,
			getOpt: composeMemo(o.getOpt, Option.map(fw)),
			set,
		};
	}
	return {
		kind: OpticsKind.Lens,
		get: composeMemo(o.get, fw),
		set,
	};
};
