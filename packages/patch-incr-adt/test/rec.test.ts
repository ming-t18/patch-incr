import * as s from "@/index";

// does not work due to self-referential "typeof"
// const linkedList = s.record({
// 	head: s.string(),
// 	get tail(): s.ApplyOptional$<typeof linkedList> {
// 		return s.optional<typeof linkedList>(linkedList);
// 	},
// });

// const tree = s.record({
// 	name: s.string(),
// 	get children(): s.ApplyOptional$<s.ListApply<typeof tree>> {
// 		return s.optional(s.list(tree));
// 	},
// });

// Works
interface TreeShape<Name extends s.AnyApply, Rec extends s.AnyApply> {
	name: Name;
	children: s.Optional$<s.ListApply<Rec>>;
}

interface TreeApply<Name extends s.AnyApply>
	extends s.ARecord<TreeShape<Name, TreeApply<Name>>> {}

const tree: TreeApply<s.Apply<string>> = s.record({
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
