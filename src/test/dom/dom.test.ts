import { elem, elemEvents } from "../../dom/construct";
import { patchDOM, renderDOM } from "../../dom/patch";
import type { DOMConstruction, ElementConstruction } from "../../dom/types";
import {
	addPatch,
	applyPatches,
	type Patches,
	removePatch,
	replacePatch,
} from "../../incr/patch";

const domPatchCoherent = (
	domc: DOMConstruction,
	dDomc: Patches<DOMConstruction>,
) => {
	const rootRerendered = document.createElement("div");
	renderDOM(rootRerendered, applyPatches(domc, dDomc), false);
	const expectedHTML = rootRerendered.innerHTML;

	const rootPatched = document.createElement("div");
	renderDOM(rootPatched, domc, false);
	patchDOM(rootPatched, domc, dDomc);
	const actualHTML = rootRerendered.innerHTML;
	expect(actualHTML).toBe(expectedHTML);
};

describe("changing attributes", () => {
	it("should change attribute", () => {
		domPatchCoherent(
			elem("div", { id: "id1" }),
			replacePatch("id2", ["attrs", "id"]),
		);
	});

	it("should add attribute with Replace patch", () => {
		domPatchCoherent(
			elem("div", { id: "id1" }),
			replacePatch("cls1", ["attrs", "class"]),
		);
	});

	it("should add attribute with Add patch", () => {
		domPatchCoherent(
			elem("div", { id: "id1" }),
			addPatch("cls1", ["attrs", "class"]),
		);
	});

	it("should remove attribute with Remove patch", () => {
		domPatchCoherent(elem("div", { id: "id1" }), removePatch(["attrs", "id"]));
	});

	it("should do nothing when removing absent attribute", () => {
		domPatchCoherent(elem("div", {}), removePatch(["attrs", "id"]));
	});

	it("should delete all attributes", () => {
		domPatchCoherent(
			elem("div", { id: "id1", class: "cls1 cls2", style: "color: green;" }),
			removePatch(["attrs"]),
		);
	});

	it("should add all attributes", () => {
		domPatchCoherent(
			elem("div"),
			replacePatch(
				{
					id: "id2",
					"aria-hidden": "true",
				},
				["attrs"],
			),
		);
	});

	it("should replace all attributes", () => {
		domPatchCoherent(
			elem("div", { id: "id1", class: "cls1 cls2" }),
			replacePatch(
				{
					id: "id2",
					"aria-hidden": "true",
				},
				["attrs"],
			),
		);
	});
});

describe("changing events", () => {
	let root: HTMLDivElement;
	let onClick1: jest.Mock<void, []>;
	let onClick2: jest.Mock<void, []>;
	let domc: ElementConstruction;

	beforeEach(() => {
		onClick1 = jest.fn();
		onClick2 = jest.fn();

		root = document.createElement("div");
		domc = elemEvents(
			"div",
			{},
			{
				click: onClick1,
			},
		);
		renderDOM(root, domc);
	});

	it("should add new event handler", () => {
		const onKeyDown1 = jest.fn();
		root.firstChild?.dispatchEvent(new Event("keydown"));
		expect(onClick1).toBeCalledTimes(0);
		expect(onKeyDown1).toBeCalledTimes(0);

		patchDOM(root, domc, addPatch(onKeyDown1, ["events", "keydown"]));
		root.firstChild?.dispatchEvent(new Event("keydown"));
		expect(onClick1).toBeCalledTimes(0);
		expect(onKeyDown1).toBeCalledTimes(1);

		root.firstChild?.dispatchEvent(new Event("click"));
		expect(onClick1).toBeCalledTimes(1);
		expect(onKeyDown1).toBeCalledTimes(1);
	});

	it("should replace event handler", () => {
		root.firstChild?.dispatchEvent(new Event("click"));
		expect(onClick1).toBeCalledTimes(1);
		expect(onClick2).toBeCalledTimes(0);

		patchDOM(root, domc, replacePatch(onClick2, ["events", "click"]));
		root.firstChild?.dispatchEvent(new Event("click"));
		expect(onClick1).toBeCalledTimes(1);
		expect(onClick2).toBeCalledTimes(1);
	});

	it("should remove event handler", () => {
		root.firstChild?.dispatchEvent(new Event("click"));
		expect(onClick1).toBeCalledTimes(1);
		expect(onClick2).toBeCalledTimes(0);

		patchDOM(root, domc, removePatch(["events", "click"]));
		root.firstChild?.dispatchEvent(new Event("click"));
		expect(onClick1).toBeCalledTimes(1);
		expect(onClick2).toBeCalledTimes(0);
	});
});
