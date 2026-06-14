/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import * as s from "@/index";
import * as lp from "@/list/prod";

const listProdString = lp.list(s.string());
const cons1: s.infer<typeof listProdString> = lp.cons("abc", lp.cons("def"));
const dProd1: s.inferChange<typeof listProdString> = {
	type: "cons",
	change: {
		head: s.makeReplaceOnly("pqr"),
		tail: {
			type: "cons",
			change: {
				// head: s.makeReplaceOnly("stu"),
				tail: listProdString.fromReplace(lp.cons("aaa")),
			},
		},
	},
};

describe("list", () => {
	it("inspect", () => {
		console.log(cons1);
	});
	it("test1", () => {
		console.log([...cons1!]);
		console.log([...listProdString.apply(cons1, dProd1)!]);
	});
});
