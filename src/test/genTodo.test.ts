import fc from "fast-check";
import { type TodoAction, TodoActionType, type TodoState } from "../todo_state";

const arbText = fc.string({ maxLength: 80 });

export const arbTodoAction = (state: TodoState): fc.Arbitrary<TodoAction> => {
	const len = state.items.length;
	const arbNoIndex = fc.oneof(
		fc.constant({ type: TodoActionType.Clear }),
		fc.record({ type: fc.constant(TodoActionType.Add), text: arbText }),
		fc.constant({ type: TodoActionType.StopEditing }),
		fc.record({ type: fc.constant(TodoActionType.EditText), value: arbText }),
	);

	const arbWithIndex = (index: fc.Arbitrary<number>) =>
		fc.oneof(
			fc.record({
				type: fc.constant(TodoActionType.SetDone),
				index,
				done: fc.boolean(),
			}),
			fc.record({
				type: fc.constant(TodoActionType.Remove),
				index,
			}),
			fc.record({
				type: fc.constant(TodoActionType.StartEditing),
				index,
			}),
		);

	if (len === 0) {
		return arbNoIndex as never;
	}

	const arbIndex = fc.integer({ min: 0, max: len - 1 });
	return fc.oneof(
		{ weight: 4, arbitrary: arbNoIndex },
		{ weight: 3, arbitrary: arbWithIndex(arbIndex) },
	) as never;
};

const arbTodoItem = fc.record({
	done: fc.boolean(),
	text: arbText,
});

export const arbTodoState: fc.Arbitrary<TodoState> = fc
	.array(arbTodoItem, { maxLength: 20 })
	.chain((items) =>
		fc.record({
			items: fc.constant(items),
			editingIndex: fc.oneof(
				{ weight: 1, arbitrary: fc.constantFrom(undefined, null) },
				items.length === 0
					? { weight: 0, arbitrary: fc.constant(0) }
					: {
							weight: items.length,
							arbitrary: fc.integer({ min: 0, max: items.length - 1 }),
						},
			),
		}),
	);

export const arbTodoStateAction = arbTodoState.chain((state) =>
	fc.record({ state: fc.constant(state), action: arbTodoAction(state) }),
);
