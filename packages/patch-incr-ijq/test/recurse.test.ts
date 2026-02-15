import { PatchBuilder } from "patch-incr/patch";
import * as A from "../src/arrow";
import { Pipe } from "../src/pipe";
import * as R from "../src/recurse";
import { propIjqPatchCoherentNoCtx } from "./helpers";

interface Tree {
	name: string;
	children: Tree[];
}

const tree1: Tree = {
	name: "root",
	children: [
		{ name: "abc", children: [] },
		{
			name: "def",
			children: [
				{ name: "ghi", children: [] },
				{ name: "jkl", children: [{ name: "xyz", children: [] }] },
				{ name: "mno", children: [] },
			],
		},
		{ name: "a1", children: [] },
	],
};

describe("recurse", () => {
	const getNames = A.compose(
		R.recurse(new Pipe<Tree>()._("children").stream().build()),
		new Pipe<Tree>()._("name").build(),
	);

	describe("getNames is patch coherent", () => {
		it("root name replace", () => {
			propIjqPatchCoherentNoCtx(
				tree1,
				PatchBuilder.empty<Tree>().replace(["name"], "test").build(),
				getNames,
			);
		});

		it("deep name replace", () => {
			propIjqPatchCoherentNoCtx(
				tree1,
				PatchBuilder.empty<Tree>()
					.replace(["children", 1, "children", 0, "name"], "test")
					.build(),
				getNames,
			);
		});

		it("root entry delete", () => {
			propIjqPatchCoherentNoCtx(
				tree1,
				PatchBuilder.empty<Tree>().remove(["children", 1]).build(),
				getNames,
			);
		});

		it("deep entry delete", () => {
			propIjqPatchCoherentNoCtx(
				tree1,
				PatchBuilder.empty<Tree>()
					.remove(["children", 1, "children", 0])
					.build(),
				getNames,
			);
		});

		it("root entry add", () => {
			propIjqPatchCoherentNoCtx(
				tree1,
				PatchBuilder.empty<Tree>()
					.add(["children", 0], { name: "added", children: [] })
					.build(),
				getNames,
			);
		});

		it("deep entry add", () => {
			propIjqPatchCoherentNoCtx(
				tree1,
				PatchBuilder.empty<Tree>()
					.add(["children", 1, "children", 2], { name: "added", children: [] })
					.build(),
				getNames,
			);
		});
	});
});
