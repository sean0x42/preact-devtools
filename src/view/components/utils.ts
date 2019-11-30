import { useRef, useEffect } from "preact/hooks";

const OFFSET = 16;

export function scrollIntoView(el: HTMLElement) {
	// Find closest scrollable parent
	let parent: HTMLElement | null = el;
	while ((parent = parent.parentNode as any)) {
		if (parent.scrollHeight > parent.clientHeight) {
			break;
		}
	}

	if (parent) {
		let rect = el.getBoundingClientRect();
		let top = parent.scrollTop;

		if (el.offsetTop <= parent.scrollTop) {
			top = el.offsetTop - OFFSET;
		} else if (
			el.offsetTop + rect.height >
			parent.scrollTop + parent.clientHeight
		) {
			top = el.offsetTop - parent.clientHeight + rect.height + OFFSET;
		} else {
			return;
		}
		parent.scrollTo({
			top,
			behavior: "smooth",
		});
	}
}

export function cssToPx(raw: string) {
	if (raw.endsWith("rem")) {
		const rem = parseFloat(raw.slice(0, -3));
		return (
			rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
		);
	} else if (raw.endsWith("px")) {
		return parseFloat(raw.slice(0, -2));
	}

	throw new Error(`Conversion of ${raw} is not supported yet`);
}

export function getRootDomNode(el: HTMLElement): HTMLElement {
	let item = el;
	while (item.parentNode != null) {
		item = item.parentNode as any;
	}

	return item;
}

export function useInstance<T extends { destroy?: () => void }>(fn: () => T) {
	const ref = useRef<T>(null as any);
	const value = ref.current || (ref.current = fn());

	useEffect(
		() => () => {
			if (ref.current && ref.current.destroy) {
				ref.current.destroy();
			}
		},
		[],
	);

	return value;
}
