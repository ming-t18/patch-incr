import { describe, expect, test } from "bun:test";
import * as s from "@/index";
import type { ArbApply, RecBrand } from "@/props";
import * as p from "@/props";
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

interface TreeShape<Name extends s.$A> {
	name: Name;
	children: s.AOptional<s.AList<ATree<Name>>>;
}

interface ATree<Name extends s.$A> extends s.ARecord<TreeShape<Name>> {}

const tree: ATree<p.AAtomicWithGen<string>> = s.record({
	name: p.string(),
	get children() {
		return s.optional(s.list(tree));
	},
});

describe("linked list in terms of optional", () => {
	const str = p.string();
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

	describe("of union", () => {
		testCasesPropsApply(s.either(p.string(), p.integer()));
	});

	describe("of record", () => {
		testCasesPropsApply(s.record({ str: p.string(), int: p.integer() }));
	});
});

describe("tree", () => {
	testCasesPropsApply(tree);

	describe("example", () => {
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
		test("apply example", () => {
			expect(tree.apply(tree1, dTree1)).toEqual({
				name: "root",
				children: null,
			});
		});
	});
});
