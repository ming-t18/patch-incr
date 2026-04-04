import type { Option } from "patch-incr/builder/option";
import type {
	IAArray,
	IACompose,
	IAImpls,
	IAOption,
	IAPair,
	IAPlus,
} from "@/arrow";
import type { IAAddList, IAList, IATrans } from "@/arrowTransformer";
import type { $1, $2 } from "@/hkt";

export const List = "List";
/** `List : A -> A` */
export type List = typeof List;

export type ListT$<T> = $1<List, T>;

export enum ListKind {
	Single = "Single",
	Optional = "Optional",
	Multiple = "Multiple",
}
export interface ListSingle<T, A, B> {
	kind: ListKind.Single;
	get: $2<T, A, B>;
}
export interface ListOptional<T, A, B> {
	kind: ListKind.Optional;
	getOpt: $2<T, A, Option<B>>;
}
export interface ListMultiple<T, A, B> {
	kind: ListKind.Multiple;
	getMulti: $2<T, A, B[]>;
}
export type ListTRepr<T, A, B> =
	| ListSingle<T, A, B>
	| ListOptional<T, A, B>
	| ListMultiple<T, A, B>;

declare module "@/hkt/app" {
	interface $Map3<T0, T1, T2> {
		readonly [List]: ListTRepr<T0, T1, T2>;
	}
}

export interface ImplsArrowListInput<T> {
	compose: IACompose<T>;
	Pair: IAPair<T>;
	Option: IAOption<T>;
	Arr: IAArray<T>;
}

export interface ImplsArrowListOutputBasic<T> {
	trans: IATrans<T, List>;
	compose: IACompose<ListT$<T>>;
	add: IAAddList<T, ListT$<T>>;
}

export interface ImplsArrowListOutput<T>
	extends ImplsArrowListOutputBasic<T>,
		Pick<IAImpls<ListT$<T>>, "Pair"> {
	plus: IAPlus<ListT$<T>>;
	list: IAList<ListT$<T>>;
}
