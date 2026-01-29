import { PatchBuilder } from "patch-incr/patch";
import * as Dv from "../src/dv";
import * as O from "../src/object";

describe("access", () => {
	const test = {
		a: 123,
		b: [1, 2],
	};
	const changes = PatchBuilder.empty<typeof test>()
		.replace(["a"], 10)
		.add(["b", 0], -1)
		.build();

	it("test", () => {
		const pTest = Dv.create(test, changes);
		console.log(pTest);
		const pB1 = O.access(pTest, "b");
		console.log(pB1);
		// const b2 = O.access(b1, 0);
		// console.log(b2);
		const pTest2 = O.assign(Dv.create({ y: 0 }), { x: pB1 });
		console.log(pTest2);
	});
});
