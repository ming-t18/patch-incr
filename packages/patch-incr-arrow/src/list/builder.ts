import { singleton } from "patch-incr/builder";
import type { Option } from "patch-incr/builder/option";
import type { IAOption } from "@/arrow";
import type { $2, $3 } from "@/hkt";
import {
	type ImplsArrowListInput,
	type List,
	ListKind,
	type ListMultiple,
	type ListOptional,
	type ListT$,
	type ListTRepr,
} from "./types";

export const toMultiple =
	<T>(Option: IAOption<T>) =>
	<A, B>(f1: ListTRepr<T, A, B>): ListMultiple<T, A, B> => {
		if (f1.kind === ListKind.Multiple) {
			return f1;
		}
		if (f1.kind === ListKind.Optional) {
			return {
				kind: ListKind.Multiple,
				getMulti: f1.getOpt satisfies $2<T, A, [] | [B]> as never as $2<
					T,
					A,
					B[]
				>,
			};
		}
		return {
			kind: ListKind.Multiple,
			getMulti: Option.just(f1.get) satisfies $2<T, A, [B]> as never as $2<
				T,
				A,
				B[]
			>,
		};
	};

export const toOptional =
	<T>(Option: IAOption<T>) =>
	<A, B>(
		f1: Exclude<ListTRepr<T, A, B>, ListMultiple<T, A, B>>,
	): ListOptional<T, A, B> => {
		if (f1.kind === ListKind.Optional) {
			return f1;
		}
		return {
			kind: ListKind.Optional,
			getOpt: Option.just(f1.get) satisfies $2<T, A, [B]> as never,
		};
	};

export const single = <T, A, B>(get: $2<T, A, B>): ListTRepr<T, A, B> => ({
	kind: ListKind.Single,
	get,
});

export const multiple = <T, A, B>(
	getMulti: $2<T, A, B[]>,
): ListTRepr<T, A, B> => ({
	kind: ListKind.Multiple,
	getMulti,
});

export const runList =
	<T>(Option: IAOption<T>) =>
	<A, B>(repr: $3<List, T, A, B>): $2<T, A, B[]> => {
		return toMultiple(Option)(repr).getMulti;
	};

export const compose =
	<T>({
		compose: { compose: compose_ },
		Option,
		Arr,
	}: ImplsArrowListInput<T>) =>
	<A extends WeakKey, B, C>(
		f1: ListTRepr<T, A, B>,
		f2: ListTRepr<T, B, C>,
	): ListTRepr<T, A, C> => {
		if (f1.kind === ListKind.Multiple) {
			if (f2.kind === ListKind.Multiple || f2.kind === ListKind.Optional) {
				const o3 = toMultiple(Option)(f2);
				return {
					kind: ListKind.Multiple,
					getMulti: compose_(f1.getMulti, Arr.flatMap(o3.getMulti)),
				};
			}
			return {
				kind: ListKind.Multiple,
				getMulti: compose_(f1.getMulti, Arr.map(f2.get)),
			};
		}

		if (f1.kind === ListKind.Optional) {
			if (f2.kind === ListKind.Multiple) {
				const o3 = toMultiple(Option)(f1);
				return {
					kind: ListKind.Multiple,
					getMulti: compose_(o3.getMulti, Arr.flatMap(f2.getMulti)),
				};
			}
			if (f2.kind === ListKind.Optional) {
				return {
					kind: ListKind.Optional,
					getOpt: Option.compose(f1.getOpt, f2.getOpt),
				};
			}
			return {
				kind: ListKind.Optional,
				getOpt: compose_(f1.getOpt, Option.map(f2.get)),
			};
		}

		if (f2.kind === ListKind.Multiple) {
			return {
				kind: ListKind.Multiple,
				getMulti: compose_(f1.get, f2.getMulti),
			};
		}
		if (f2.kind === ListKind.Optional) {
			return {
				kind: ListKind.Optional,
				getOpt: compose_(f1.get, f2.getOpt),
			};
		}
		return {
			kind: ListKind.Single,
			get: compose_(f1.get, f2.get),
		};
	};

export const composeReeval =
	<T>({
		compose: { composeReeval: compose_ },
		Option,
		Arr,
	}: ImplsArrowListInput<T>) =>
	<A, B, C>(
		f1: ListTRepr<T, A, B>,
		f2: ListTRepr<T, B, C>,
	): ListTRepr<T, A, C> => {
		if (f1.kind === ListKind.Multiple) {
			if (f2.kind === ListKind.Multiple || f2.kind === ListKind.Optional) {
				const o3 = toMultiple(Option)(f2);
				return {
					kind: ListKind.Multiple,
					getMulti: compose_(f1.getMulti, Arr.flatMap(o3.getMulti)),
				};
			}
			return {
				kind: ListKind.Multiple,
				getMulti: compose_(f1.getMulti, Arr.map(f2.get)),
			};
		}

		if (f1.kind === ListKind.Optional) {
			if (f2.kind === ListKind.Multiple) {
				const o3 = toMultiple(Option)(f1);
				return {
					kind: ListKind.Multiple,
					getMulti: compose_(o3.getMulti, Arr.flatMap(f2.getMulti)),
				};
			}
			if (f2.kind === ListKind.Optional) {
				return {
					kind: ListKind.Optional,
					getOpt: Option.composeReeval(f1.getOpt, f2.getOpt),
				};
			}
			return {
				kind: ListKind.Optional,
				getOpt: compose_(f1.getOpt, Option.map(f2.get)),
			};
		}

		if (f2.kind === ListKind.Multiple) {
			return {
				kind: ListKind.Multiple,
				getMulti: compose_(f1.get, f2.getMulti),
			};
		}
		if (f2.kind === ListKind.Optional) {
			return {
				kind: ListKind.Optional,
				getOpt: compose_(f1.get, f2.getOpt),
			};
		}
		return {
			kind: ListKind.Single,
			get: compose_(f1.get, f2.get),
		};
	};

export const composeResidual =
	<T>({
		compose: { composeResidual: compose_ },
		Option: _1,
		Arr: _2,
	}: ImplsArrowListInput<T>) =>
	<A, B, C>(
		f1: ListTRepr<T, A, B>,
		f2: ListTRepr<T, B, C>,
	): ListTRepr<T, A, [C, unknown]> => {
		/*
		if (f1.kind === ListKind.Multiple) {
			if (f2.kind === ListKind.Multiple || f2.kind === ListKind.Optional) {
				const o3 = toMultiple(Option)(f2);
				return {
					kind: ListKind.Multiple,
					getMulti: compose_(f1.getMulti, Arr.flatMap(o3.getMulti)),
				};
			}
			return {
				kind: ListKind.Multiple,
				getMulti: compose_(f1.getMulti, Arr.map(f2.get)),
			};
		}

		if (f1.kind === ListKind.Optional) {
			if (f2.kind === ListKind.Multiple) {
				const o3 = toMultiple(Option)(f1);
				return {
					kind: ListKind.Multiple,
					getMulti: compose_(o3.getMulti, Arr.flatMap(f2.getMulti)),
				};
			}
			if (f2.kind === ListKind.Optional) {
				return {
					kind: ListKind.Optional,
					getOpt: Option.composeReeval(f1.getOpt, f2.getOpt),
				};
			}
			return {
				kind: ListKind.Optional,
				getOpt: compose_(f1.getOpt, Option.map(f2.get)),
			};
		}

		if (f2.kind === ListKind.Multiple) {
			return {
				kind: ListKind.Multiple,
				getMulti: compose_(f1.get, f2.getMulti),
			};
		}
		if (f2.kind === ListKind.Optional) {
			return {
				kind: ListKind.Optional,
				getOpt: compose_(f1.get, f2.getOpt),
			};
		}
		*/
		if (!(f1.kind === ListKind.Single && f2.kind === ListKind.Single)) {
			throw new Error("TODO");
		}
		return {
			kind: ListKind.Single,
			get: compose_(f1.get, f2.get),
		};
	};
