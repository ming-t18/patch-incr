import type { IF } from "../../types";
import { bind } from "../bind";
import { access } from "../struct/access";
import { length } from "./length";

export const last = <T>(): IF<T[], T> =>
	bind(length(), (n: number) => access(n - 1));
