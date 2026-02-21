export const CONTEXT_ROOT = Symbol.for("$");

export const pipe = Symbol.for("S.pipe");

export const stream = Symbol.for("S.stream");

export const cond = Symbol.for("S.cond");

export const context = Symbol.for("S.context");

export const $ = context;

export const SYMBOLS = new Set<symbol>([pipe, stream, cond, context]);
