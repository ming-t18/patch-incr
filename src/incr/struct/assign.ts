import { get } from "lodash-es";
import { type Patches, type Path, applyPatches, replacePatch } from "../patch";
import type { AnyIF, IF, InferIFInput, InferIFOutput } from "../types";

export const assign = <Input, Output>(
	getInitial: () => Output,
	changes: { path: Path; getValue: IF<Input, unknown> }[],
): IF<Input, Output> => {
	const evaluateAssign = (input: Input) => {
		let value: Output = getInitial();
		for (const { path, getValue } of changes) {
			value = applyPatches(value, replacePatch(getValue.evaluate(input), path));
		}
		return value;
	};

	const forwardAssign = (
		input: Input,
		dx: Patches<Input>,
		output: Output,
	): Patches<Output> => {
		const dy: Patches<Output> = [];
		for (const { path, getValue } of changes) {
			const dy1 = getValue.forward(input, dx, get(output, path));
			for (const entry of dy1) {
				dy.push({
					...entry,
					path: [...path, ...entry.path],
				} as never);
			}
		}
		return dy;
	};

	return {
		evaluate: evaluateAssign,
		forward: forwardAssign,
	};
};

const findPath = (
	obj: unknown,
	value: unknown,
	path: Path = [],
): Path | null => {
	if (obj instanceof TemplatePlaceholder) {
		return Object.is(obj, value) ? path : null;
	}

	if (Object.is(obj, value)) {
		return path;
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			const res = findPath(obj[i], value, [...path, i]);
			if (res !== null) {
				return res;
			}
		}
		return null;
	}

	if (obj !== null && typeof obj === "object") {
		for (const [key, objValue] of Object.entries(obj)) {
			const res = findPath(objValue, value, [...path, key]);
			if (res !== null) {
				return res;
			}
		}
		return null;
	}

	return null;
};

type InferTemplateSlots<Evals extends Record<string, IF<unknown, unknown>>> = {
	[key in keyof Evals]: InferIFOutput<Evals[key]>;
};

export class TemplatePlaceholder {
	constructor(public readonly label: string) {}

	toString(): string {
		return `TemplatePlaceholder(${this.label})`;
	}
}

const makePlaceholder = <T>(label: string) => {
	const prefix = `TemplatePlaceholder(${label}): cannot perform`;
	const placeholder = new TemplatePlaceholder(label);
	return new Proxy(placeholder, {
		apply() {
			throw new Error(`${prefix} apply`);
		},
		construct() {
			throw new Error(`${prefix} construct`);
		},
		defineProperty() {
			throw new Error(`${prefix} defineProperty`);
		},
		deleteProperty() {
			throw new Error(`${prefix} deleteProperty`);
		},
		get(_target, key) {
			throw new Error(
				`${prefix} get: ${typeof key === "symbol" ? "[Symbol]" : key}`,
			);
		},
		set(_target, key) {
			throw new Error(
				`${prefix} set: ${typeof key === "symbol" ? "[Symbol]" : key}`,
			);
		},
		has(_target, key) {
			throw new Error(
				`${prefix} has: ${typeof key === "symbol" ? "[Symbol]" : key}`,
			);
		},
		getOwnPropertyDescriptor() {
			throw new Error(`${prefix} getOwnPropertyDescriptor`);
		},
		isExtensible() {
			throw new Error(`${prefix} isExtensible`);
		},
		ownKeys() {
			throw new Error(`${prefix} ownKeys`);
		},
	}) as T;
};

/**
 * Creates an incremental function that is a potentially nested record with
 * specific slots being incremental functions from a single input to the output.
 *
 * This is a less verbose equivalent of using nested `record` or `tuple`.
 *
 * The `getTemplate` function is evaluated once during `IF` construction.
 *
 * @example
 * ```typescript
 * const f: IF<Input, ...> = template(
 *   {
 *     firstName: getFirstNameFromInput,
 *     lastName: getLastNameFrominput,
 *     tasks: getTasksFromInput,
 *   },
 *   ({ firstName, lastName, tasks }) => ({
 *     info: {
 *       fullName: { firstName, lastName },
 *       tasks
 *     }
 *   })
 * )
 * ```
 * @param varSlots An object of key-value pairs from variable names to an `IF` to compute their values.
 * @param getTemplate A callback from an object of the current values of the tempalte
 * to the output value.
 * @returns An `IF` from `Input` type to the `Output` type.
 */
export const template = <
	VarSlots extends Record<string, AnyIF>,
	Output,
	Input = {
		[key in keyof VarSlots]: InferIFInput<VarSlots[key]>;
	}[keyof VarSlots],
>(
	varSlots: VarSlots,
	getTemplate: (slots: InferTemplateSlots<VarSlots>) => Output,
): IF<Input, Output> => {
	type Slots = InferTemplateSlots<VarSlots>;
	const keys: (keyof VarSlots)[] = Object.keys(varSlots) as never;
	const inputSlots: Slots = {} as never;
	for (const key of keys) {
		inputSlots[key] = makePlaceholder(key as string) as never;
	}

	const template1: Output = getTemplate(inputSlots);
	const changes: { path: Path; getValue: IF<Input, unknown> }[] = [];
	const notTaken = new Set(keys);
	for (const key of keys) {
		const path = findPath(template1, inputSlots[key]);
		if (!path) {
			continue;
		}

		notTaken.delete(key);
		changes.push({
			path,
			getValue: varSlots[key] as never,
		});
	}

	const { forward } = assign(() => template1, changes);
	const evaluateTemplate = (input: Input): Output => {
		const slots: Slots = {} as never;
		for (const key of keys) {
			slots[key] = varSlots[key].evaluate(input);
		}
		return getTemplate(slots);
	};

	if (notTaken.size > 0) {
		const message = `template: Unable to locate the placeholders [${[...notTaken].join(", ")}]. Placeholders cannot be put into callbacks or conditionals.`;
		console.trace("template: Unable to locate placeholders.", {
			unableToLocate: notTaken,
			inputSlots,
			template1,
			changes,
		});
		throw new Error(message);
	}

	return {
		evaluate: evaluateTemplate,
		forward,
	};
};
