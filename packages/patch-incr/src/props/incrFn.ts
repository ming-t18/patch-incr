import type { IF, PatchCoherentParams, Patches } from "./types";

/**
 * # Patch coherence property
 *
 * The fundamental property of patch-based incremental computation.
 * The forwarded patch must be consistent with re-applying the function
 * with the updated value.
 *
 * This property does not check of the patches are efficient, since a
 * trivial implementation of `forward` with a replace-patch passes this property.
 *
 * `f(x @ dx) = f(x) @ dy` where `dy = f'(x)`.
 *
 * `f(...)` is evaluated with `.evaluate` and `f'(...)` is evaluated with `.forward`.
 */
export const patchCoherent = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: IF<X, Y, DX, DY>,
	x: X,
	dx: DX,
	{
		equalsY,
		schemaX: { apply: applyX },
		schemaY: { apply: applyY },
	}: PatchCoherentParams<X, Y, DX, DY>,
): boolean => {
	const y = f.evaluate(x);
	const dy = f.forward(x, dx, y);
	const y1A = f.evaluate(applyX(x, dx));
	const y1F = applyY(y, dy);
	return equalsY(y1F, y1A);
};

export const emptyForwardsToEmpty = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: IF<X, Y, DX, DY>,
	x: X,
	{ schemaX, schemaY }: Omit<PatchCoherentParams<X, Y, DX, DY>, "equalsY">,
): boolean => {
	const y = f.evaluate(x);
	const dx = schemaX.empty;
	const dy = f.forward(x, dx, y);
	return schemaY.isEmpty(dy);
};

export const replaceForwardsToReplace = <
	X,
	Y,
	DX = Patches<X>,
	DY = Patches<Y>,
>(
	f: IF<X, Y, DX, DY>,
	x: X,
	x1: X,
	{ schemaX, schemaY }: Omit<PatchCoherentParams<X, Y, DX, DY>, "equalsY">,
): boolean => {
	const y = f.evaluate(x);
	const dx = schemaX.fromReplace(x1);
	const dy = f.forward(x, dx, y);
	return schemaY.isReplace(dy) !== null;
};

export const patchCoherentCompose = <X, Y, DX = Patches<X>, DY = Patches<Y>>(
	f: IF<X, Y, DX, DY>,
	x: X,
	dx1: DX,
	dx2: DX,
	{ equalsY, schemaX, schemaY }: PatchCoherentParams<X, Y, DX, DY>,
): boolean => {
	//          @dx3
	//   /----------------\
	//  /                  v
	//  x -----> x1 -----> x2
	//  |   ||    |   ||    |
	//  |   ||    |   ||    |
	//  v   \/    v   \/    v
	//  y -----> y1 -----> y2
	//  \                  ^
	//   \----------------/
	//         @dy3
	const y = f.evaluate(x);
	const dy1 = f.forward(x, dx1, y);
	const x1 = schemaX.apply(x, dx1);
	const y1 = f.evaluate(x1);
	const dy2 = f.forward(x1, dx2, y1);
	const dx3 = schemaX.combine(dx1, dx2);
	const dy3 = f.forward(x, dx3, y);
	return equalsY(
		schemaY.apply(y, dy3),
		schemaY.apply(y, schemaY.combine(dy1, dy2)),
	);
};
