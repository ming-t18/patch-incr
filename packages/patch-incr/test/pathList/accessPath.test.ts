import { accessPath, all } from "@/iso/pathList";
import { IsParentPath } from "@/iso/pathList/types";
import * as gp from "../helpers/genPatched.test";

const _arbRecord = gp.record({
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
