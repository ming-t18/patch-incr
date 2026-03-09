import type { Path } from "./patch/types";

/** Like an array, except elements must be unique. */
export type Distinct<K> = K[];

/** A list of key-value pairs where the keys must be unique. */
export type Entries<K, V> = [K, V][];

/** A list of path-value pairs. The paths must be distinct. */
export type ByPath<V> = [Path, V][];
