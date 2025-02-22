import { describe, it } from "bun:test";
import fc from "fast-check";
import { forwardTodo, renderTodo } from "../../server/app";
import {
	todoReducerFunc,
} from "../todo_state";
import { ensureRenderPatchCoherent } from "./helpers.test";
import { arbTodoStateAction } from "./genTodo.test";

describe("renderTodo", () => {
	it("patch coherent", () => {
		fc.assert(
			fc.property(arbTodoStateAction, ({ state, action }) =>
				ensureRenderPatchCoherent(
					state,
					action,
					renderTodo,
					forwardTodo,
					todoReducerFunc,
				),
			),
		);
	});
});
