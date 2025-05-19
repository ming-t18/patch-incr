import { applyPatches } from "immer";
import { dp, patchesBuilder, record, struct, tuple } from "../dual";

// TODO doesn't work
describe.skip("record", () => {
	const builder = patchesBuilder;
	it("TEST record", () => {
		const [a, da] = record(builder)({
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

	it.skip("debug prints", () => {
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
