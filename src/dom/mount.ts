import {
	Observable,
	Subject,
	type Subscription,
	type TeardownLogic,
	scan,
} from "rxjs";
import { type Patches, applyPatches } from "../incr/patch";
import type { IF } from "../incr/types";
import { type RenderIF, hydrate, renderToString } from "./render";
import type { DOMConstruction } from "./types";

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

export interface StateChange<State, Action> {
	prevState: State;
	nextState: State;
	action: Action | null;
	stateChange: Patches<State> | null;
}

export class DOMRoot<State, Action> {
	readonly #root: Element;
	readonly #actions$: Subject<Action | null>;
	readonly stateChanges$: Observable<StateChange<State, Action>>;
	readonly #renderFromState: RenderIF<State, Action>;

	public constructor(
		root: Element,
		readonly initState: State,
		readonly reducer: IF<State, State, Action[], Patches>,
		renderFromState: RenderIF<State, Action>,
	) {
		this.#root = root;
		this.#actions$ = new Subject<Action | null>();
		this.stateChanges$ = this.#actions$.pipe(
			scan(this.makeScanFunc(), {
				prevState: initState,
				nextState: initState,
				action: null,
				stateChange: null,
			}),
		);
		this.#renderFromState = renderFromState;
		this.#connect();
	}

	#connect(): TeardownLogic {
		const root = this.#root;
		const actions$ = this.#actions$;
		const dispatch = (a: Action) => actions$.next(a);

		const teardowns: TeardownLogic[] = [];
		teardowns.push(actions$.subscribe((x) => console.log("dispatch", x)));
		const renderFromState = this.#renderFromState;

		teardowns.push(
			this.stateChanges$.subscribe((obj) => {
				const {
					prevState,
					nextState: state,
					action,
					stateChange: patches,
				} = obj;
				console.log("re-render", {
					prevState,
					action,
					stateChange: patches,
				});

				const domc = renderFromState.evaluate({ state, dispatch });
				root.innerHTML = renderToString(domc);
				const node = root.firstElementChild;
				if (!node) {
					console.warn("DOMRoot.render: is empty");
					return;
				}
				hydrate(node, domc);
			}),
		);
		actions$.next(null);
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

	makeScanFunc() {
		return (
			obj: StateChange<State, Action>,
			action: Action | null,
		): StateChange<State, Action> => {
			const { nextState: state } = obj;
			if (action === null) {
				return obj;
			}
			const patches: Patches<State> = this.reducer.forward(
				state,
				[action],
				state,
			);
			return {
				prevState: state,
				nextState: applyPatches(state, patches),
				action,
				stateChange: patches,
			};
		};
	}
}
