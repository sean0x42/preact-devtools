import { h, ComponentChildren } from "preact";
import s from "./SidebarPanel.css";
import { IconBtn } from "../IconBtn";
import { FileCopy } from "../icons";

export interface Props {
	title: string;
	empty: string;
	onCopy?: () => void;
	children?: ComponentChildren;
}

export function SidebarPanel(props: Props) {
	return (
		<div class={s.panel}>
			<header class={s.panelHeader}>
				<h3 class={s.title}>{props.title}</h3>
				{props.onCopy && props.children != null && (
					<IconBtn onClick={props.onCopy} title={`Copy ${props.title}`}>
						<FileCopy />
					</IconBtn>
				)}
			</header>
			<div class={s.content}>
				{props.children == null ? (
					<span class={s.empty}>{props.empty}</span>
				) : (
					props.children
				)}
			</div>
		</div>
	);
}
