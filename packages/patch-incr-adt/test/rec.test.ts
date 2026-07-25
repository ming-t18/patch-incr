import { describe, test } from "bun:test";
import fc from "fast-check";
import * as s from "@/index";
import { type ArbApply, atomicWithGen, type RecBrand } from "@/props";
import { testCasesPropsApply } from "./fastCheck/testPropsApply.test";

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

interface ALinkedListWithOpt<A extends s.$A>
	extends s.ARecord<{
			head: A;
			tail: s.AOptional<ALinkedListWithOpt<A>>;
		}>,
		RecBrand {}

const linkedListWithOpt = <A extends s.$A>(a: A) => {
	// Infinite recursion is avoided due to `AOptional` having a `RecBrand` check
	// The type annotation is required or else its type is `any`
	const recursion: ALinkedListWithOpt<A> = s.record({
		head: a,
		get tail(): s.AOptional<typeof recursion> {
			return s.optional(recursion);
		},
	});
	return recursion;
};

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

describe("linked list in terms of optional", () => {
	const str = atomicWithGen(fc.string());
	const llStr = linkedListWithOpt(str);
	test.skip("type checking for deriving arb", () => {
		// Should not derive getArbApply
		const _1 = linkedListWithOpt(s.atomic<string>())
			.getArbApply satisfies undefined;
		// Should derive getArbApply
		const _2 = llStr.getArbApply satisfies () => ArbApply<
			ALinkedListWithOpt<typeof str>
		>;
		// Should derive getArbApply
		const _3 = linkedListWithOpt(llStr).getArbApply satisfies () => ArbApply<
			ALinkedListWithOpt<typeof llStr>
		>;
	});

	describe("of string", () => {
		testCasesPropsApply(llStr);
	});
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
	test.skip("inspect", () => {
		console.log(tree1);
		console.log(tree.apply(tree1, dTree1));
	});
});
