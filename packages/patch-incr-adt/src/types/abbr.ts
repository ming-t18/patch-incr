import type { AnyApply, InferApplyChange, InferApplyValue } from "./algebra";

export type { DRO } from "./replaceOnly";
export type $A = AnyApply;
export type $T<T extends $A> = InferApplyValue<T>;
export type $D<T extends $A> = InferApplyChange<T>;
