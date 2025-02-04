import { RollType, SYSTEM_NAME, UserFlags } from "@module/data"
import { RollGURPS } from "@module/roll"
import { LastActor } from "@util"
import { ModifierBucketWindow } from "./window"
import { UserGURPS } from "@module/user/document"

export class ModifierBucket extends Application {
	window: ModifierBucketWindow

	constructor() {
		super()
		this.window = new ModifierBucketWindow(this)
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: false,
			minimizable: false,
			resizable: false,
			id: "modifier-bucket-button",
			template: `systems/${SYSTEM_NAME}/templates/modifier-bucket/button.hbs`,
			classes: ["modifier-button"],
		})
	}

	protected _injectHTML(html: JQuery<HTMLElement>): void {
		if ($("body").find("#modifier-bucket-button").length === 0) {
			html.insertAfter($("body").find("#hotbar-page-controls"))
			this._element = html
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		html[0].addEventListener("wheel", event => this._onMouseWheel(event), { passive: true })

		html.find("#modifier-bucket-button").on("click", event => this._onClick(event))
		html.find(".magnet").on("click", event => this._onMagnetClick(event))
		html.find(".trash").on("click", event => this._onTrashClick(event))

		html.find("#dice-roller").on("click", event => this._onDiceClick(event))
		html.find("#dice-roller").on("contextmenu", event => this._onDiceContextMenu(event))

		html.find("#current-actor").on("click", event => this._OnCurrentActorClick(event))
	}

	async getData(options?: Partial<ApplicationOptions> | undefined): Promise<object> {
		// let total = (game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierTotal) as number) ?? 0
		let total = (game.user as UserGURPS).modifierTotal
		let buttonMagnet = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky) === true ? "sticky" : ""
		let buttonColor = "total-white"
		if (total > 0) buttonColor = "total-green"
		if (total < 0) buttonColor = "total-red"
		const showDice = true
		const currentActor = game.user?.isGM ? await LastActor.get() : null

		return mergeObject(super.getData(options), {
			id: this.id,
			total,
			buttonColor,
			buttonMagnet,
			showDice,
			imgDice: `systems/${SYSTEM_NAME}/assets/3d6.webp`,
			currentActor: currentActor ? currentActor.name : null,
		})
	}

	// Increase/Decrease modifier by 1 with the mouse wheel
	async _onMouseWheel(event: WheelEvent) {
		const delta = Math.round(event.deltaY / -100)
		return (game.user as UserGURPS).addModifier({
			name: "",
			modifier: delta,
			tags: [],
		})
	}

	// Open/close the modifier bucket
	_onClick(event: JQuery.ClickEvent): unknown {
		event.preventDefault()
		if (this.window.rendered) {
			return this.window.close()
			// game.ModifierList.fadeOut()
		} else {
			return this.window.render(true)
			// game.ModifierList.fadeIn()
		}
	}

	// Toggle modifier bucket magnet
	private async _onMagnetClick(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault()
		event.stopPropagation()
		const sticky = game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierSticky) ?? false
		await game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierSticky, !sticky)
		return this.render()
	}

	// Roll 3d6
	private async _onDiceClick(event: JQuery.ClickEvent): Promise<void> {
		event.preventDefault()
		return RollGURPS.handleRoll(game.user, null, {
			type: RollType.Generic,
			formula: "3d6",
			hidden: event.ctrlKey,
		})
	}

	// Roll 1d6
	async _onDiceContextMenu(event: JQuery.ContextMenuEvent): Promise<void> {
		event.preventDefault()
		return RollGURPS.handleRoll(game.user, null, {
			type: RollType.Generic,
			formula: "1d6",
			hidden: event.ctrlKey,
		})
	}

	async _OnCurrentActorClick(event: JQuery.ClickEvent): Promise<unknown> {
		event.preventDefault()
		return LastActor.get().then(actor => actor?.sheet?.render(true))
	}

	_onTrashClick(event: JQuery.ClickEvent): unknown {
		event.preventDefault()
		event.stopPropagation()
		this.clear()
		return this.render()
	}

	async clear(): Promise<unknown> {
		await game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, [])
		// await game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierTotal, 0)
		game.ModifierList.render()
		return this.render(true)
	}
}
