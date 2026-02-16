import {
	accessPathFor,
	accessRecord,
	accessWithFor,
} from "../builder/struct/access";
import * as ps from "../patchSchema";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const patchSchema = ps.record({
	a: ps.array(ps.atomic<number>()),
	b: ps.atomic<string>(),
	c: ps.atomic<boolean>(),
	d: ps.record({
		e: ps.array(
			ps.record({
				id: ps.atomic<number>(),
				test: ps.atomic<string>(),
			}),
		),
		f: ps.tuple(ps.atomic<string>(), ps.atomic<number>()),
	}),
});

const gen = gp.record({
	a: gp.array(gp.integer({ min: -5, max: 5 })),
	b: gp.string(),
	c: gp.boolean(),
	d: gp.record({
		e: gp.array(
			gp.record({
				id: gp.integer({ min: -50, max: 50 }),
				test: gp.string(),
			}),
		),
		f: gp.tuple(gp.string(), gp.integer()),
	}),
});

type Target = gp.InferArbValue<typeof gen>;

describe("accessRecord", () => {
	const accessA = accessRecord("a", patchSchema);
	const accessB = accessRecord("b", patchSchema);
	const accessC = accessRecord("c", patchSchema);
	propsForIF(it, gen, () => accessA);
	propsForIF(it, gen, () => accessB);
	propsForIF(it, gen, () => accessC);
});

describe("accessPath", () => {
	const _A = accessPathFor<Target>();
	const access1 = _A(["a"]);
	const access2 = _A(["b"]);
	const access3 = _A(["c"]);
	const access4 = _A(["d"]);
	const access5 = _A(["d", "e"]);
	const access6 = _A(["d", "f", 0]);
	const access7 = _A(["d", "f", 1]);
	propsForIF(it, gen, () => access1);
	propsForIF(it, gen, () => access2);
	propsForIF(it, gen, () => access3);
	propsForIF(it, gen, () => access4);
	propsForIF(it, gen, () => access5);
	propsForIF(it, gen, () => access6);
	propsForIF(it, gen, () => access7);
});

describe("accessWith", () => {
	const _A = accessWithFor<Target>();
	const access1 = _A((x) => x.a);
	const access2 = _A((x) => x.b);
	const access3 = _A((x) => x.c);
	const access4 = _A((x) => x.d);
	const access5 = _A((x) => x.d.e);
	const access6 = _A((x) => x.d.f[0]);
	const access7 = _A((x) => x.d.f[1]);
	propsForIF(it, gen, () => access1);
	propsForIF(it, gen, () => access2);
	propsForIF(it, gen, () => access3);
	propsForIF(it, gen, () => access4);
	propsForIF(it, gen, () => access5);
	propsForIF(it, gen, () => access6);
	propsForIF(it, gen, () => access7);
});
