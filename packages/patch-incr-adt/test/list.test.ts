import * as s from "@/index";

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

describe("list", () => {
	it("test1", () => {
		// console.log(listString);
		console.log(listString.apply(test1, d1));
	});
});
