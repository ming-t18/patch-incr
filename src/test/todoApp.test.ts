import { describe, it } from "bun:test";
import fc from "fast-check";
// import { forwardTodo, renderTodo } from "../../server/app";
import { todoReducerFunc } from "../todo_state";
import { arbTodoStateAction } from "./genTodo.test";
import { ensureRenderPatchCoherent } from "./helpers/props.test";

describe.skip("renderTodo", () => {
	// TODO doesn't work: event handlers
	// it.skip("patch coherent", () => {
	// 	fc.assert(
	// 		fc.property(arbTodoStateAction, ({ state, action }) =>
	// 			ensureRenderPatchCoherent(
	// 				state,
	// 				action,
	// 				renderTodo,
	// 				forwardTodo,
	// 				todoReducerFunc,
	// 			),
	// 		),
	// 	);
	// });
});
