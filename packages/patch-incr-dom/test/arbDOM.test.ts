import fc from "fast-check";
import {
	canApplyPatches,
	type PatchEntry,
	PatchOp,
	type Path,
} from "patch-incr/patch";
import * as gp from "patch-incr/test/helpers/genPatched.test";
import {
	type GenWithPatches,
	makeArbHelper,
} from "patch-incr/test/helpers/genPatched.test";
import {
	type Attrs,
	type ChildConstruction,
	type DOMConstruction,
	type ElementConstruction,
	isElementConstruction,
	type TextConstruction,
} from "../types";

export const arbText = gp.atomic<TextConstruction>(
	fc.oneof(
		{ weight: 10, arbitrary: fc.string() },
		fc.bigInt({ min: -100n, max: 100n }),
		fc.integer({ min: -100, max: 100 }),
		fc.float(),
	),
);

export const arbCommonAttrs: GenWithPatches<Attrs> = gp.record(
	{
		id: gp.atomic(fc.stringMatching(/^[a-zA-Z0-9_]$/)),
		class: gp.atomic(fc.stringMatching(/^[a-zA-Z0-9_ ]$/)),
	},
	["id", "class"],
);

const arbTagName = gp.atomic(
	fc.constantFrom("div", "span", "ul", "ol", "li", "table", "input"),
);

export const arbElemCNoEvents = (
	arbChild: GenWithPatches<ChildConstruction>,
	arrayConstraints?: fc.ArrayConstraints,
): GenWithPatches<DOMConstruction> => {
	return gp.record({
		tag: arbTagName,
		attrs: arbCommonAttrs,
		children: gp.array(arbChild, arrayConstraints),
	});
};

export const arbChild = (
	arbElem: GenWithPatches<ElementConstruction>,
): GenWithPatches<ChildConstruction> => {
	return gp.oneof(
		[
			{ weight: 2, arbitrary: arbText as GenWithPatches<ChildConstruction> },
			{ weight: 1, arbitrary: arbElem },
		],
		(x) => (typeof x === "object" && x !== null ? 1 : 0),
	);
};

export const arbElem0: GenWithPatches<ElementConstruction> = arbElemCNoEvents(
	arbText,
	{ maxLength: 0 },
);
export const arbElem1: GenWithPatches<ElementConstruction> = arbElemCNoEvents(
	arbChild(arbElem0),
	{ maxLength: 3 },
);
export const arbElem2: GenWithPatches<ElementConstruction> = arbElemCNoEvents(
	arbChild(arbElem1),
	{ maxLength: 3 },
);
export const arbElem3: GenWithPatches<ElementConstruction> = arbElemCNoEvents(
	arbChild(arbElem2),
	{ maxLength: 4 },
);
export const arbElem4: GenWithPatches<ElementConstruction> = arbElemCNoEvents(
	arbChild(arbElem3),
	{ maxLength: 4 },
);

export const arbDOMC: fc.Arbitrary<DOMConstruction> = fc.letrec<{
	child: ChildConstruction;
	text: TextConstruction;
	elem: ElementConstruction;
}>((tie) => ({
	child: fc.oneof({ depthSize: "small" }, tie("text"), tie("elem")),
	text: arbText.arb().map((x) => x.value),
	elem: fc.record({
		tag: arbTagName.arb().map((x) => x.value),
		attrs: arbCommonAttrs.arb().map((x) => x.value),
		children: fc.array(tie("child"), { maxLength: 6 }),
	}),
})).elem;

const _decomposePath = (path: Path): [Path, Path] => {
	let i = 0;
	while (path.length >= 2 && path[0] === "children") {
		i += 2;
	}
	return [path.slice(0, i), path.slice(i)];
};

export const arbAccessorOnDOMC = (
	domc: DOMConstruction,
): fc.Arbitrary<[Path, ChildConstruction]> => {
	const paths: [Path, ChildConstruction][] = [];
	const stack: [[Path, DOMConstruction]] = [[[], domc]];
	while (stack.length > 0) {
		const [path0, value] = stack.pop() as [Path, DOMConstruction];
		paths.push([path0, value]);
		if (Array.isArray(value.children)) {
			for (let i = 0; i < value.children.length; i++) {
				const path1 = [...path0, "children", i];
				paths.push([path1, value.children[i]]);
				const child = value.children[i];
				if (child !== null && typeof child === "object") {
					stack.push([path1, child]);
				}
			}
		}
	}
	return fc.constantFrom(...paths);
};

export const arbElem = (): GenWithPatches<DOMConstruction> => {
	const isValidPatchEntry = (
		value: DOMConstruction,
		entry: PatchEntry<ElementConstruction>,
	) => canApplyPatches(value, [entry]);
	const arb0: fc.Arbitrary<DOMConstruction> = arbDOMC;
	const arbPatchEntry = (
		opts?: gp.ArbPatchEntryOpts<DOMConstruction>,
	): fc.Arbitrary<PatchEntry<DOMConstruction>> => {
		if (!opts) {
			return arbElem4.arbPatchEntry();
		}

		return arbAccessorOnDOMC(opts.value).chain(([path0, c]) => {
			return fc.oneof(
				{
					weight: 1,
					arbitrary: arb0.map((value) => ({
						path: path0,
						op: PatchOp.Replace,
						value,
					})),
				},
				{
					weight: 1,
					arbitrary: isElementConstruction(c)
						? arbElem0.arbPatchEntry({ value: c }).map((entry) => ({
								...entry,
								path: [...path0, ...entry.path],
							}))
						: arbText
								.arbPatchEntry({ value: c })
								.map((e) => ({ ...e, path: [...e.path] }) as PatchEntry<never>),
				},
			);
		});
	};

	const adjustPatchEntry = (
		_value: DOMConstruction,
		_entry: PatchEntry<DOMConstruction>,
	) => {
		return null;
	};

	return {
		isValidPatchEntry,
		arbPatchEntry,
		adjustPatchEntry,
		arb: (
			arbValue?: fc.Arbitrary<DOMConstruction>,
			arrayConstraints?: fc.ArrayConstraints,
		) =>
			makeArbHelper({
				isValidPatchEntry,
				arbPatchEntry,
				adjustPatchEntry,
				arrayConstraints,
				arbValue: arbValue ?? arb0,
			}),
	};
};
