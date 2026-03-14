export type { ByPath } from "@/uniqueTypes";

import type { IF } from "@/types";
import type { ByPath } from "@/uniqueTypes";

export type PathListOptics<Input, Output> = IF<Input, ByPath<Output>>;
