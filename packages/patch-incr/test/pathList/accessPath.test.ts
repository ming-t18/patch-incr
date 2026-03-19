import { propsForIF } from "@test/props.test";
import fc from "fast-check";
import { atomicFunc } from "@/builder";
import { composeMemo } from "@/builder/compose";
import * as Pair from "@/builder/pair";
import { accessPath, accessPathFor, all, composeFlatMap } from "@/iso/pathList";
import {
	doAssign,
	mapByPathValues,
	pathListIso,
	plus,
	setAll,
} from "@/iso/pathList/builder";
import {
	type ByPath,
	IsParentPath,
	type PathListOptics,
} from "@/iso/pathList/types";
import {
	applyPatches,
	liftPatches,
	PatchBuilder,
	type Patches,
	PatchOp,
	replacePatches,
} from "@/patch";
import * as gp from "../helpers/genPatched.test";

const arbRecord = gp.record({
	a: gp.record({
		b: gp.record({
			x: gp.integer({ min: -5, max: 5 }),
		}),
		c: gp.record({
			x: gp.integer({ min: -5, max: 5 }),
		}),
	}),
	d: gp.record({
		x: gp.integer({ min: -5, max: 5 }),
	}),
});
const access = accessPath(["a", "c", "x"]);

describe("accessPath", () => {
	describe("acceptsPath", () => {
		it("should accept own path", () => {
			expect(access.acceptPath(["a", "c", "x"])).toStrictEqual([]);
		});

		it("should accept children paths", () => {
			expect(access.acceptPath(["a", "c", "x", "y"])).toStrictEqual(["y"]);
			expect(access.acceptPath(["a", "c", "x", "y", 1])).toStrictEqual([
				"y",
				1,
			]);
		});

		it("should accept parent paths", () => {
			expect(access.acceptPath([])).toStrictEqual(IsParentPath);
			expect(access.acceptPath(["a"])).toStrictEqual(IsParentPath);
			expect(access.acceptPath(["a", "c"])).toStrictEqual(IsParentPath);
		});

		it("should reject disjont paths", () => {
			expect(access.acceptPath(["b"])).toBeNull();
			expect(access.acceptPath(["a", "b"])).toBeNull();
			expect(access.acceptPath(["a", "c", "y"])).toBeNull();
		});
	});
});

describe("all", () => {
	describe("acceptsPath", () => {
		it("should accept all indexes", () => {
			expect(all().acceptPath([0])).toStrictEqual([]);
			expect(all().acceptPath([0, "a"])).toStrictEqual(["a"]);
		});
	});
});
