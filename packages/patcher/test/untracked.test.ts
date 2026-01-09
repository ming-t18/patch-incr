import { PatchOp } from "patch-incr/patch";
import { createDraft, currentPath, patchesOnRoot } from "../src";

const getOriginal = () => ({
	a: 10,
	b: undefined as string | undefined,
	c: [
		{ x: 1, y: [3] },
		{ x: 2, y: [4] },
	],
});

describe("untracked mode", () => {
	describe("with currentPath", () => {
		it("should keep paths to primitive values", () => {
			const draft = createDraft(getOriginal(), { untracked: true });
			expect(currentPath(draft.a)).toStrictEqual(["a"]);
			expect(currentPath(draft.b)).toStrictEqual(["b"]);
			expect(currentPath(draft.c[0]?.x)).toStrictEqual(["c", 0, "x"]);
		});

		it("should keep paths to out of bounds values", () => {
			const draft = createDraft(getOriginal(), { untracked: true });
			expect(currentPath(draft.c[2]?.y[5])).toStrictEqual(["c", 2, "y", 5]);
		});
	});

	describe("generating patches with patchesOnRoot", () => {
		it("should generate repalce-patches to out of bounds values", () => {
			const draft = createDraft(getOriginal(), { untracked: true });
			draft.c[2]!.y[5] = 100;
			expect(patchesOnRoot(draft)).toStrictEqual([
				{
					op: PatchOp.Replace,
					path: ["c", 2, "y", 5],
					value: 100,
				},
			]);
		});
	});
});
