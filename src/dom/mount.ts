import { applyPatches, liftPatch, type Patches } from "../incr/patch";
import type { IF, NoForwardOutput } from "../incr/types";
import { patchDOM, renderDOM } from "./patch";
import type { RenderIF, StateDispatch } from "./render";
import type { DOMConstruction } from "./types";

export type Dispatch<Action> = (action: Action) => void;

export class DOMRoot<State, Action> {
	#state: State;
	#domc?: DOMConstruction = undefined;

	public constructor(
		readonly root: Element,
		initState: State,
		readonly reducer: IF<
			State,
			State,
			Action[],
			Patches<State>,
			NoForwardOutput
		>,
		readonly render: RenderIF<State, Action>,
	) {
		this.#state = initState;
	}

	dispatch(action: Action): void {
		if (!this.#domc) {
			this.#domc = this.connect();
		}

		const root = this.root;
		try {
			const { dState, dDomc } = this.#getPatches([action]);
			patchDOM(root, this.#domc, dDomc);
			console.log("DOM Patches ---", {
				state: this.#state,
				domc: this.#domc,
				changes: {
					state: dState,
					domc: dDomc,
				},
			});

			this.#state = applyPatches(this.#state, dState);
			this.#domc = applyPatches(this.#domc, dDomc);
		} catch (e) {
			console.error("DOMRoot.dispatch: caught error", e);
			this.#domc = undefined;
			return;
		}
	}

	#sd(): StateDispatch<State, Action> {
		return { state: this.#state, dispatch: this.dispatch.bind(this) };
	}

	#getPatches(actions: Action[]) {
		const dState: Patches<State> = this.reducer.forward(this.#state, actions);
		const dSD: Patches<StateDispatch<State, Action>> = liftPatch(
			"state",
			dState,
		);
		if (!this.#domc) {
			throw new Error("getPatches: DOM must be rendered");
		}
		const dDomc: Patches<DOMConstruction> = this.render.forward(
			this.#sd(),
			dSD,
			this.#domc,
		);
		return { dState, dDomc };
	}

	connect() {
		const sd: StateDispatch<State, Action> = this.#sd();
		this.#domc = this.render.evaluate(sd);
		console.log("First Render ---", {
			state: this.#state,
			domc: this.#domc,
		});
		renderDOM(this.root, this.#domc);
		return this.#domc;
	}
}
