/** Given a `() => T` method, memo the value into `this[field]`. */
export const memoIntoField = <
	F extends (this: This) => T,
	This extends object,
	T,
>(
	field: string | symbol,
	func: F,
) => {
	return function (this: This): T {
		if (Object.hasOwn(this, field)) {
			// @ts-expect-error accessing field
			return this[field] as T;
		}
		const y: T = func.bind(this)();
		// @ts-expect-error accessing field
		this[field] = y;
		return y;
	};
};

export const hasGetter = (obj: object, prop: string | symbol | number) => {
	const d = Object.getOwnPropertyDescriptor(obj, prop);
	return !!d?.get;
};
