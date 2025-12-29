import {
	applyPatches,
	liftPatch,
	type Patches,
	PatchOp,
	type Path,
} from "../../patch";
import type { AnyIF, IF } from "../../types";
import { composeMemoL } from "../compose/memo";
import { accessPath } from "./access";
import { getTrackedPath, trackedProxy } from "./pathTracker";

export const Star = Symbol.for("patch-incr:*");

export type XTargetAccess<T> = T extends unknown[]
	? {
			[Star]: XTarget<T[keyof T]>;
		} & {
			[key in keyof T]: XTarget<T[key]>;
		}
	: T extends object
		? { [key in keyof T]: XTarget<T[key]> }
		: // biome-ignore lint/complexity/noBannedTypes: intentional
			{};

export type XTarget<T> = XTargetAccess<T> & { "~xtarget": T };

export interface UseFunc {
	<Type extends WeakKey, Output>(
		target: XTarget<Type>,
		func: IF<Type, Output>,
	): Output;
	<Type>(target: XTarget<Type>): Type;
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
	if (!path) {
		throw new Error(
			"xtemplate: use: Invalid first argument. Must be an access pattern on the target.",
		);
	}

	const fn = accessPath(path as Path);
	return new UsePlaceholder(arg2 ? composeMemoL(fn, arg2) : fn);
};

const ANTI_CAPTURE_MESSAGE = `xtemplate: anti-capture: The use-callback has been revoked. Do not call the use-callback inside a callback.`;
const KEY = "__ANTI_CAPTURE_REF";

export const xtemplate = <
	Input extends WeakKey,
	Output,
	Use extends UseFunc = UseFunc,
>(
	getXTemplate: XTemplateHandler<Input, Output>,
	useFunc = defaultUse as Use,
): XTemplate<Input, Output> => {
	const target = trackedProxy<XTarget<Input>>();
	const useRef = { [KEY]: useFunc };
	let root: Output;
	try {
		const antiCaptureGuard = (...args: unknown[]) => {
			if (!useRef[KEY]) {
				throw new Error(ANTI_CAPTURE_MESSAGE);
			}
			// @ts-expect-error Passing (...args)
			return useRef[KEY](...args);
		};
		root = getXTemplate(target, antiCaptureGuard);
	} finally {
		// @ts-expect-error intentionally unset this field
		useRef[KEY] = undefined;
	}

	const collected: [Path, AnyIF, WeakMap<Input, unknown>][] = [];
	const collect = (obj: unknown, path: Path) => {
		if (obj instanceof UsePlaceholder) {
			collected.push([path, obj.func, new WeakMap()]);
			return;
		}

		if (Array.isArray(obj)) {
			for (let i = 0; i < obj.length; i++) {
				collect(obj[i], [...path, i]);
			}
			return;
		}

		// TODO handle Map/Set

		if (obj !== null && typeof obj === "object") {
			for (const [key, objValue] of Object.entries(obj)) {
				collect(objValue, [...path, key]);
			}
		}
	};
	collect(root, []);

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
			liftPatch(path, func.forward(input, dx, memo.get(input))),
		);

	return {
		evaluate: evaluateXTemplate,
		forward: forwardXTemplate,
		slots: collected,
	};
};
