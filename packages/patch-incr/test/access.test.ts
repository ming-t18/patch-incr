import { accessRecord } from "../builder/struct/access";
import * as ps from "../patchSchema";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

describe("accessRecord", () => {
	const patchSchema = ps.record({
		a: ps.array(ps.atomic<number>()),
		b: ps.atomic<string>(),
		c: ps.atomic<boolean>(),
	});
	const gen = gp.record({
		a: gp.array(gp.integer({ min: -5, max: 5 })),
		b: gp.string(),
		c: gp.boolean(),
	});

	const accessA = accessRecord("a", patchSchema);
	const accessB = accessRecord("b", patchSchema);
	const accessC = accessRecord("c", patchSchema);
	propsForIF(it, gen, () => accessA);
	propsForIF(it, gen, () => accessB);
	propsForIF(it, gen, () => accessC);
});
