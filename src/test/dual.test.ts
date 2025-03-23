import { applyPatches } from "immer";
import { dp, patchesBuilder, record, struct, tuple } from "../dual";

describe("record", () => {
	const builder = patchesBuilder;
	it("TEST record", () => {
		const [a, da] = record(patchesBuilder)({
			a: dp(12, builder.empty),
			b: dp("hello", builder.fromReplace("world")),
			c: tuple(builder)([
				dp("test", builder.empty),
				dp(["x", "y"], builder.liftIndex(1, builder.fromReplace("z"))),
			]),
		});
		console.log({
			a,
			da,
			a1: applyPatches(a, da),
		});
	});

	it("TEST struct", () => {
		const [a, da] = struct(patchesBuilder)({
			a: 12,
			b: dp("hello", builder.fromReplace("world")),
			c: [
				"test",
				dp(["x", "y"], builder.liftIndex(1, builder.fromReplace("z"))),
			],
		});
		console.log({
			a,
			da,
			a1: applyPatches(a, da),
		});
	});
});
