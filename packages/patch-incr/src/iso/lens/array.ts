import * as Arr from "../array";
import { compose } from "../builder";
import type { IIsoLens } from "./types";

export const mapLens = <A, B, R>(
	lens: IIsoLens<A, B, R>,
): IIsoLens<A[], B[], R[]> => compose(Arr.map(lens), Arr.unzip());
