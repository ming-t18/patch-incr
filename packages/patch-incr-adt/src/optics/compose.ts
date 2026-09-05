import * as B from "@/funcs/basic";
import { Option } from "@/modules";
import type { $A } from "@/types";
import {
	type IAdapter,
	type IAffine,
	type ILens,
	type IPrism,
	type IReaderOptics,
	OpticsKind,
} from "./types";

export const composeModify =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: Pick<ILens<S, T, A, B>, "modify">,
	) =>
	<C extends $A, D extends $A>(
		right: Pick<ILens<A, B, C, D>, "modify">,
	): ILens<S, T, C, D>["modify"] =>
	(f) =>
		left.modify(right.modify(f));

// region Conversion

export const lensFromAdapter = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
>(
	adapter: IAdapter<S, T, A, B>,
): ILens<S, T, A, B> => ({
	optics: OpticsKind.Lens,
	get: adapter.fwd,
	modify: adapter.modify,
});

export const prismFromAdapter = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
>(
	adapter: IAdapter<S, T, A, B>,
): IPrism<S, T, A, B> => ({
	optics: OpticsKind.Prism,
	getOpt: B.compose(adapter.fwd, Option.introSome(adapter.fwd.output)),
	review: adapter.inv,
	modify: adapter.modify,
});

export const affineFromAdapter = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
>(
	adapter: IAdapter<S, T, A, B>,
): IAffine<S, T, A, B> => ({
	optics: OpticsKind.Affine,
	getOpt: B.compose(adapter.fwd, Option.introSome(adapter.fwd.output)),
	modify: adapter.modify,
});

export const affineFromLens = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
>(
	lens: ILens<S, T, A, B>,
): IAffine<S, T, A, B> => ({
	optics: OpticsKind.Affine,
	getOpt: B.compose(lens.get, Option.introSome(lens.get.output)),
	modify: lens.modify,
});

export const affineFromPrism = <
	S extends $A,
	T extends $A,
	A extends $A,
	B extends $A,
>(
	prism: IPrism<S, T, A, B>,
): IAffine<S, T, A, B> => ({
	optics: OpticsKind.Affine,
	getOpt: prism.getOpt,
	modify: prism.modify,
});

// endregion

// region Adapter

export const composeAdapter =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IAdapter<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IAdapter<A, B, C, D>,
	): IAdapter<S, T, C, D> => ({
		optics: OpticsKind.Adapter,
		fwd: B.composeA(left.fwd, right.fwd),
		inv: B.composeA(right.inv, left.inv),
		modify: composeModify(left)(right),
	});

export const composeLensAdapter =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: ILens<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IAdapter<A, B, C, D>,
	): ILens<S, T, C, D> => ({
		optics: OpticsKind.Lens,
		get: B.composeA(left.get, right.fwd),
		modify: composeModify(left)(right),
	});

export const composePrismAdapter =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IPrism<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IAdapter<A, B, C, D>,
	): IPrism<S, T, C, D> => ({
		optics: OpticsKind.Prism,
		getOpt: B.composeA(left.getOpt, Option.mapA(left.getOpt.output)(right.fwd)),
		review: B.compose(right.inv, left.review),
		modify: composeModify(left)(right),
	});

export const composeAffineAdapter =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IAffine<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IAdapter<A, B, C, D>,
	): IAffine<S, T, C, D> => ({
		optics: OpticsKind.Affine,
		getOpt: B.composeA(left.getOpt, Option.mapA(left.getOpt.output)(right.fwd)),
		modify: composeModify(left)(right),
	});

// endregion

// region Lens

export const composeAdapterLens =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IAdapter<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: ILens<A, B, C, D>,
	): ILens<S, T, C, D> => ({
		optics: OpticsKind.Lens,
		get: B.composeA(left.fwd, right.get),
		modify: composeModify(left)(right),
	});

export const composeLens =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: ILens<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: ILens<A, B, C, D>,
	): ILens<S, T, C, D> => ({
		optics: OpticsKind.Lens,
		get: B.composeA(left.get, right.get),
		modify: composeModify(left)(right),
	});

export const composePrismLens =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IPrism<S, T, A, B> | IAffine<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: ILens<A, B, C, D>,
	): IAffine<S, T, C, D> => ({
		optics: OpticsKind.Affine,
		getOpt: B.composeA(left.getOpt, Option.mapA(left.getOpt.output)(right.get)),
		modify: composeModify(left)(right),
	});

export const composeAffineLens =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IPrism<S, T, A, B> | IAffine<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: ILens<A, B, C, D>,
	): IAffine<S, T, C, D> => ({
		optics: OpticsKind.Affine,
		getOpt: B.composeA(left.getOpt, Option.mapA(left.getOpt.output)(right.get)),
		modify: composeModify(left)(right),
	});

// endregion

// region Prism

export const composePrism =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IPrism<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IPrism<A, B, C, D>,
	): IPrism<S, T, C, D> => ({
		optics: OpticsKind.Prism,
		getOpt: Option.composeA(left.getOpt, right.getOpt),
		review: B.composeA(right.review, left.review),
		modify: composeModify(left)(right),
	});

export const composeAdapterPrism =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IAdapter<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IPrism<A, B, C, D>,
	): IPrism<S, T, C, D> => ({
		optics: OpticsKind.Prism,
		getOpt: B.composeA(left.fwd, right.getOpt),
		review: B.composeA(right.review, left.inv),
		modify: composeModify(left)(right),
	});

// endregion

// region Affine

export const composeAffine =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IAffine<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IAffine<A, B, C, D>,
	): IAffine<S, T, C, D> => ({
		optics: OpticsKind.Affine,
		getOpt: Option.composeA(left.getOpt, right.getOpt),
		modify: composeModify(left)(right),
	});

export const composeAdapterAffine =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IAdapter<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IAffine<A, B, C, D>,
	): IAffine<S, T, C, D> => ({
		optics: OpticsKind.Affine,
		getOpt: B.composeA(left.fwd, right.getOpt),
		modify: composeModify(left)(right),
	});

export const composeLensAffine =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: ILens<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IAffine<A, B, C, D>,
	): IAffine<S, T, C, D> => ({
		optics: OpticsKind.Affine,
		getOpt: B.composeA(left.get, right.getOpt),
		modify: composeModify(left)(right),
	});

// endregion

export const compose =
	<S extends $A, T extends $A, A extends $A, B extends $A>(
		left: IReaderOptics<S, T, A, B>,
	) =>
	<C extends $A, D extends $A>(
		right: IReaderOptics<A, B, C, D>,
	): IReaderOptics<S, T, C, D> => {
		if (left.optics === OpticsKind.Adapter) {
			if (right.optics === OpticsKind.Adapter) {
				return composeAdapter(left)(right);
			}
			if (right.optics === OpticsKind.Lens) {
				return composeAdapterLens(left)(right);
			}
			if (right.optics === OpticsKind.Prism) {
				return composeAdapterPrism(left)(right);
			}
			if (right.optics === OpticsKind.Affine) {
				return composeAdapterAffine(left)(right);
			}
			throw new Error("Optics.compose: not defined");
		}
		if (left.optics === OpticsKind.Lens) {
			if (right.optics === OpticsKind.Adapter) {
				return composeLensAdapter(left)(right);
			}
			if (right.optics === OpticsKind.Lens) {
				return composeLens(left)(right);
			}
			if (right.optics === OpticsKind.Prism) {
				return composeLensAffine(left)(affineFromPrism(right));
			}
			if (right.optics === OpticsKind.Affine) {
				return composeLensAffine(left)(right);
			}
			throw new Error("Optics.compose: not defined");
		}
		if (left.optics === OpticsKind.Prism) {
			if (right.optics === OpticsKind.Adapter) {
				return composePrismAdapter(left)(right);
			}
			if (right.optics === OpticsKind.Lens) {
				return composePrismLens(left)(right);
			}
			if (right.optics === OpticsKind.Prism) {
				return composePrism(left)(right);
			}
			if (right.optics === OpticsKind.Affine) {
				return composeAffine(affineFromPrism(left))(right);
			}
			throw new Error("Optics.compose: not defined");
		}
		if (left.optics === OpticsKind.Affine) {
			if (right.optics === OpticsKind.Adapter) {
				return composeAffineAdapter(left)(right);
			}
			if (right.optics === OpticsKind.Lens) {
				return composeAffineLens(left)(right);
			}
			if (right.optics === OpticsKind.Prism) {
				return composeAffine(left)(affineFromPrism(right));
			}
			if (right.optics === OpticsKind.Affine) {
				return composeAffine(left)(right);
			}
			throw new Error("Optics.compose: not defined");
		}

		throw new Error("Optics.compose: not defined");
	};
