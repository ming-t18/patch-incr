import I from "immutable";
import { enableImmutableJs } from "patch-incr/patch";
import {
	type ImmList,
	type ImmMap,
	type ImmSet,
	listClasses,
	mapClasses,
	setClasses,
} from "patch-incr/patch/immJs";

enableImmutableJs();
listClasses.add(I.List);
mapClasses.add(I.Map);
setClasses.add(I.Set);

const _Test1 = I.List<number>() satisfies ImmList<number>;
const _Test2 = I.Map<number, string>() satisfies ImmMap<number, string>;
const _Test3 = I.Set<string>() satisfies ImmSet<string>;
