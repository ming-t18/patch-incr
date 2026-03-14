import fc from "fast-check";
import {
	type IncReduceAlgebra,
	objectFromEntriesAlgebra,
} from "@/algebra/incReduce";
import { applyPatches } from "@/patch";

const propIncReduce = <Acc, T>(
	alg: IncReduceAlgebra<Acc, T>,
	arbAcc: fc.Arbitrary<Acc>,
	arbValue: fc.Arbitrary<T>,
) => {
	it("add and forwardAdd should agree", () => {
		fc.assert(
			fc.property(arbAcc, arbValue, (acc, value) => {
				expect(applyPatches(acc, alg.forwardAdd(acc, value))).toStrictEqual(
					alg.add(acc, value),
				);
			}),
		);
	});
	it("remove and forwardRemove should agree", () => {
		fc.assert(
			fc.property(arbAcc, arbValue, (acc, value) => {
				expect(applyPatches(acc, alg.forwardRemove(acc, value))).toStrictEqual(
					alg.remove(acc, value),
				);
			}),
		);
	});
	it("replace and forwardReplace should agree", () => {
		fc.assert(
			fc.property(arbAcc, arbValue, arbValue, (acc, value0, value1) => {
				expect(
					applyPatches(acc, alg.forwardReplace(acc, value0, value1)),
				).toStrictEqual(alg.replace(acc, value0, value1));
			}),
		);
	});
};

// empty string can't be a valid key
const arbKey = fc.string({
	minLength: 1,
	maxLength: 3,
	unit: "grapheme-ascii",
});
const arbValue = fc.record({
	a: fc.integer({ min: 0, max: 10 }),
	b: fc.array(fc.string(), { maxLength: 5 }),
});
type Value = { a: number; b: string[] };

// const arbEntries = gp.entriesArray(arbValue, { maxLength: 20 });

const arbEntry = fc.tuple(arbKey, arbValue);

describe("objectFromEntriesAlgebra", () => {
	propIncReduce(
		objectFromEntriesAlgebra<string, Value>({}),
		fc
			.array(arbEntry)
			.map((xs) => Object.fromEntries(xs) as never as Record<string, Value>),
		arbEntry,
	);
});
