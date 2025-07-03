import { map, Observable, Subject, type TeardownLogic } from "rxjs";
import { applyPatches, type Patches } from "../incr/patch";
import type { IF, NoForwardOutput } from "../incr/types";
import * as gp from "../patchSchema";
import { type ForwardPatchEntry, forwardPatch } from "../rxjs";
import { patchDOM, renderDOM } from "./patch";
import type { RenderIF, StateDispatch } from "./render";
import type { DOMConstruction, ElementConstruction } from "./types";

export type Dispatch<Action> = (action: Action) => void;

export const observeRemoval = (root: Element) => {
	const parent = root.parentElement;
	if (!parent) {
		return null;
	}

	return new Observable<never>((s) => {
		const mo = new MutationObserver((changes) => {
			if (changes.length === 0) {
				return;
			}

			for (const change of changes) {
				for (let i = 0; i < change.removedNodes.length; i++) {
					if (change.removedNodes.item(i) === root) {
						console.log("parent removed");
						s.complete();
						return;
					}
				}
			}
		});
		mo.observe(parent, { childList: true });
	});
};

export class DOMRoot<State, Action> {
	readonly #root: Element;
	readonly #actions$: Subject<Action[]>;
	readonly #renderFromState: RenderIF<State, Action>;
	readonly #stateChanges$: Observable<
		ForwardPatchEntry<State, State, Action[], Patches<State>>
	>;
	readonly #domChanges$: Observable<
		ForwardPatchEntry<StateDispatch<State, Action>, ElementConstruction>
	>;
	readonly #dispatch: Dispatch<Action>;

	public constructor(
		root: Element,
		readonly initState: State,
		readonly reducer: IF<
			State,
			State,
			Action[],
			Patches<State>,
			NoForwardOutput
		>,
		renderFromState: RenderIF<State, Action>,
	) {
		const schema = gp.record({
			state: gp.atomic<State>(),
			dispatch: gp.atomic<Dispatch<Action>>(),
		});
		this.#root = root;
		this.#actions$ = new Subject();
		this.#stateChanges$ = this.#actions$.pipe(
			forwardPatch<State, State, Action[], Patches<State>>(
				initState,
				reducer,
				(s: State, as: Action[]): State =>
					applyPatches(s, reducer.forward(s, as)),
				applyPatches,
			),
		);
		const dispatch = (a: Action) => {
			console.log("dispatch() ---", a);
			return this.#actions$.next([a]);
		};
		this.#dispatch = dispatch;

		this.#domChanges$ = this.#stateChanges$.pipe(
			map(
				(x): Patches<StateDispatch<State, Action>> =>
					schema.liftKey("state", x.dOutput),
			),
			forwardPatch<StateDispatch<State, Action>, DOMConstruction>(
				{ state: initState, dispatch },
				renderFromState,
			),
		);
		this.#renderFromState = renderFromState;
	}

	connect(): TeardownLogic {
		const root = this.#root;
		const actions$ = this.#actions$;

		const teardowns: TeardownLogic[] = [];
		let isFirst = true;
		teardowns.push(
			this.#domChanges$.subscribe((obj) => {
				const {
					input: state,
					output: domc,
					dInput: stateChanges,
					dOutput: domcChanges,
				} = obj;
				if (isFirst) {
					renderDOM(root, domc);
					isFirst = false;
					console.log("First Render ---", {
						state,
						domc,
					});
				} else {
					patchDOM(root, domc, domcChanges);
					console.log("DOM Patches ---", {
						state,
						domc,
						changes: {
							state: stateChanges,
							domc: domcChanges,
						},
					});
				}
			}),
		);

		actions$.next([]);
		teardowns.push(
			observeRemoval(root)?.subscribe({
				complete: () => {
					actions$.complete();
				},
			}),
		);

		return () => {
			for (const teardown of teardowns) {
				if (!teardown) {
					continue;
				}
				if ("unsubscribe" in teardown) {
					teardown.unsubscribe();
					continue;
				}
				teardown();
			}
		};
	}
}
