# incr-dom

Patch-based incremental DOM manipulation.

# Install

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.18. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

# How it works

A typical frontend app has a render function from the app state to the HTML structure,
or "UI is a function of state" paradigm.


```typescript
UI = fn(state)
```

The state is kept track in a "store", and to update the state, there is a "dispatch"
function that is called by the event handlers to initiate a state change.

The reducer function is a function that takes a state and returns an updated state.

```typescript
// An event handler (such as onClick) calls dispatch
dispatch(action)

// The store updates the state
updatedState = reducer(currentState, action)

// The framework re-renders the app
UI_updated = fn(updatedState)
```

The UI framework re-renders the app by calling the render function again, and re-renders the UI. There are several approaches by various UI frameworks to minimize
the updatees applied on the UI.

In patch-based incremental computation, there is a data type to represent changes
on states or DOM.

JSON Patches (based on how the [Immer library](https://immerjs.github.io/immer) handles it) is the type of change representation our choice.

Instead of the updated state, the reducer returns the JSON Patches for the state change. The render function then takes the patches and the initial state, and derives the patches on the DOM representation.


```typescript
// fn: IncrementalFunc<State, DOMConstruction>
UI = fn.evaluate(currentState)

// the incr-dom framework renders the app
renderDOM(rootElement, UI)

stateChange: Patches<State> = reducer(currentState, action)
UI_change: Patches<DOMConstruction> = fn.forward(UI, stateChange, UI)

// Apply DOM changes
patchDOM(rootElement, UI, UI_change)

```

[`incr`](../incr/README.md) is a combinator library for performing incremental
computations.

# Representation of DOM
The `ElementConstruction` type is a plain-object representation of an HTML element.

This is the **virtual DOM** of this library.

```typescript
interface ElementConstruction {
    // The tag name
	tag: string;
    // Attributes object, values will be converted to strings
	attrs?: Attrs | null;
    // Event handlers object, events as named by `addEventHandler`
	events?: Events | null;
    // Children
	children?: ChildConstruction[] | null;
}

// Non-element types that can be converted to a string
type TextConstruction = string | ... ;

type ChildConstruction = ElementConstruction | TextConstruction;
```

## Creating DOM elements

Examples:

```html
<div id="test">
    <h1>Heading</h1>
    <ol class="cls1">
        <li onclick="event1">Item 1</li>
        <li>Item 2</li>
        <li>Item 3 <a href="https://www.example.com">Link</a></li>
    </ol>
</div>
```

```typescript
const domc: DOMConstruction = {
    tag: "div",
    attrs: { id: "test" },
    children: [
        {
            tag: "h1",
            children: ["Text here"]
        }
        {
            tag: "ol"
            attrs: { class: "cls1" },
            children: [
                {
                    tag: "li",
                    events: { click: event1 },
                    children: ["Item 1"]
                },
                {
                    tag: "li",
                    children: ["Item 2"]
                },
                {
                    tag: "li",
                    children: [
                        "Item 3 ",
                        {
                            tag: "a",
                            attrs: { href: "https://www.example.com" },
                            children: ["Link"]
                        }
                    ]
                }
            ]
        }
    ]
}
```

### DOM Construction Helpers
There are helper functions for constructing DOM nodes:

#### VanJS style
```tsx
import { tags } from "incr-dom/construct/vanjs"

const { div, h1, ol, li } = tags;
const domc: DOMConstruction =
    div({ id: "test" },
        h1("Heading"),
        ol({ class: "cls1" },
            li({ onclick: event1 }, "Item 1"),
            li("Item 2"),
            li("Item 3 ", a({ href: "https://www.example.com" }, "Link"))
        )
    )
```

#### React + JSX Style (warning: untested)
```tsx
import { createElement } from "incr-dom/construct/react"

// Use tsconfig.json to set up JSX support
const domc: DOMConstruction = (
    <div id="test">
        <h1>Heading</h1>
        <ol class="cls1">
            <li onclick={event1}>Item 1</li>
            <li>Item 2</li>
            <li>Item 3 <a href="https://www.example.com">Link</a></li>
        </ol>
    </div>
)

```

# Writing a reducer for the app state

The reducer is an incremental function that is an identity function with the forward function converting from
a list of reducer actions to the list of patches.

```typescript
type ReducerIF<State, Action> = IF<State, State, Action[], Patches<State>>
```

## Example state and reducer for a todo app

```typescript
enum TodoActionType {
	Clear = "Clear",
	ToggleAll = "ToggleAll",
	Add = "Add",
    // ...
}

interface TodoActionClear {
	type: TodoActionType.Clear;
}

interface TodoActionToggleAll {
	type: TodoActionType.ToggleAll;
}

interface TodoActionAdd {
	type: TodoActionType.Add;
	value: string;
}

type TodoAction = ...;

interface TodoItem {
	id: string;
	done: boolean;
	editing: boolean;
	text: string;
}

interface TodoState {
    counter: number;
	items: TodoItem[];
    ...
}

```

## Using Immer
```typescript
import { type Draft, enablePatches } from 'immer';
import { fromReducerOnDraft, type ReducerIF } from "incr/reducer";

// Using Immer
export const todoStateReducerOnDraft = (
	draft: Draft<TodoState>,
	action: TodoAction,
) => {
	switch (action.type) {
		case TodoActionType.Clear: {
			draft.editingId = null;
			draft.items = [];
			return;
		}
		case TodoActionType.ToggleAll: {
			const target = !draft.items.every((i) => i.done);
			for (let i = 0; i < draft.items.length; i++) {
				draft.items[i].done = target;
			}
			return;
		}
		case TodoActionType.Add: {
			draft.items.push({
				done: false,
				text: action.value,
				id: genId(draft.counter),
				editing: false,
			});
			draft.counter += 1;
			return;
		}
        ...
    }
}

enablePatches();
const todoReducer: ReducerIF<TodoState, TodoAction> = fromReducerOnDraft(todoStateReducerOnDraft);

```

## By returning JSON Patches
```typescript
import { fromReducerReturningPatches, type ReducerIF } from "incr/reducer";
const todoReducer: ReducerIF<TodoState, TodoAction> =
	fromReducerReturningPatches(getPatchesOnTodoState);

const getPatchesOnTodoState = (
	state: TodoState,
	action: TodoAction,
): Patches<TodoState> => {
	switch (action.type) {
		case TodoActionType.Clear: {
			return [
				{
					op: PatchOp.Replace,
					path: ["editingId"],
					value: null,
				},
				{
					op: PatchOp.Replace,
					path: ["items"],
					value: [],
				},
			];
		}
		case TodoActionType.ToggleAll: {
			return state.items.map(({ done }, i) => ({
				op: PatchOp.Replace,
				path: ["items", i],
				value: !done,
			}));
		}
		case TodoActionType.Add: {
			const newItem = {
				done: false,
				text: action.value,
				id: genId(state.counter),
				editing: false,
			};
			return [
				{
					op: PatchOp.Replace,
					path: ["counter"],
					value: state.counter + 1,
				},
				{
					op: PatchOp.Add,
					path: ["items", IndexEnd],
					value: newItem,
				},
			];
		}
        // ...
    }
}
```

# Putting everything together

The `DOMRoot` class orchestrates the rendering and updating the DOM based on the reducer and render function.

```typescript

import { fromReducerOnDraft, type ReducerIF } from "incr/reducer";
import { DOMRoot } from "incr-dom/mount";
import type { RenderIF } from "incr-dom/render";

const initialState: State = ...;
const reducer: ReducerIF<State, Action> = fromReducerOnDraft(...);
const rendreApp: RenderIF<State, Action> = ...;

const root = document.getElementById("root");
const domRoot = new DOMRoot(
    root,
    initialState,
    reducer,
    renderApp
);
domRoot.initialize();

```

## Commutative diagram

[Link to diagram](https://q.uiver.app/#q=WzAsOCxbNCwwLCJcXHRleHR7c3RhdGV9XzAiXSxbNCw0LCJcXHRleHR7c3RhdGV9XzEiXSxbOCwwLCJcXHRleHR7ZG9tY31fMCJdLFs4LDQsIlxcdGV4dHtkb21jfV8xIl0sWzEyLDAsIlxcdGV4dHtET019XzAiXSxbMTIsNCwiXFx0ZXh0e0RPTX1fMSJdLFswLDAsIlxcdGV4dHtzdGF0ZX1fMCJdLFswLDQsIlxcdGV4dHtzdGF0ZX1fMSJdLFsxLDMsIlxcdGV4dHtyZW5kZXJBcHAuZXZhbHVhdGV9Il0sWzAsMiwiXFx0ZXh0e3JlbmRlckFwcC5ldmFsdWF0ZX0iXSxbMCwxLCJcXHRleHR7cGF0Y2hlc1N0YXRlfSIsMV0sWzIsMywiXFx0ZXh0e3BhdGNoZXNEb21jfSIsMV0sWzIsNCwiXFx0ZXh0e3JlbmRlckRPTX0iXSxbNCw1LCJcXHRleHR7RE9NIG11dGF0aW9uc30iLDFdLFszLDUsIlxcdGV4dHtyZW5kZXJET019Il0sWzYsNywiXFx0ZXh0e2FjdGlvbnN9IiwxXSxbNiwwLCJcXHRleHR7aWRlbnRpdHl9Il0sWzcsMSwiXFx0ZXh0e2lkZW50aXR5fSJdLFsxMSwxMywiXFx0ZXh0e3BhdGNoRE9NfSIsMCx7InNob3J0ZW4iOnsic291cmNlIjoyMCwidGFyZ2V0IjoyMH19XSxbMTAsMTEsIlxcdGV4dHtyZW5kZXJBcHAuZm9yd2FyZH0iLDAseyJzaG9ydGVuIjp7InNvdXJjZSI6MjAsInRhcmdldCI6MjB9fV0sWzE1LDEwLCJcXHRleHR7cmVkdWNlcn0iLDAseyJzaG9ydGVuIjp7InNvdXJjZSI6MjAsInRhcmdldCI6MjB9fV1d)


Data flows horizontally through the function composition, and the vertical arrows represent the changes applied on the data.

Incremental computation avoids the calls to `renderApp.evaluate` and `renderDOM` on the updated states (the 2 horizontal arrows below).

### Steps to perform initial render

1. Given initial state `state0`, `renderApp` is evaluated to determine the initial `DOMConstruction`, `domc0`
2. The DOM is rendered into the `root` element with `renderDOM(root, domc0)`

### Steps to apply incremental change

1. Dispatch is called, `actions` is generated
2. The reducer is evaluated on the initial state `state0` to determine the state changes, `patchesState`
3. The updated state, `state1` is determined by patching `state0` with `patchesState`
4. The changes to the `DOMConstruction`, `patchesDomc`, is determined from `renderApp.forward(state0, patchesState, state1)`
5. `patchDOM(root, domc0, patchesDomc)` is called to update the DOM (from the `root` element) in-place