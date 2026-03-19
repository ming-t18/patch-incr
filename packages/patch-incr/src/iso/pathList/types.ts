export type { ByPath } from "@/uniqueTypes";

import type { Path } from "@/patch";
import type { IF } from "@/types";
import type { ByPath } from "@/uniqueTypes";

export const IsParentPath = Symbol.for("patch-incr:IsParentPath");
export type IsParentPath = typeof IsParentPath;

/**
 * Path acceptor for `PathListOptics`.
 * @returns
 * - `null` if the path is not accepted.
 * - a `Path` without the accepted prefix if the path is accepted
 */
export type AcceptPath = (path: Path) => Path | IsParentPath | null;

export interface PathListOptics<Input, Output> {
	func: IF<Input, ByPath<Output>>;
	acceptPath: AcceptPath;
}
