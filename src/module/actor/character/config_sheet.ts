import { CharacterImporter } from "./import"
import { LocalizeGURPS, getNewAttributeId, prepareFormData } from "@util"
import { gid, SETTINGS, SYSTEM_NAME } from "@module/data"
import { HitLocationTable } from "./hit_location"
import { DnD } from "@util/drag_drop"
import { AttributeDefObj } from "@module/attribute"
import { CharacterSheetGURPS } from "./sheet"
import { ResourceTrackerDefObj } from "@module/resource_tracker"
import { PDF } from "@module/pdf"
import { MoveTypeDefObj, MoveTypeOverrideConditionType } from "@module/move_type"
import { CharacterGURPS } from "./document"
import { attribute } from "@util/enum"

enum ListType {
	Attributes = "attributes",
	ResourceTrackers = "resource_trackers",
	AttributeThresholds = "attribute_thresholds",
	TrackerThresholds = "tracker_thresholds",
	Locations = "locations",
	SubTable = "sub_table",
	MoveType = "move_types",
	Overrides = "override",
}

export class CharacterSheetConfig extends FormApplication {
	object: CharacterGURPS

	filename: string

	file?: { text: string; name: string; path: string }

	attributes: AttributeDefObj[]

	resource_trackers: ResourceTrackerDefObj[]

	body_type: HitLocationTable

	move_types: MoveTypeDefObj[]

	constructor(object: CharacterGURPS, options?: any) {
		super(object, options)
		this.object = object
		this.filename = ""
		this.attributes = this.object.system.settings.attributes
		this.resource_trackers = this.object.system.settings.resource_trackers
		this.move_types = this.object.system.settings.move_types
		this.body_type = this.object.BodyType
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			classes: ["form", "character-config", "gurps"],
			template: `systems/${SYSTEM_NAME}/templates/actor/character/config/config.hbs`,
			width: 540,
			resizable: true,
			submitOnChange: true,
			submitOnClose: true,
			closeOnSubmit: false,
			tabs: [
				{
					navSelector: "nav",
					contentSelector: "section.content",
					initital: "sheet-settings",
				},
			],
			dragDrop: [{ dragSelector: ".item-list .item .controls .drag", dropSelector: null }],
			scrollY: [".content", ".item-list", ".tab"],
		})
	}

	get title() {
		return LocalizeGURPS.format(LocalizeGURPS.translations.gurps.character.settings.header, {
			name: this.object.name,
		})
	}

	getData(options?: Partial<FormApplicationOptions> | undefined): any {
		const actor = this.object
		this.attributes = this.object.system.settings.attributes
		this.resource_trackers = this.object.system.settings.resource_trackers
		this.move_types = this.object.system.settings.move_types
		// const attributes = actor.settings.attributes.map(e =>
		// 	mergeObject(e, { order: actor.attributes.get(e.id)!.order })
		// )
		// const resourceTrackers = actor.settings.resource_trackers

		return {
			options: options,
			actor: actor.toObject(),
			system: actor.system,
			attributes: this.attributes,
			resource_trackers: this.resource_trackers,
			move_types: this.move_types,
			locations: actor.system.settings.body_type,
			filename: this.filename,
			config: CONFIG.GURPS,
		}
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("textarea")
			.each(function () {
				this.setAttribute("style", `height:${this.scrollHeight + 2}px;overflow-y:hidden;`)
			})
			.on("input", event => {
				const e = event.currentTarget
				e.style.height = "0px"
				e.style.height = `${e.scrollHeight + 2}px`
			})

		html.find(".ref").on("click", event => PDF.handle(event))
		html.find("a.reset-all").on("click", event => this._onReset(event))
		html.find("input[name$='.id']").on("input", event => {
			const value = $(event.currentTarget).val()
			const name = $(event.currentTarget).prop("name")
			let invalid = false
			if (value === "") invalid = true
			if (name.includes("locations")) {
				if (value === gid.All) invalid = true
			} else {
				this.attributes.forEach((e, i) => {
					if (e.id === value && name !== `attributes.${i}.id`) invalid = true
				})
				this.resource_trackers.forEach((e, i) => {
					if (e.id === value && name !== `resource_trackers.${i}.id`) invalid = true
				})
			}
			if (invalid) $(event.currentTarget).addClass("invalid")
			else $(event.currentTarget).removeClass("invalid")
		})
		// Re-uploading old character
		html.find(".quick-import").on("click", event => this._reimport(event))

		// Uploading new character
		if (game.settings.get(SYSTEM_NAME, SETTINGS.SERVER_SIDE_FILE_DIALOG)) {
			html.find("input[type='file']").on("click", event => {
				event.preventDefault()
				const filepicker = new FilePicker({
					callback: (path: string) => {
						const request = new XMLHttpRequest()
						request.open("GET", path)
						new Promise(resolve => {
							request.onload = () => {
								if (request.status === 200) {
									const text = request.response
									this.file = {
										text: text,
										name: path,
										path: request.responseURL,
									}
									this.filename = String(path).split(/\\|\//).pop() || ""
									this.render()
								}
								resolve(this)
							}
						})
						request.send(null)
					},
				})
				filepicker.extensions = [".gcs", ".xml", ".gca5"]
				filepicker.render(true)
			})
		} else {
			html.find("input[type='file']").on("change", event => {
				const filename = String($(event.currentTarget).val()).split(/\\|\//).pop() || ""
				const files = $(event.currentTarget).prop("files")
				this.filename = filename
				if (files) {
					readTextFromFile(files[0]).then(
						text =>
							(this.file = {
								text: text,
								name: files[0].name,
								path: files[0].path,
							})
					)
				}
				this.render()
			})
		}
		html.find(".import-confirm").on("click", event => this._import(event))
		html.find(".item").on("dragover", event => this._onDragItem(event))
		html.find(".add").on("click", event => this._onAddItem(event))
		html.find(".delete").on("click", event => this._onDeleteItem(event))
		html.find(".export").on("click", event => this._onExport(event))
		html.find(".data-import").on("click", event => this._onDataImport(event))
		html.find(".data-export").on("click", event => this._onDataExport(event))
	}

	async _onReset(event: JQuery.ClickEvent) {
		event.preventDefault()
		const type = $(event.currentTarget).data("type")
		const default_attributes = game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_ATTRIBUTES}.attributes`)
		const default_resource_trackers = game.settings.get(
			SYSTEM_NAME,
			`${SETTINGS.DEFAULT_RESOURCE_TRACKERS}.resource_trackers`
		)
		const default_hit_locations = {
			name: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.name`),
			roll: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.roll`),
			locations: game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_HIT_LOCATIONS}.locations`),
		}
		const default_move_types = game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_MOVE_TYPES}.move_types`)
		const update: any = {}
		if (type === "attributes") update["system.settings.attributes"] = default_attributes
		if (type === "resource_trackers") update["system.settings.resource_trackers"] = default_resource_trackers
		if (type === "locations") update["system.settings.body_type"] = default_hit_locations
		if (type === "move_types") update["system.settings.move_types"] = default_move_types
		await this.object.update(update)
		return this.render()
	}

	_onExport(event: JQuery.ClickEvent) {
		event.preventDefault()
		return this.object.saveLocal()
	}

	_onDataImport(event: JQuery.ClickEvent) {
		event.preventDefault()
	}

	_onDataExport(event: JQuery.ClickEvent) {
		event.preventDefault()
		switch ($(event.currentTarget).data("type")) {
			case "attributes":
				return this.object.saveLocal("settings.attributes", "attr")
			case "locations":
				return this.object.saveLocal("settings.body_type", "body")
		}
	}

	async _onAddItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		let path = ""
		let locations = []
		const type: ListType = $(event.currentTarget).data("type")
		let new_id = ""
		if ([ListType.Attributes, ListType.ResourceTrackers, ListType.MoveType].includes(type))
			new_id = getNewAttributeId([...this.attributes, ...this.resource_trackers, ...this.move_types])
		let formData: any = {}
		switch (type) {
			case ListType.Attributes:
				this.attributes.push({
					type: attribute.Type.Integer,
					id: new_id,
					name: "",
					attribute_base: "",
					cost_per_point: 0,
					cost_adj_percent_per_sm: 0,
				})
				await this.object.update({ "system.settings.attributes": this.attributes })
				return this.render()
			case ListType.ResourceTrackers:
				this.resource_trackers.push({
					id: new_id,
					name: "",
					full_name: "",
					max: 0,
					isMaxEnforced: false,
					min: 0,
					isMinEnforced: false,
					thresholds: [],
				})
				await this.object.update({ "system.settings.resource_trackers": this.resource_trackers })
				return this.render()
			case ListType.AttributeThresholds:
				this.attributes[$(event.currentTarget).data("id")].thresholds ??= []
				this.attributes[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: [],
				})
				await this.object.update({ "system.settings.attributes": this.attributes })
				return this.render()
			case ListType.TrackerThresholds:
				this.resource_trackers[$(event.currentTarget).data("id")].thresholds ??= []
				this.resource_trackers[$(event.currentTarget).data("id")].thresholds!.push({
					state: "",
					explanation: "",
					expression: "",
					ops: [],
				})
				await this.object.update({ "system.settings.resource_trackers": this.resource_trackers })
				return this.render()
			case ListType.Locations:
				path = $(event.currentTarget).data("path").replace("array.", "")
				locations = getProperty(this.object, `${path}.locations`) ?? []
				locations.push({
					id: LocalizeGURPS.translations.gurps.placeholder.hit_location.id,
					choice_name: LocalizeGURPS.translations.gurps.placeholder.hit_location.choice_name,
					table_name: LocalizeGURPS.translations.gurps.placeholder.hit_location.table_name,
					slots: 0,
					hit_penalty: 0,
					dr_bonus: 0,
					description: "",
				})
				formData ??= {}
				formData[`array.${path}.locations`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
			case ListType.SubTable:
				path = $(event.currentTarget).data("path").replace("array.", "")
				const index = Number($(event.currentTarget).data("index"))
				locations = getProperty(this.object, `${path}`) ?? []
				locations[index].sub_table = {
					name: "",
					roll: "1d",
					locations: [
						{
							id: LocalizeGURPS.translations.gurps.placeholder.hit_location.id,
							choice_name: LocalizeGURPS.translations.gurps.placeholder.hit_location.choice_name,
							table_name: LocalizeGURPS.translations.gurps.placeholder.hit_location.table_name,
							slots: 0,
							hit_penalty: 0,
							dr_bonus: 0,
							description: "",
						},
					],
				}
				formData ??= {}
				formData[`array.${path}`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
			case ListType.MoveType:
				this.move_types.push({
					id: new_id,
					name: "",
					move_type_base: "",
					cost_per_point: 0,
					overrides: [],
				})
				await this.object.update({ "system.settings.move_types": this.move_types })
				return this.render()
			case ListType.Overrides:
				this.move_types[$(event.currentTarget).data("id")].overrides ??= []
				this.move_types[$(event.currentTarget).data("id")].overrides.push({
					condition: {
						type: MoveTypeOverrideConditionType.Condition,
						qualifier: "",
					},
					move_type_base: "",
				})
				await this.object.update({ "system.settings.move_types": this.move_types })
				return this.render()
		}
	}

	private async _onDeleteItem(event: JQuery.ClickEvent) {
		event.preventDefault()
		event.stopPropagation()
		const path = $(event.currentTarget).data("path")?.replace("array.", "")
		let locations = []
		let formData: any = {}
		const type: ListType = $(event.currentTarget).data("type")
		const index = Number($(event.currentTarget).data("index")) || 0
		const parent_index = Number($(event.currentTarget).data("pindex")) || 0
		switch (type) {
			case ListType.Attributes:
			case ListType.ResourceTrackers:
			case ListType.MoveType:
				this[type].splice(index, 1)
				await this.object.update({ [`system.settings.${type}`]: this[type] })
				return this.render()
			case ListType.AttributeThresholds:
			case ListType.TrackerThresholds:
				const list = type === "attribute_thresholds" ? "attributes" : "resource_trackers"
				this[list][parent_index].thresholds?.splice(index, 1)
				await this.object.update({ [`system.settings.${list}`]: this[list] })
				return this.render()
			case ListType.Overrides:
				this.move_types[parent_index].overrides?.splice(index, 1)
				await this.object.update({ "system.settings.move_types": this.move_types })
				return this.render()
			case ListType.Locations:
				locations = getProperty(this.object, `${path}`) ?? []
				locations.splice($(event.currentTarget).data("index"), 1)
				formData ??= {}
				formData[`array.${path}`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
			case ListType.SubTable:
				locations = getProperty(this.object, `${path}`) ?? []
				delete locations[index].sub_table
				formData ??= {}
				formData[`array.${path}`] = locations
				await this._updateObject(event as unknown as Event, formData)
				return this.render()
		}
	}

	protected async _reimport(event: JQuery.ClickEvent) {
		event.preventDefault()
		const import_path = this.object.importData.path
		const import_name = import_path.match(/.*[/\\]Data[/\\](.*)/)
		const file_path = import_name?.[1].replace(/\\/g, "/") || this.object.importData.name
		const request = new XMLHttpRequest()
		request.open("GET", file_path)

		new Promise(resolve => {
			request.onload = () => {
				if (request.status === 200) {
					const text = request.response
					CharacterImporter.import(this.object, {
						text: text,
						name: file_path,
						path: import_path,
					})
				}
				resolve(this)
			}
		})
		request.send(null)
	}

	protected async _import(event: JQuery.ClickEvent) {
		event.preventDefault()
		if (this.file) {
			const file = this.file
			this.file = undefined
			this.filename = ""
			CharacterImporter.import(this.object, file)
		}
	}

	protected _getHeaderButtons(): Application.HeaderButton[] {
		const all_buttons = [...super._getHeaderButtons()]
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return all_buttons
	}

	protected async _updateObject(event: Event, formData?: any | undefined): Promise<unknown> {
		const element = $(event.currentTarget!)
		if (element.hasClass("invalid")) delete formData[element.prop("name")]
		formData = prepareFormData(formData, this.object)
		if (!this.object.id) return
		if (formData["system.settings.block_layout"])
			formData["system.settings.block_layout"] = formData["system.settings.block_layout"].split("\n")
		await this.object.update(formData)
		return this.render()
	}

	async _onDragStart(event: DragEvent) {
		// TODO:update
		const item = $(event.currentTarget!)
		const type = item.data("type")
		const index = Number(item.data("index"))
		const parent_index = Number(item.data("pindex")) || 0
		event.dataTransfer?.setData(
			"text/plain",
			JSON.stringify({
				type: type,
				index: index,
				parent_index: parent_index,
			})
		)
		;(event as any).dragType = type
	}

	protected _onDragItem(event: JQuery.DragOverEvent): void {
		const element = $(event.currentTarget!)
		const heightAcross = (event.pageY! - element.offset()!.top) / element.height()!
		element.siblings(".item").removeClass("border-top").removeClass("border-bottom")
		if (heightAcross > 0.5) {
			element.removeClass("border-top")
			element.addClass("border-bottom")
		} else {
			element.removeClass("border-bottom")
			element.addClass("border-top")
		}
	}

	protected async _onDrop(event: DragEvent): Promise<unknown> {
		let dragData = DnD.getDragData(event, DnD.TEXT_PLAIN)
		const type: ListType = dragData.type

		let element = $(event.target!)
		if (!element.hasClass("item")) element = element.parent(".item")

		const target_index = element.data("index")
		const above = element.hasClass("border-top")
		if (dragData.order === target_index) return this.render()
		if (above && dragData.order === target_index - 1) return this.render()
		if (!above && dragData.order === target_index + 1) return this.render()

		const path = element.data("path")?.replace("array.", "")
		let container
		switch (type) {
			case ListType.Attributes:
			case ListType.AttributeThresholds:
				container = this.attributes
				break
			case ListType.ResourceTrackers:
			case ListType.TrackerThresholds:
				container = this.resource_trackers
				break
			case ListType.MoveType:
			case ListType.Overrides:
				container = this.move_types
				break
			case ListType.Locations:
			case ListType.SubTable:
				container = getProperty(this.object, path)
				break
		}

		let item
		if ([ListType.AttributeThresholds, ListType.TrackerThresholds].includes(type)) {
			item = container[dragData.parent_index].thresholds.splice(dragData.index, 1)[0]
			container[dragData.parent_index].thresholds.splice(target_index, 0, item as any)
		} else if (type === ListType.Overrides) {
			item = container[dragData.parent_index].overrides.splice(dragData.index, 1)[0]
			container[dragData.parent_index].overrides.splice(target_index, 0, item as any)
		} else {
			item = container.splice(dragData.index, 1)[0]
			container.splice(target_index, 0, item as any)
		}
		if ([ListType.Attributes, ListType.ResourceTrackers, ListType.MoveType].includes(type))
			container.forEach((v: any, k: number) => {
				v.order = k
			})

		switch (type) {
			case ListType.Attributes:
			case ListType.AttributeThresholds:
				await this.object.update({ "system.settings.attributes": container })
			case ListType.ResourceTrackers:
			case ListType.TrackerThresholds:
				await this.object.update({ "system.settings.resource_trackers": container })
			case ListType.MoveType:
			case ListType.Overrides:
				await this.object.update({ "system.settings.move_types": container })
				await this.object.update({ "system.settings.attributes": container })
				return this.render()
			case ListType.Locations:
			case ListType.SubTable:
				const formData: any = {}
				formData[`array.${path}`] = container
				return this._updateObject(event, formData)
		}
	}

	close(options?: FormApplication.CloseOptions | undefined): Promise<void> {
		;(this.object.sheet as unknown as CharacterSheetGURPS).config = null
		return super.close(options)
	}
}
