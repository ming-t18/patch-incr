import type { $A } from "@/types/abbr";
import type { IF } from "@/types/func";
import type { IIso, IIsoA } from "@/types/func/iso";
import type { AZero } from "@/unit";
import type { AEither } from ".";

// Introduction rules

declare const cond: <A extends $A, B extends $A, C extends $A>(
	isRight: (input: A) => boolean,
	left: IF<A, B>,
	right: IF<A, C>,
) => IF<A, AEither<A, B>>;

declare const left: <A extends $A, B extends $A>(
	either: AEither<A, B>,
) => IF<A, AEither<A, B>>;

declare const right: <A extends $A, B extends $A>(
	either: AEither<A, B>,
) => IF<A, AEither<A, B>>;

// Elimination rules

declare const elim: <A extends $A, B extends $A, C extends $A>(
	either: AEither<A, B>,
	left: IF<A, C>,
	rightr: IF<B, C>,
) => IIso<AEither<A, B>, C>;

// Algebraic rules

declare const zeroLeft: <A extends $A>(right: A) => IIsoA<A, AEither<AZero, A>>;
declare const zeroRight: <A extends $A>(left: A) => IIsoA<A, AEither<A, AZero>>;

declare const comm: <A extends $A, B extends $A>(
	a: A,
	b: B,
) => IIsoA<AEither<A, B>, AEither<B, A>>;

declare const assoc: <A extends $A, B extends $A, C extends $A>(
	a: A,
	b: B,
	c: C,
) => IIsoA<AEither<AEither<A, B>, C>, AEither<A, AEither<B, C>>>;
