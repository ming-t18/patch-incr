import * as s from "@/index";
import * as lp from "@/list/prod";

const listString = s.list<string>(s.string());
const test1: s.infer<typeof listString> = {
	head: "abc",
	tail: {
		head: "def",
		tail: null,
	},
};
const d1: s.inferChange<typeof listString> = {
	type: "cons",
	change: {
		head: s.makeReplaceOnly("pqr") as s.DRO<string>,
		tail: {
			type: "cons",
			change: {
				// head: s.makeReplaceOnly("stu") as s.DRO<string>,
				tail: s.makeReplaceOnly({ head: "aaa", tail: null }),
			},
		},
	},
};
const listProdString = lp.list(s.string());
const testProd1: s.infer<typeof listProdString> = new lp.Cons(
	"abc",
	new lp.Cons("def"),
);
const dProd1: s.inferChange<typeof listProdString> = {
	type: "cons",
	change: {
		head: s.makeReplaceOnly("pqr") as s.DRO<string>,
		tail: {
			type: "cons",
			change: {
				// head: s.makeReplaceOnly("stu") as s.DRO<string>,
				tail: s.makeReplaceOnly(new lp.Cons("aaa")),
			},
		},
	},
};

describe("list", () => {
	it("test1", () => {
		console.log(listString.apply(test1, d1));
	});
});
describe("listProd", () => {
	it("test1", () => {
		console.log(listProdString.apply(testProd1, dProd1));
	});
});
