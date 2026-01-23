import {
	addPatches,
	applyPatches,
	type Patches,
	removePatches,
	replacePatches,
} from "patch-incr/patch";
import { IndexEnd } from "patch-incr/patchSchema/types";
import { elem, elem0, elemEvents } from "../construct";
import { patchDOM, renderDOM } from "../patch";
import type { DOMConstruction, ElementConstruction } from "../types";

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

const shouldSkip = typeof document !== "object";
if (shouldSkip) {
	console.warn("document not found, skipping all DOM tests.");
}

(shouldSkip ? describe.skip : describe)("patching DOM", () => {
	describe("changing attributes", () => {
		it("should change attribute", () => {
			domPatchCoherent(
				elem("div", { id: "id1" }),
				replacePatches("id2", ["attrs", "id"]),
			);
		});

		it("should add attribute with Replace patch", () => {
			domPatchCoherent(
				elem("div", { id: "id1" }),
				replacePatches("cls1", ["attrs", "class"]),
			);
		});

		it("should add attribute with Add patch", () => {
			domPatchCoherent(
				elem("div", { id: "id1" }),
				addPatches("cls1", ["attrs", "class"]),
			);
		});

		it("should remove attribute with Remove patch", () => {
			domPatchCoherent(
				elem("div", { id: "id1" }),
				removePatches(["attrs", "id"]),
			);
		});

		it("should do nothing when removing absent attribute", () => {
			domPatchCoherent(elem("div", {}), removePatches(["attrs", "id"]));
		});

		it("should delete all attributes", () => {
			domPatchCoherent(
				elem("div", { id: "id1", class: "cls1 cls2", style: "color: green;" }),
				removePatches(["attrs"]),
			);
		});

		it("should add all attributes", () => {
			domPatchCoherent(
				elem("div"),
				replacePatches(
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
				replacePatches(
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
			expect(onClick1).toHaveBeenCalledTimes(0);
			expect(onKeyDown1).toHaveBeenCalledTimes(0);

			patchDOM(root, domc, addPatches(onKeyDown1, ["events", "keydown"]));
			root.firstChild?.dispatchEvent(new Event("keydown"));
			expect(onClick1).toHaveBeenCalledTimes(0);
			expect(onKeyDown1).toHaveBeenCalledTimes(1);

			root.firstChild?.dispatchEvent(new Event("click"));
			expect(onClick1).toHaveBeenCalledTimes(1);
			expect(onKeyDown1).toHaveBeenCalledTimes(1);
		});

		it("should replace event handler", () => {
			root.firstChild?.dispatchEvent(new Event("click"));
			expect(onClick1).toHaveBeenCalledTimes(1);
			expect(onClick2).toHaveBeenCalledTimes(0);

			patchDOM(root, domc, replacePatches(onClick2, ["events", "click"]));
			root.firstChild?.dispatchEvent(new Event("click"));
			expect(onClick1).toHaveBeenCalledTimes(1);
			expect(onClick2).toHaveBeenCalledTimes(1);
		});

		it("should remove event handler", () => {
			root.firstChild?.dispatchEvent(new Event("click"));
			expect(onClick1).toHaveBeenCalledTimes(1);
			expect(onClick2).toHaveBeenCalledTimes(0);

			patchDOM(root, domc, removePatches(["events", "click"]));
			root.firstChild?.dispatchEvent(new Event("click"));
			expect(onClick1).toHaveBeenCalledTimes(1);
			expect(onClick2).toHaveBeenCalledTimes(0);
		});
	});

	describe("changing children", () => {
		it("should replace all children", () => {
			domPatchCoherent(
				elem("div", { id: "id1" }, ["text1"]),
				replacePatches([elem0("em", ["updated"])], ["children"]),
			);
		});

		it("should remove all children", () => {
			domPatchCoherent(elem("div", { id: "id1" }), removePatches(["children"]));
		});

		describe("children is a list of elements", () => {
			const listElem = elem("ol", { id: "list1" }, [
				elem0("li", ["child1"]),
				elem0("li", ["child2"]),
				elem0("li", ["child3"]),
			]);

			describe("should insert new child", () => {
				const newChild = elem0("li", ["newChild"]);
				it("in the beginning", () => {
					domPatchCoherent(listElem, addPatches(newChild, ["children", 0]));
				});

				it("in the middle", () => {
					domPatchCoherent(listElem, addPatches(newChild, ["children", 1]));
				});

				it("in the end by index", () => {
					domPatchCoherent(listElem, addPatches(newChild, ["children", 2]));
				});

				it(`in the end by ${IndexEnd} path`, () => {
					domPatchCoherent(
						listElem,
						addPatches(newChild, ["children", IndexEnd]),
					);
				});
			});

			describe("should replace child", () => {
				const replacedChild = elem0("li", ["replacecChild"]);
				it("in the beginning", () => {
					domPatchCoherent(
						listElem,
						replacePatches(replacedChild, ["children", 0]),
					);
				});

				it("in the middle", () => {
					domPatchCoherent(
						listElem,
						replacePatches(replacedChild, ["children", 1]),
					);
				});

				it("in the end", () => {
					domPatchCoherent(
						listElem,
						replacePatches(replacedChild, ["children", 2]),
					);
				});
			});

			describe("should remove child", () => {
				it("in the beginning", () => {
					domPatchCoherent(listElem, removePatches(["children", 0]));
				});

				it("in the middle", () => {
					domPatchCoherent(listElem, removePatches(["children", 1]));
				});

				it("in the end", () => {
					domPatchCoherent(listElem, removePatches(["children", 2]));
				});
			});
		});

		const newChilds = [
			{ label: "element", child: elem0("span", ["test"]) },
			{ label: "text string", child: "string" },
			{ label: "empty string", child: "" },
			{ label: "whitespace string", child: "  " },
			{ label: "non-string", child: 12n },
		];

		const parents: { label: string; parent: ElementConstruction }[] = [
			{
				label: "list of text nodes",
				parent: elem0("p", ["text ", 1, ". "]),
			},
			{
				label: "mix of text nodes and elements",
				parent: elem0("p", ["text ", 1, ". ", "", elem0("em", ["test"]), 1]),
			},
		];

		for (const { label: label0, parent } of parents) {
			describe(`children is a ${label0}`, () => {
				for (const { label, child } of newChilds) {
					describe(`should insert new ${label} child`, () => {
						it("in the beginning", () => {
							domPatchCoherent(parent, addPatches(child, ["children", 0]));
						});

						it("in the middle 1", () => {
							domPatchCoherent(parent, addPatches(child, ["children", 1]));
						});

						it("in the middle 2", () => {
							domPatchCoherent(parent, addPatches(child, ["children", 2]));
						});

						it("in the end by index", () => {
							domPatchCoherent(parent, addPatches(child, ["children", 3]));
						});

						it(`in the end by ${IndexEnd}`, () => {
							domPatchCoherent(
								parent,
								addPatches(child, ["children", IndexEnd]),
							);
						});
					});

					describe("should replace existing child", () => {
						it("in the beginning", () => {
							domPatchCoherent(parent, replacePatches(child, ["children", 0]));
						});

						it("in the middle 1", () => {
							domPatchCoherent(parent, replacePatches(child, ["children", 1]));
						});

						it("in the middle 2", () => {
							domPatchCoherent(parent, replacePatches(child, ["children", 2]));
						});
					});
				}
			});
		}
	});
});
