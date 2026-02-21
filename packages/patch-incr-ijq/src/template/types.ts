/** biome-ignore-all lint/suspicious/noExplicitAny: needed for constraints */
import type { EmptyCtx } from "@/type";
import type * as S from "./symbol";

export type IjqBuilder<A, B> = (input: IjqSlot<A>) => ToTemplateValue<B>;

export type IjqBuilderCtx<A, B, CtxValue> = (
	input: IjqSlot<A>,
	$value: IjqSlot<CtxValue>,
) => ToTemplateValue<B>;

export interface IjqSlotBase<T> {
	readonly "~slotType": T;
	readonly "~slotVariance": (input: T) => T;
	[S.pipe]: <Output>(value: IjqBuilder<T, Output>) => IjqSlot<Output>;
	[S.cond]: <IfTrue, IfFalse = IfTrue>(
		ifTrue: IjqBuilder<T, IfTrue>,
		ifFalse: IjqBuilder<T, IfFalse>,
	) => IjqSlot<IfTrue | IfFalse>;
	[S.context]: <Key extends string, Value, Out>(
		key: Key,
		value: IjqBuilder<T, Value>,
		builder: IjqBuilderCtx<T, Out, Value>,
	) => IjqSlot<Out>;
}

export type ArrayKeys = string & keyof unknown[];

export interface IjqSlotArrayBase<Elem> extends IjqSlotBase<Elem[]> {
	[S.stream]: IjqSlot<Elem>;
}

export type IjqSlotTuple<T extends [unknown, ...unknown[]]> = {
	[key in keyof T]: IjqSlot<T[key]>;
} & Omit<IjqSlotArrayBase<T[keyof T]>, ArrayKeys>;

export type IjqSlotArray<Elem> = Omit<IjqSlot<Elem>[], ArrayKeys> &
	IjqSlotArrayBase<Elem>;

export type IjqSlot<T> = T extends {
	/* terminates nesting IjqSlot<IjqSlot<T1>> */ "~slotType": infer T1;
}
	? T1
	: T extends [unknown, ...unknown[]]
		? IjqSlotTuple<T>
		: T extends (infer Elem)[]
			? IjqSlotArray<Elem>
			: T extends Record<any, any>
				? IjqSlotBase<T> & { [key in keyof T]: IjqSlot<T[key]> }
				: IjqSlotBase<T>;

export type ToTemplateArray<Elem, Ctx extends {} = EmptyCtx> =
	| Elem[]
	| IjqSlot<Elem>
	| ToTemplateValue<Elem, Ctx>[];

export type ToTemplateObject<
	T extends Record<any, any> | unknown[],
	Ctx extends {} = EmptyCtx,
> = T | IjqSlot<T> | { [key in keyof T]: ToTemplateValue<T[key], Ctx> };

export type ToTemplateValue<T, Ctx extends {} = EmptyCtx> = T extends {
	/* terminates nesting IjqSlot<IjqSlot<T1>> */ "~slotType": infer T1;
}
	? T1
	: T extends [unknown, ...unknown[]]
		? ToTemplateObject<T, Ctx>
		: T extends (infer Elem)[]
			? ToTemplateArray<Elem, Ctx>
			: T extends Record<string, unknown>
				? ToTemplateObject<T, Ctx>
				: T | IjqSlot<T>;
