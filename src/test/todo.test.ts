import { PatchOp } from "../incr/patch";
import { TodoActionType, todoReducer } from "../todo_state";

describe("todoReducer", () => {
	it("should be identity function", () => {
		expect(todoReducer.invoke({ items: [] })).toStrictEqual({ items: [] });
		const todo1 = {
			items: [
				{ done: false, text: "item 1" },
				{ done: true, text: "item 2" },
			],
		};
		expect(todoReducer.invoke(todo1)).toStrictEqual(todo1);
	});

	it("should reduce add", () => {
		expect(
			todoReducer.forward(
				{ items: [{ done: true, text: "test 1" }] },
				{ type: TodoActionType.Add, value: "test 2" },
				{ items: [{ done: true, text: "test 1" }] },
			),
		).toStrictEqual([
			{
				op: PatchOp.Add,
				path: ["items", 1],
				value: { done: false, text: "test 2" },
			},
		]);
	});
});
