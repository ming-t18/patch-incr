import { composeMemo } from "@/builder/compose";
import type { IIso } from "@/iso/types";
import type { IF } from "@/types";
import { type ILens, OpticsKind } from "./types";

export const fromIso = <T extends WeakKey, A>({
	fw,
	bw,
}: IIso<T, A>): ILens<T, A> => ({
	kind: OpticsKind.Lens,
	get: fw,
	set: (f) => composeMemo(fw, f, bw),
});

export const composeIso = <T extends WeakKey, A extends WeakKey, B>(
	o: ILens<T, A>,
	{ fw, bw }: IIso<A, B>,
): ILens<T, B> => {
	const set = (f: IF<B, B>): IF<T, T> => o.set(composeMemo(fw, f, bw));
	return {
		kind: OpticsKind.Lens,
		get: composeMemo(o.get, fw),
		set,
	};
};
