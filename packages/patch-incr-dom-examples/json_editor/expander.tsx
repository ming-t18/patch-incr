import { template } from "patch-incr/builder/struct";
import { accessWithFor } from "patch-incr/builder/struct/access";
import type { IF } from "patch-incr/types";
import type { ElementConstruction } from "patch-incr-dom/types";

interface ExpanderProps {
	isExpanded: boolean;
	children: ElementConstruction;
	setIsExpanded: (value: boolean) => void;
}

const _EP = accessWithFor<ExpanderProps>();

const _Expander = (): IF<ExpanderProps, ElementConstruction> => {
	return template(
		{
			isExpanded: _EP((x) => x.isExpanded),
			setIsExpanded: _EP((x) => x.setIsExpanded),
			children: _EP((x) => x.children),
		},
		({ isExpanded, setIsExpanded, children }) => (
			<div style="display: flex; flex-direction: row;">
				<button aria-expanded={isExpanded}>{">"}</button>
				{children}
			</div>
		),
	);
};
