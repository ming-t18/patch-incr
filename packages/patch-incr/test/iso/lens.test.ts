import { atomicFunc, identity } from "@/builder";
import * as Arr from "@/builder/array";
import { type IIsoLens, LensAccess, LensApply, LensArray } from "@/iso/lens";
import * as gp from "../helpers/genPatched.test";

const schema = gp.record({
	selected: gp.integer(),
	items: gp.array(
		gp.record({
			id: gp.integer(),
			text: gp.string(),
		}),
		{ maxLength: 10 },
	),
});
type Input = gp.InferArbValue<typeof schema>;
type Item = Input["items"][number];

describe("test lens", () => {
	const input: Input = {
		selected: 10,
		items: [
			{
				id: 1,
				text: "abc",
			},
			{
				id: 1,
				text: "xyz",
			},
			{
				id: 5,
				text: "def",
			},
			{
				id: 10,
				text: "ghi",
			},
			{
				id: 12,
				text: "jkl",
			},
		],
	};
	const getItems = LensAccess.accessKeyGeneric("items");
	const getText = LensAccess.accessKeyGeneric("text");
	const getId = LensAccess.accessKeyGeneric("id");
	const getTexts: IIsoLens<Input, string[]> = LensApply.composeLens(
		getItems<Item[], Input>(),
		LensArray.mapLens(getText()),
	);
	const _ids: IIsoLens<Input, number[]> = LensApply.composeLens(
		getItems<Item[], Input>(),
		LensArray.mapLens(getId()),
	);
	const getTextsG = <
		Text,
		TItem extends { text: Text },
		T extends { items: TItem[] },
	>() =>
		LensApply.composeLens(
			getItems<TItem[], T>(),
			LensArray.mapLens(getText<Text, TItem>()),
		);

	it("get example", () => {
		console.log(LensApply.get(getTexts).evaluate(input));
	});
	it("set on id example", () => {
		console.log(LensApply.set(getTexts, identity()).evaluate(input));
	});
	it("set example", () => {
		const map1 = Arr.map<string, string>(
			atomicFunc((x: string) => x.toUpperCase()),
		);
		expect(LensApply.set(getTexts, map1).evaluate(input)).toStrictEqual({
			selected: 10,
			items: [
				{
					id: 1,
					text: "ABC",
				},
				{
					id: 1,
					text: "XYZ",
				},
				{
					id: 5,
					text: "DEF",
				},
				{
					id: 10,
					text: "GHI",
				},
				{
					id: 12,
					text: "JKL",
				},
			],
		});
	});
	it("set example, changing type of the text", () => {
		const map1 = Arr.map<string, number>(atomicFunc((x: string) => x.length));
		expect(
			LensApply.set1(
				getTextsG<string, Item, Input>(),
				getTextsG<
					number,
					{ id: number; text: number },
					Omit<Input, "items"> & { items: { id: number; text: number }[] }
				>(),
				map1,
			).evaluate(input),
		).toStrictEqual({
			selected: 10,
			items: [
				{
					id: 1,
					text: 3,
				},
				{
					id: 1,
					text: 3,
				},
				{
					id: 5,
					text: 3,
				},
				{
					id: 10,
					text: 3,
				},
				{
					id: 12,
					text: 3,
				},
			],
		});
	});
});
