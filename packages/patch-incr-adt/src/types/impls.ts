import type { Apply, DRO } from "./algebra";

export interface DImpls<T, DT = DRO<T>> extends Apply<T, DT> {}
