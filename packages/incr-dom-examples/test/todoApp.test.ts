import { describe, it } from "bun:test";
import fc from "fast-check";
import { atomicFunc } from "incr/src/incr/builder";
import { composeMemoL } from "incr/src/incr/compose/memo";
import * as gp from "incr/src/test/helpers/genPatched.test";
import { propsForIF } from "incr/src/test/helpers/props.test";
import { renderToString } from "incr-dom/render";
import { renderTodoApp } from "../server/app";
import {
	type TodoAction,
	TodoActionType,
	type TodoState,
	ViewFilter,
} from "../server/todo_state";

const _arbAction = (state: TodoState): fc.Arbitrary<TodoAction> => {
	const arbClear = fc.constant({ type: TodoActionType.Clear as const });
	const arbAdd = fc.record({
		type: fc.constant(TodoActionType.Add as const),
		value: fc.string(),
	});
	if (state.items.length === 0) {
		return fc.oneof(arbClear, arbAdd);
	}

	const arbId: fc.Arbitrary<string> = fc.constantFrom(
		...state.items.map((x) => x.id),
	);

	return fc.oneof(
		arbClear,
		arbAdd,
		fc.record({
			type: fc.constant(TodoActionType.SetDone as const),
			id: arbId,
			done: fc.boolean(),
		}),
		fc.record({
			type: fc.constant(TodoActionType.Remove as const),
			id: arbId,
			done: fc.boolean(),
		}),
		fc.record({
			type: fc.constant(TodoActionType.StartEditing as const),
			id: arbId,
		}),
		fc.record({ type: fc.constant(TodoActionType.StopEditing as const) }),
		fc.record({
			type: fc.constant(TodoActionType.EditText as const),
			value: fc.string(),
		}),
	);
};

const arbTodoState: gp.GenWithPatches<TodoState> = gp.record({
	counter: gp.integer({ min: 0 }),
	items: gp.array(
		gp.record({
			id: gp.atomic(fc.integer({ min: 0 }).map((i) => `id-${i}`)),
			done: gp.boolean(),
			text: gp.string(),
			editing: gp.atomic(fc.constant(false)),
		}),
		{ maxLength: 10 },
	),
	editingId: gp.atomic(
		fc.oneof(
			fc.constant(null),
			fc.integer({ min: 0 }).map((i) => `id-${i}`),
		),
	),
	viewFilter: gp.atomic(fc.constantFrom(...Object.values(ViewFilter))),
});

const DISPATCH = (_: TodoAction) => {};
const arbTodoStateDispatch = gp.record({
	state: arbTodoState,
	dispatch: gp.atomic(fc.constant(DISPATCH)),
});

describe("renderTodo", () => {
	propsForIF(it, arbTodoStateDispatch, () =>
		composeMemoL(renderTodoApp, atomicFunc(renderToString)),
	);
});
