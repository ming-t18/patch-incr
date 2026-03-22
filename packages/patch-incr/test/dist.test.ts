import { distAssign, distl, distr } from "@/builder/array/dist";
import * as gp from "./helpers/genPatched.test";
import { propsForIF } from "./helpers/props.test";

const genElem = gp.record({
	a: gp.integer(),
	b: gp.array(gp.string()),
	c: gp.string(),
});

const genDistDeep = gp.tuple(
	gp.string(),
	gp.integer(),
	gp.record({ x: gp.array(gp.string()) }),
);

describe("distl", () => {
	describe("atomic dist", () => {
		const genDist = gp.string();
		propsForIF(gp.tuple(genDist, gp.array(genElem)), () => distl());
	});

	describe("deep dist", () => {
		const genDist = genDistDeep;
		propsForIF(gp.tuple(genDist, gp.array(genElem)), () => distl());
	});
});

describe("distr", () => {
	describe("atomic dist", () => {
		const genDist = gp.string();
		propsForIF(gp.tuple(gp.array(genElem), genDist), () => distr());
	});

	describe("deep dist", () => {
		const genDist = genDistDeep;
		propsForIF(gp.tuple(gp.array(genElem), genDist), () => distr());
	});
});

describe("distAssign", () => {
	describe("atomic dist", () => {
		const genDist = gp.string();
		propsForIF(gp.tuple(gp.array(genElem), genDist), () => distAssign("d"));
	});

	describe("deep dist", () => {
		const genDist = genDistDeep;
		propsForIF(gp.tuple(gp.array(genElem), genDist), () => distAssign("d"));
	});
});
