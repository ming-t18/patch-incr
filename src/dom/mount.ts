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

export class DOMRoot<State, Action> {
	readonly #root: Element;
	readonly #subj: Subject<Action | null>;
	readonly #states: Observable<[State, Patches | null]>;
	readonly #renderFromState: RenderIF<State, Action>;

	public constructor(
		root: Element,
		readonly initState: State,
		readonly reducer: IF<State, State, Action[], Patches>,
		renderFromState: RenderIF<State, Action>,
	) {
		this.#root = root;
		this.#subj = new Subject<Action | null>();
		this.#states = this.#subj.pipe(
			scan(this.makeScanFunc(initState), [initState, null as Patches | null]),
		);
		this.#renderFromState = renderFromState;
		this.#connect();
	}

	#connect(): TeardownLogic {
		const root = this.#root;
		const subj = this.#subj;
		const teardowns: TeardownLogic[] = [];
		teardowns.push(subj.subscribe((x) => console.log("dispatch", x)));
		const renderFromState = this.#renderFromState;

		const rerender = (state: State, dispatch: Dispatch<Action>) => {
			const domc = renderFromState.evaluate({ state, dispatch });
			root.innerHTML = renderToString(domc);
			const node = root.firstElementChild;
			if (!node) {
				console.warn("DOMRoot.render: is empty");
				return;
			}
			hydrate(node, domc);
		};

		teardowns.push(
			this.#states.subscribe(([state, patches]) => {
				// console.log('re-render', { state, patches });
				rerender(state, (a) => subj.next(a));
			}),
		);
		subj.next(null);
		teardowns.push(
			observeRemoval(root)?.subscribe({
				complete: () => {
					subj.complete();
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

	makeScanFunc(initState: State) {
		return (
			[state, _patches]: [State, Patches | null],
			act: Action | null,
		): [State, Patches | null] => {
			if (act === null) {
				return [initState, null];
			}
			const patches = this.reducer.forward(state, [act], state);
			return [applyPatches(state, patches), patches];
		};
	}
}
