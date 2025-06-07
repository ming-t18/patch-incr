import { describe, it } from "bun:test";
import fc from "fast-check";
import { renderTodo } from "../../server/app";
// import { forwardTodo, renderTodo } from "../../server/app";
import { todoReducerFunc } from "../todo_state";
import { arbTodoStateAction, arbTodoStateDispatchAction } from "./genTodo.test";
import { propsForIF } from "./helpers/props.test";

describe("renderTodo", () => {
	propsForIF(it, arbTodoStateDispatchAction(), () => renderTodo);
});
