import { nullType, voidType } from "@/constant";

export const zeroType = voidType();
export type AZero = typeof zeroType;

export const unitType = nullType();
export type AUnit = typeof unitType;
