import * as s from "@/index";
import * as o from "@/types/oid";

const pair = s.record({
	fst: s.number(),
	snd: s.Pair.pair(s.boolean(), s.string()),
});
const pair1 = o.oidify<typeof pair>(pair);

describe("oidify - monoid", () => {
	it("should type check", () => {
		const val1: s.infer<typeof pair> & o.Point<"src"> = {
			fst: 2,
			snd: [false, "-"],
		};
		const d1: s.inferChange<typeof pair> & o.Path<"src", "a"> = { fst: null };
		const d2: s.inferChange<typeof pair> & o.Path<"a", "dst"> = {
			fst: null,
			snd: [null, null],
		};
		const d3 = pair1.combine(d1, d2);
		const _val2 = pair1.apply(val1, d3);
	});
});
