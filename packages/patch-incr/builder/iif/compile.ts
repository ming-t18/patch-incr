import type { Compile } from "./types";

const _compile: { current: Compile } = {
	current: (_arg) => {
		throw new Error("compile: uninitialized");
	},
};

export const compile: Compile = <Input extends WeakKey, Output>(
	f1: (value: Input) => Output,
) => _compile.current(f1);

export const setCompile = (func: Compile) => {
	_compile.current = func;
};
