import type { AMapValue } from "@/map";
import type { $A } from "@/types/abbr";
import type { IFA } from "@/types/func";

export class FMapValue<A extends $A, T> {
	constructor(readonly map: AMapValue<A, T>) {}

	intro(): IFA<A, AMapValue<A, T>> {
		return {
			input: this.map.inner,
			output: this.map,
			evaluate: (x) => this.map.map(x),
			forward: (_x, dx) => dx,
		};
	}

	elim(): IFA<AMapValue<A, T>, A> {
		return {
			input: this.map,
			output: this.map.inner,
			evaluate: (x) => this.map.unmap(x),
			forward: (_x, dx) => dx,
		};
	}
}
