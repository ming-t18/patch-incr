/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import { getTrackedPath } from "patch-incr/tracked";
import { type IjqSlot, makeSlot, S, type ToTemplateValue } from "@/template";
import type { EmptyCtx } from "./type";

type Test = {
	a: number;
	b: [string, number];
	c: {
		d: string[];
		e: number;
	};
	f: () => void;
	g: { p: string };
	h: { a: boolean; s: string }[];
};
type TestTemplate = ToTemplateValue<Test>;

describe("template", () => {
	const x = makeSlot<Test>();
	const test1 = {
		a: 2,
		b: [x.b[0], makeSlot<number>()],
		// shouldn't type check:
		// b: [makeSlot<number>(), makeSlot<number>()],
		c: makeSlot<Test["c"]>() satisfies ToTemplateValue<Test["c"]>,
		f: makeSlot<Test["f"]>(),
		g: { p: makeSlot<Test["g"]["p"]>() },
		h: [x.h[S.stream], { a: false, s: "test" }],
	} satisfies TestTemplate;

	const test2 = makeSlot<Test>().b[0] satisfies IjqSlot<string>;

	const test3 = {
		a: 2,
		b: [x.b[0], x.b[1]],
		c: x.c,
		f: x.f,
		g: { p: x.g.p },
		h: [x.h[S.stream], x.h[0]!],
	} satisfies TestTemplate;

	it("should getTrackedPath for test1", () => {
		expect(getTrackedPath(test1.h[0])).toStrictEqual(["h", S.stream]);
		const s = test1.h[0]!.s;
		expect(getTrackedPath(s)).toStrictEqual(["h", S.stream, "s"]);
	});

	it("should getTrackedPath for test2", () => {
		expect(getTrackedPath(test2)).toStrictEqual(["b", 0]);
	});

	it("should getTrackedPath for test3", () => {
		expect(getTrackedPath(test3.h[0]!)).toStrictEqual(["h", S.stream]);
	});

	if (((1 + 1) as number) === 2) {
		return;
	}
	// TODO not implemented
	describe("nested list example", () => {
		interface Item {
			id: number;
			done: boolean;
			text: string;

			children: Item[];
		}
		interface State {
			items: Item[];
			isDone: boolean;
		}

		const root = makeSlot<State>();
		const res = root.items[S.stream]
			[S.pipe]((x) => ({
				text1: x.text,
				child: x.children[S.stream] satisfies IjqSlot<Item>,
			}))
			[S.pipe]<string>((x1) => x1.text1);
		const res1 = root[S.context]<"isDone", boolean, Item>(
			"isDone",
			(r): ToTemplateValue<boolean> => r.isDone,
			(root1, $isDone) => root1.items[S.stream],
		);
	});
});
