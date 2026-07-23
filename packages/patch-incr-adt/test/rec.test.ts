import { describe, it } from "bun:test";
import * as s from "@/index";

// does not work due to self-referential "typeof"
// const linkedList = s.record({
// 	head: s.string(),
// 	get tail(): s.AOptional<typeof linkedList> {
// 		return s.optional<typeof linkedList>(linkedList);
// 	},
// });

// does not work due to no inference
// const tree0 = s.record({
// 	name: s.string(),
//   get children(): s.AOptional<s.AList<typeof tree0>> {
// 		return s.optional(s.list(tree0));
// 	},
// });

// Works
interface TreeShape<Name extends s.AnyApply, Rec extends s.AnyApply> {
	name: Name;
	children: s.AOptional<s.AList<Rec>>;
}

interface ATree<Name extends s.AnyApply>
	extends s.ARecord<TreeShape<Name, ATree<Name>>> {}

const tree: ATree<s.Apply<string>> = s.record({
	name: s.string(),
	get children() {
		return s.optional(s.list(tree));
	},
});

describe("tree", () => {
	const tree1: s.infer<typeof tree> = {
		name: "root",
		children: s.List.fromArray([
			{ name: "test1", children: undefined },
			{ name: "test2", children: undefined },
			{
				name: "test3",
				children: s.List.fromArray([
					{ name: "x", children: undefined },
					{ name: "y", children: undefined },
				]),
			},
		]),
	};
	const dTree1: s.inferChange<typeof tree> = {
		children: tree.shape.children.fromReplace(s.List.empty()),
	};
	it("inspect", () => {
		console.log(tree1);
		console.log(tree.apply(tree1, dTree1));
	});
});
