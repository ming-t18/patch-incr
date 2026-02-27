import type { IIso } from "../types";

/**
 * Incremental isomorphism lens.
 *
 * A lens in the form of `A <-> [B, R]`.
 *
 * Suppose we have `f : IIsoLens<S, A, R>, f1: IIsoLens<T, B, R>`:
 *
 * - The get-operation is `compose(f.fw, Pair.fst()) : IF<S, A>`
 * - The set-operation applying `g : IF<A, B>` is `compose(f.fw, Pair.first(g), f1.bw) : IF<S, T>`
 * @param A input
 * @param B focus, which is a part of the input
 * @param R residual, rest of the input requires to reconstruct the input alongside the focus
 */
export type IIsoLens<A, B, R = any> = IIso<A, [B, R]>;

export type AnyIIsoLens = IIsoLens<any, any, any>;
