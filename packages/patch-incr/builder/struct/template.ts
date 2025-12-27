import { assign } from "./assign";
import { identity } from "..";
import type { IF, InferIFOutput, AnyIF, InferIFInput } from "../../types";
import type { Path } from "../../patch";

function* findPaths(
	obj: unknown,
	value: unknown,
	path: Path = [],
): Generator<Path, void, void> {
	if (obj instanceof TemplatePlaceholder) {
		if (Object.is(obj, value)) {
			yield path;
		}
		return;
	}

	if (Object.is(obj, value)) {
		yield path;
		return;
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			yield* findPaths(obj[i], value, [...path, i]);
		}
		return;
	}

	if (obj !== null && typeof obj === "object") {
		for (const [key, objValue] of Object.entries(obj)) {
			yield* findPaths(objValue, value, [...path, key]);
		}
	}
}

/** A marker type for template placeholders. Not to be confused with `TemplatePlaceholder`. */
export type IsTemplatePlaceholder = { readonly __isTemplatePlaceholder?: unique symbol };

export type InferTemplateSlots<Evals extends Record<string, IF<unknown, unknown>>> = {
	[key in keyof Evals]: InferIFOutput<Evals[key]> & IsTemplatePlaceholder;
};

export class TemplatePlaceholder {
	constructor(public readonly label: string) {}

	toString(): string {
		return `TemplatePlaceholder(${this.label})`;
	}
}

const makePlaceholder = <T>(label: string) =>
	new TemplatePlaceholder(label) as never as T;

export const isTemplatePlaceholder = (x: unknown): x is TemplatePlaceholder =>
	x instanceof TemplatePlaceholder;

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
		const paths = [...findPaths(template1, inputSlots[key])];
		if (paths.length === 0) {
			continue;
		}

		notTaken.delete(key);
		for (const path of paths) {
			changes.push({
				path,
				getValue: varSlots[key] as never,
			});
		}
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

export const template0 = <X, Y>(func: (input: X) => Y) =>
	template({ value: identity<X>() }, ({ value }) => func(value));
