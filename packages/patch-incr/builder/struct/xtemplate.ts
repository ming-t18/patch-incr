import {
	applyPatches,
	liftPatches,
	type Patches,
	PatchOp,
	type Path,
	patchableEntries,
} from "../../patch";
import type { AnyIF, IF } from "../../types";
import { composeMemo } from "../compose/memo";
import { accessPath } from "./access";
import { getTrackedPath, isPathTracker, trackedProxy } from "./pathTracker";

type EmptyObj = Record<string, never>;

export type XTargetAccess<T> = T extends unknown[]
	? {
			[key in keyof T]: XTarget<T[key]>;
		}
	: T extends object
		? { [key in keyof T]: XTarget<T[key]> }
		: EmptyObj;

export type XTarget<T> = XTargetAccess<T> & { "~xtarget": T };

export interface UseFunc {
	<Type extends WeakKey, Output>(
		target: XTarget<Type> | Type,
		func: IF<Type, Output>,
	): Output;
	<Type>(target: XTarget<Type> | Type): Type;
}

export type XTemplateHandler<Input, Output> = (
	target: XTarget<Input>,
	use: UseFunc,
) => Output;

export class UsePlaceholder<Input, Output> {
	constructor(public readonly func: IF<Input, Output>) {}
}

export interface XTemplate<Input extends WeakKey, Output>
	extends IF<Input, Output> {
	slots: ReadonlyArray<
		Readonly<[Path, IF<Input, unknown>, WeakMap<Input, unknown>]>
	>;
}

const defaultUse = (arg1: unknown, arg2?: AnyIF) => {
	const path = getTrackedPath(arg1);
	const fn = path ? accessPath(path as Path) : xtemplate(() => arg1);
	return new UsePlaceholder(arg2 ? composeMemo(fn, arg2) : fn);
};

const ANTI_CAPTURE_MESSAGE = `xtemplate: anti-capture: The use-callback has been revoked. Do not call the use-callback inside a callback.`;
const KEY = "__ANTI_CAPTURE_REF";

export type SlotTuple<Input extends WeakKey = WeakKey> = [
	Path,
	AnyIF,
	WeakMap<Input, unknown>,
];

const withAntiCapture = <T extends (...args: never[]) => unknown, R>(
	useFunc: T,
	func: (guard: T) => R,
) => {
	const ref = { [KEY]: useFunc };
	try {
		const antiCaptureGuard = (...args: never[]) => {
			if (!ref[KEY]) {
				throw new Error(ANTI_CAPTURE_MESSAGE);
			}
			return ref[KEY](...args);
		};
		return func(antiCaptureGuard as never as T);
	} finally {
		// @ts-expect-error intentionally unset this field
		ref[KEY] = undefined;
	}
};

function* collectSlots<Input extends WeakKey = WeakKey>(
	obj: unknown,
	path = [] as Path,
): Generator<SlotTuple<Input>> {
	if (obj instanceof UsePlaceholder) {
		yield [path, obj.func, new WeakMap()] as SlotTuple<Input>;
		return;
	}

	if (!(obj !== null && typeof obj === "object")) {
		return;
	}

	if (isPathTracker(obj)) {
		throw new TypeError(
			`Do not pass the target into the template object. Path: ${path.map((x) => String(x)).join(", ")}`,
		);
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			yield* collectSlots(obj[i], [...path, i]);
		}
		return;
	}

	for (const [key, objValue] of patchableEntries(obj)) {
		yield* collectSlots(objValue, [...path, key]);
	}
}

export function xtemplate<Input extends WeakKey, Output>(
	getXTemplate: XTemplateHandler<Input, Output>,
	useFunc = defaultUse,
): XTemplate<Input, Output> {
	const target = trackedProxy<XTarget<Input>>();
	const root: Output = withAntiCapture(useFunc, (guard) =>
		getXTemplate(target, guard),
	);

	const collected: SlotTuple<Input>[] = [];
	for (const entry of collectSlots(root)) {
		collected.push(entry);
	}

	const evaluateXTemplate = (input: Input): Output =>
		applyPatches(
			root,
			collected.map(([path, func, memo]) => {
				const value = func.evaluate(input);
				memo.set(input, value);
				return {
					op: PatchOp.Replace,
					path,
					value,
				};
			}),
		);

	const forwardXTemplate = (
		input: Input,
		dx: Patches<Input>,
	): Patches<Output> =>
		collected.flatMap(([path, func, memo]) =>
			liftPatches(path, func.forward(input, dx, memo.get(input))),
		);

	return {
		evaluate: evaluateXTemplate,
		forward: forwardXTemplate,
		slots: collected,
	};
}
