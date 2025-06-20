import fc, { type ArrayConstraints } from "fast-check";
import { elem, elem0 } from "../../dom/construct";
import { tryAccessElement } from "../../dom/reducer";
import { constructDOM } from "../../dom/render";
import type {
	Attrs,
	ChildConstruction,
	DOMConstruction,
	ElementConstruction,
	TextConstruction,
} from "../../dom/types";
import { PatchOp, type Path } from "../../incr/patch";

const arbPathOnValue = (_value: unknown): fc.Arbitrary<Path> => {
	throw new Error("TODO");
};

const arbText = (): fc.Arbitrary<TextConstruction> =>
	fc.oneof(
		fc.integer({ min: -1000, max: 1000 }),
		fc.float(),
		fc.bigInt({ min: -1000n, max: 1000n }),
		{ weight: 5, arbitrary: fc.string() },
	);

const arbAttrName = () => fc.stringMatching(/^[a-zA-Z]{1,10}$/);

const _tags = ["a", "div", "span", "form", "h1", "h2", "h3", "h4", "h5", "h6"];
// const arbTagName = () => fc.constantFrom(...tags);
const arbTagName = () => fc.stringMatching(/^[a-zA-Z]{1,10}$/);

const arbAttrs = (c?: ArrayConstraints): fc.Arbitrary<Attrs> =>
	fc
		.array(fc.tuple(arbAttrName(), arbText()), c)
		.map((x) => Object.fromEntries(x));

const depthIdentifier = fc.createDepthIdentifier();
const arbDOMCNoEvents: () => fc.Arbitrary<DOMConstruction> = () =>
	fc.letrec<{
		child: ChildConstruction;
		node: DOMConstruction;
		leaf: TextConstruction;
	}>((tie) => ({
		child: fc.oneof({ depthIdentifier }, tie("leaf"), tie("node")),
		node: fc.record<ElementConstruction>({
			tag: arbTagName(),
			attrs: arbAttrs({ depthIdentifier }),
			children: fc.array(tie("child"), { maxLength: 10, depthIdentifier }),
		}),
		leaf: arbText(),
	})).node;

describe("tryAccessElement", () => {
	it.skip("sample", () => {
		for (const [domc, path] of fc.sample(
			arbDOMCNoEvents().chain((domc) =>
				fc.tuple(fc.constant(domc), arbPathOnValue(domc)),
			),
			1000,
		)) {
			console.log(constructDOM(domc, document).outerHTML);
			console.log(path);
		}
	});

	const domc: DOMConstruction = elem("div", { class: "class1" }, [
		elem0("div", [
			elem0("h1", ["Heading"]),
			elem("p", { id: "test" }, ["Hello, world!"]),
			elem0("ul", [
				elem0("li", ["Item 1"]),
				elem0("li", ["Item 2"]),
				elem0("li", ["Item 3"]),
			]),
			elem("p", { id: "test1" }, ["Hello, world 2!"]),
		]),
	]);

	it("test access", () => {
		const nodePath = [0, 2, 1];
		const node = constructDOM(domc, document);
		const access1 = tryAccessElement(node, {
			op: PatchOp.Remove,
			path: nodePath,
		});

		expect(access1).toHaveProperty([0, "innerText"], "Item 2");
		expect(access1).toHaveProperty([1], { op: PatchOp.Remove, path: [] });
	});
});
