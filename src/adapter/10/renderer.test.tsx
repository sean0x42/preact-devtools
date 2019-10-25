import { h, render, Options, options, Fragment } from "preact";
import * as sinon from "sinon";
import { createRenderer, Renderer } from "./renderer";
import { setupOptions } from "../10/options";
import { DevtoolsHook } from "../hook";
import { expect } from "chai";
import { toSnapshot } from "../debug";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";

export function setupScratch() {
	const div = document.createElement("div");
	div.id = "scratch";
	document.body.appendChild(div);
	return div;
}

export function setupMockHook(options: Options) {
	const spy = sinon.spy();
	const fakeHook: DevtoolsHook = {
		connected: true,
		attach: () => 1,
		detach: () => null,
		emit: spy,
		renderers: new Map(),
	};
	const renderer = createRenderer(fakeHook, { type: new Set(), regex: [] });
	const destroy = setupOptions(options, renderer);
	return {
		renderer,
		destroy,
		spy,
	};
}

describe("Renderer 10", () => {
	let scratch: HTMLDivElement;
	let destroy: () => void;
	let spy: sinon.SinonSpy;
	let renderer: Renderer;

	beforeEach(() => {
		scratch = setupScratch();
		const mock = setupMockHook(options);
		destroy = mock.destroy;
		spy = mock.spy;
		renderer = mock.renderer;
	});

	afterEach(() => {
		scratch.remove();
		if (destroy) destroy();
	});

	it("should detect root nodes", () => {
		render(<div />, scratch);
		expect(toSnapshot(spy.args[0][1])).to.deep.equal([
			"rootId: 1",
			"Add 1 <Fragment> to parent 1",
			"Add 2 <div> to parent 1",
		]);

		render(<div />, scratch);
		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			"rootId: 1",
			"Update timings 1",
			"Update timings 2",
		]);
	});

	it("should mount children", () => {
		render(
			<div>
				<span>foo</span>
				<span>bar</span>
			</div>,
			scratch,
		);
		expect(toSnapshot(spy.args[0][1])).to.deep.equal([
			"rootId: 1",
			"Add 1 <Fragment> to parent 1",
			"Add 2 <div> to parent 1",
			"Add 3 <span> to parent 2",
			"Add 4 <#text> to parent 3",
			"Add 5 <span> to parent 2",
			"Add 6 <#text> to parent 5",
		]);
	});

	it("should update text", () => {
		render(<div>foo</div>, scratch);
		render(<div>bar</div>, scratch);

		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			"rootId: 1",
			"Update timings 1",
			"Update timings 2",
			"Update timings 3",
		]);
	});

	it("should reorder children", () => {
		render(
			<div>
				<p key="A">A</p>
				<p key="B">B</p>
			</div>,
			scratch,
		);
		render(
			<div>
				<p key="B">B</p>
				<p key="A">A</p>
			</div>,
			scratch,
		);

		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			"rootId: 1",
			"Update timings 1",
			"Update timings 2",
			"Update timings 5",
			"Update timings 6",
			"Update timings 3",
			"Update timings 4",
			"Reorder 2 [5, 3]",
		]);
	});

	describe("filters", () => {
		it("should apply regex filters", () => {
			renderer.applyFilters({
				regex: [/span/i],
				type: new Set(),
			});
			render(
				<div>
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch,
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				"rootId: 1",
				"Add 1 <Fragment> to parent 1",
				"Add 2 <div> to parent 1",
				"Add 3 <#text> to parent 2",
				"Add 4 <#text> to parent 2",
			]);
		});

		it("should ignore case for regex", () => {
			renderer.applyFilters({
				regex: [/SpAn/i],
				type: new Set(),
			});
			render(
				<div>
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch,
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				"rootId: 1",
				"Add 1 <Fragment> to parent 1",
				"Add 2 <div> to parent 1",
				"Add 3 <#text> to parent 2",
				"Add 4 <#text> to parent 2",
			]);
		});

		it("should filter by dom type #1", () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(["dom"]),
			});
			render(
				<div>
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch,
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				"rootId: 1",
				"Add 1 <Fragment> to parent 1",
			]);
		});

		it("should filter by dom type #2", () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(["dom"]),
			});

			function Foo() {
				return <div>foo</div>;
			}
			render(
				<div>
					<Foo />
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch,
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				"rootId: 1",
				"Add 1 <Fragment> to parent 1",
				"Add 2 <Foo> to parent 1",
			]);
		});

		it("should filter by fragment type", () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(["fragment"]),
			});

			function Foo() {
				return <div>foo</div>;
			}
			render(
				<div>
					<Foo />
					<Fragment>asdf</Fragment>
				</div>,
				scratch,
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				"rootId: 1",
				"Add 1 <Fragment> to parent 1",
				"Add 2 <div> to parent 1",
				"Add 3 <Foo> to parent 2",
				"Add 4 <div> to parent 3",
				"Add 5 <#text> to parent 4",
				"Add 6 <#text> to parent 2",
			]);
		});

		it("should filter on update", () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(["dom"]),
			});

			let update: () => void;
			function Parent(props: { children: any }) {
				const [i, setI] = useState(0);
				update = () => setI(i + 1);
				return <div>{props.children}</div>;
			}

			const Foo = () => <div />;
			render(
				<Parent>
					<div>
						<Foo />
					</div>
				</Parent>,
				scratch,
			);

			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				"rootId: 1",
				"Add 1 <Fragment> to parent 1",
				"Add 2 <Parent> to parent 1",
				"Add 3 <Foo> to parent 2",
			]);

			act(() => {
				update();
			});

			expect(toSnapshot(spy.args[1][1])).to.deep.equal([
				"rootId: 1",
				"Update timings 2",
			]);
		});
	});
});
