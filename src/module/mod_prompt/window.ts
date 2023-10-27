import { RollModifier, SYSTEM_NAME, UserFlags } from "@module/data"
import { fSearch } from "@util/fuse"
import { ModifierBrowse } from "./browse"
import { ModifierButton } from "./button"
import { ModifierList } from "./list"

enum WindowSelected {
	Browse = "browse",
	Current = "current",
	None = "none",
}

export class ModifierWindow extends Application {
	selected: WindowSelected

	button: ModifierButton

	list: ModifierList

	browse: ModifierBrowse

	value: string

	constructor(button: ModifierButton, options = {}) {
		super(options)

		this.value = ""
		this.button = button
		this.list = new ModifierList(this, [])
		this.browse = new ModifierBrowse(this)
		this.selected = WindowSelected.None
	}

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			id: "ModifierWindow",
			template: `systems/${SYSTEM_NAME}/templates/modifier-app/window.hbs`,
			popOut: false,
			minimizable: false,
			classes: ["modifier-app-window"],
		})
	}

	async render(force?: boolean | undefined, options?: Application.RenderOptions<ApplicationOptions> | undefined) {
		this.button.showing = true
		await super.render(force, options)
		this.list.render(force, options)
		this.browse.render(force, options)
	}

	close(options?: Application.CloseOptions | undefined): Promise<void> {
		this.button.showing = false
		this.list.mods = []
		this.list.close(options)
		this.browse.close(options)
		game.ModifierList.fadeOut()
		return super.close(options)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): object | Promise<object> {
		const user = game.user
		let modStack = user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) ?? []

		return mergeObject(super.getData(options), {
			value: this.value,
			applied_mods: modStack,
		})
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)

		// Get position
		const button = $("#modifier-app")
		const buttonTop = button.position()?.top ?? 0
		const buttonLeft = (button.position()?.left || 0) + 220 ?? 0
		let buttonWidth = parseFloat(button.css("width").replace("px", ""))
		const width = 180
		let height = parseFloat(html.css("height").replace("px", ""))

		let left = Math.max(buttonLeft + buttonWidth / 2 - width / 2, 10)
		html.css("left", `${left}px`)
		html.css("top", `${buttonTop - height - 10}px`)

		// Focus the textbox on show
		const searchbar = html.find(".searchbar")
		searchbar.trigger("focus")

		// Detect changes to input
		searchbar.on("input", event => this._updateQuery(event, searchbar))
		searchbar.on("keydown", event => this._keyDown(event))

		// Modifier Deleting
		html.find(".click-delete").on("click", event => this.removeModifier(event))
	}

	_updateQuery(event: JQuery.TriggeredEvent, html: JQuery<HTMLElement>) {
		const input = String($(event.currentTarget).val())
		html.css("min-width", `max(${input.length}ch, 180px)`)
		this.value = input
		this.list.mods = fSearch(CONFIG.GURPS.allMods, input, {
			includeMatches: true,
			includeScore: true,
			keys: ["name", "modifier", "tags"],
		})
			.filter(e => e.score <= 0.5)
			.map(e => e.item)
		if (this.list.mods.length > 0) this.list.selection = 0
		else this.list.selection = -1

		// Set custom mod
		const customMod: RollModifier = { name: "", modifier: 0, tags: [] }
		const modifierMatch = input.match(/^[-+]?[0-9]+\s*/)
		if (modifierMatch) {
			customMod.modifier = parseInt(modifierMatch[0]) ?? 0
			customMod.name = input.replace(modifierMatch[0], "")
		}
		if (customMod.modifier === 0) this.list.customMod = null
		else this.list.customMod = customMod
		this.list.render()
	}

	_keyDown(event: JQuery.KeyDownEvent) {
		if (
			["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Escape"].includes(event.key) ||
			// Vim keys
			(["h", "j", "k", "l"].includes(event.key) && event.ctrlKey)
		) {
			event.preventDefault()
			switch (event.key) {
				case "h":
				case "ArrowLeft":
					switch (this.selected) {
						case WindowSelected.Current:
							this.selected = WindowSelected.None
							return
						case WindowSelected.None:
							this.selected = WindowSelected.Browse
							return this.browse.show()
						case "browse":
							return
					}
				case "l":
				case "ArrowRight":
					switch (this.selected) {
						case WindowSelected.Browse:
							this.selected = WindowSelected.None
							return this.browse.hide()
						case WindowSelected.None:
							this.selected = WindowSelected.Current
							return this.browse.show()
						case WindowSelected.Current:
							return
					}
				case "k":
				case "ArrowUp":
					switch (this.selected) {
						case WindowSelected.Current:
							return
						// Return this.currentUp()
						case WindowSelected.Browse:
							return this.browse.up()
						case WindowSelected.None:
							if (this.list.mods.length === 0) return this.getPinnedMods()
							this.list.selection += 1
							if (this.list.selection >= this.list.mods.length) this.list.selection = 0
							return this.list.render()
					}
				case "j":
				case "ArrowDown":
					switch (this.selected) {
						case WindowSelected.Current:
							return
						// Return this.currentUp()
						case WindowSelected.Browse:
							return this.browse.down()
						case WindowSelected.None:
							this.list.selection -= 1
							if (this.list.selection < 0) this.list.selection = this.list.mods.length - 1
							return this.list.render()
					}
				case "Enter":
					if (event.ctrlKey) return this.togglePin()
					return this.addModFromList()
				case "Escape":
					return this.close()
			}
		}
	}

	togglePin() {
		if (this.list.selection === -1) return
		const pinnedMods: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as RollModifier[]) ?? []
		const selectedMod: RollModifier = this.list.mods[this.list.selection]
		const matchingMod = pinnedMods.find(e => e.name === selectedMod.name)
		if (matchingMod) {
			pinnedMods.splice(pinnedMods.indexOf(matchingMod), 1)
		} else {
			pinnedMods.push(selectedMod)
		}
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierPinned, pinnedMods)
		this.list.render()
	}

	getPinnedMods() {
		const pinnedMods: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierPinned) as RollModifier[]) ?? []
		this.list.mods = pinnedMods
		this.list.render()
	}

	addModFromList() {
		const newMod: RollModifier = this.list.mods[this.list.selection]
		if (!newMod) return
		return game.ModifierList.addModifier(newMod)
	}

	addModFromBrowse() {
		let newMod = null
		// Const newMod: RollModifier = this.browse.categories[this.browse.selection[1]].mods[this.browse.selection[2]];
		const cat = this.browse.categories[this.browse.selection[1]]
		if (cat) newMod = cat.mods[this.browse.selection[2]]
		if (!newMod) return
		return game.ModifierList.addModifier(newMod)
	}

	removeModifier(event: JQuery.ClickEvent) {
		event.preventDefault()
		const modList: RollModifier[] =
			(game.user?.getFlag(SYSTEM_NAME, UserFlags.ModifierStack) as RollModifier[]) ?? []
		const index = $(event.currentTarget).data("index")
		modList.splice(index, 1)
		game.user?.setFlag(SYSTEM_NAME, UserFlags.ModifierStack, modList)
		this.render()
		this.button.render()
	}
}
