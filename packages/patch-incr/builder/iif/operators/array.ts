import * as A from "@/builder/array";
import { composeMemo } from "@/builder/compose";
import * as Pair from "@/builder/pair";
import { compile } from "../compile";
import { METHOD_HANDLERS } from "../node";
import { makeOpSingle } from "./builder";

export const length = makeOpSingle(A.length);

export const map = <Input extends WeakKey, Output>(
	f: (value: Input) => Output,
) => makeOpSingle(() => A.map(compile(f)));

export const filter = <Input>(f: (value: Input) => boolean) =>
	makeOpSingle(() => composeMemo(A.filter(f), Pair.fst()));

METHOD_HANDLERS.map = map;
METHOD_HANDLERS.filter = filter;
