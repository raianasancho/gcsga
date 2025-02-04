import { CharacterSheetConfig } from "@actor/character/config_sheet"
import { Attribute, AttributeObj } from "@module/attribute"
import { SYSTEM_NAME } from "@module/data"
import { DiceGURPS } from "@module/dice"
import { LocalizeGURPS } from "@util"
import { Mook } from "./document"
import { attribute } from "@util/enum"
import { MookParser } from "./parse"
import { DialogGURPS } from "@ui"
import { EXAMPLE_STATBLOCKS } from "./data"

export class MookGeneratorSheet extends FormApplication {
	config: CharacterSheetConfig | null = null

	object: Mook

	// text = {
	// 	traits: "",
	// 	skills: "",
	// 	spells: "",
	// 	equipment: "",
	// 	melee: "",
	// 	ranged: "",
	// 	catchall: ""
	// }

	testing = true

	constructor(options?: Partial<ApplicationOptions>) {
		super(options)
		this.object = new Mook()
		;(game as any).mook = this.object
	}

	static get defaultOptions(): FormApplicationOptions {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			minimizable: true,
			resizable: false,
			width: 800,
			height: "auto",
			template: `systems/${SYSTEM_NAME}/templates/mook-generator/sheet.hbs`,
			classes: ["mook-generator", "gurps"],
			closeOnSubmit: false,
			submitOnChange: true,
			submitOnClose: true,
		})
	}

	get title(): string {
		return LocalizeGURPS.translations.gurps.mook.title
	}

	activateListeners(html: JQuery<HTMLElement>): void {
		super.activateListeners(html)
		html.find("#import").on("click", event => this._onImportText(event))
		html.find("#create").on("click", event => this._onCreateMook(event))
		html.find("textarea").on("input propertychange", _ => {
			if (!this.testing) {
				this.testing = true
				const button = $(html).find("button#create span")
				button.text(LocalizeGURPS.translations.gurps.mook.test)
			}
		})
	}

	static async init(): Promise<unknown> {
		const mg = new MookGeneratorSheet()
		return mg.render(true)
	}

	getData(options?: Partial<ApplicationOptions> | undefined): MaybePromise<object> {
		const [primary_attributes, secondary_attributes, point_pools] = this.prepareAttributes(this.object.attributes)

		return mergeObject(super.getData(options), {
			actor: this.object,
			primary_attributes,
			secondary_attributes,
			point_pools,
			button_text: this.testing
				? LocalizeGURPS.translations.gurps.mook.test
				: LocalizeGURPS.translations.gurps.mook.create,
			text: this.object.text,
		})
	}

	private _prepareText(): Record<
		"traits" | "skills" | "spells" | "equipment" | "melee" | "ranged" | "catchall",
		string
	> {
		return {
			traits: this.object.traits.reduce((acc, e) => {
				if (acc !== "") acc += "\n"
				acc += e.toString()
				return acc
			}, ""),
			skills: this.object.skills.reduce((acc, e) => {
				if (acc !== "") acc += "\n"
				acc += e.toString()
				return acc
			}, ""),
			spells: this.object.spells.reduce((acc, e) => {
				if (acc !== "") acc += "\n"
				acc += e.toString()
				return acc
			}, ""),
			equipment: this.object.equipment.reduce((acc, e) => {
				if (acc !== "") acc += "\n"
				acc += e.toString()
				return acc
			}, ""),
			melee: this.object.melee.reduce((acc, e) => {
				if (acc !== "") acc += "\n"
				acc += e.toString()
				return acc
			}, ""),
			ranged: this.object.ranged.reduce((acc, e) => {
				if (acc !== "") acc += "\n"
				acc += e.toString()
				return acc
			}, ""),
			catchall: this.object.text.catchall,
		}
	}

	prepareAttributes(attributes: Map<string, Attribute>): [Attribute[], Attribute[], Attribute[]] {
		const primary_attributes: Attribute[] = []
		const secondary_attributes: Attribute[] = []
		const point_pools: Attribute[] = []
		if (attributes)
			attributes.forEach(a => {
				if ([attribute.Type.Pool, attribute.Type.PoolSeparator].includes(a.attribute_def?.type))
					point_pools.push(a)
				else if (a.attribute_def?.isPrimary) primary_attributes.push(a)
				else secondary_attributes.push(a)
			})
		return [primary_attributes, secondary_attributes, point_pools]
	}

	private async _onImportText(event: JQuery.ClickEvent) {
		event.preventDefault()
		const dialog = new DialogGURPS(
			{
				title: "Import Stat Block",
				content: await renderTemplate(`systems/${SYSTEM_NAME}/templates/mook-generator/import.hbs`, {
					block: "",
				}),
				buttons: {
					import: {
						icon: "<i class='fas fa-file-import'></i>",
						label: "Import",
						callback: (html: HTMLElement | JQuery<HTMLElement>) => {
							if (html instanceof HTMLElement) html = $(html)
							const textArray = html.find("textarea")[0]
							let text = textArray.value
							if (text.length < 3) text = EXAMPLE_STATBLOCKS[parseInt(text)]
							if (text.trim()) {
								const data = MookParser.init(text, this.object).parseStatBlock(text)
								this.object.update(data)
							}
							this.testing = true
							this.object.text = this._prepareText()
							return this.render()
						},
					},
					cancel: {
						icon: "<i class='fas fa-times'></i>",
						label: "Cancel",
					},
				},
				default: "import",
			},
			{ width: 800, height: 800 }
		)
		dialog.render(true)
	}

	private _onCreateMook(event: JQuery.ClickEvent) {
		event.preventDefault()
		if (this.testing) {
			this.testing = !this.testMook()
			return this.render()
		} else return this.createMook()
	}

	private testMook() {
		if (this.object.profile.name === "") {
			ui.notifications?.error(LocalizeGURPS.translations.gurps.error.mook.name)
			return false
		}
		const parser = new MookParser("", this.object)
		const text = this.object.text
		console.log(text.traits)
		this.object.traits = parser.parseTraits(text.traits.replace(/\n/g, ";"), true)
		this.object.skills = parser.parseSkills(text.skills.replace(/\n/g, ";"), true)
		this.object.spells = parser.parseSpells(text.spells.replace(/\n/g, ";"), true)
		;[this.object.melee] = parser.parseAttacks(text.melee.replace(/\n/g, ";"), true, true)
		;[, this.object.ranged] = parser.parseAttacks(text.ranged.replace(/\n/g, ";"), true, true)
		console.log(this.object)
		return true
	}

	private async createMook() {
		const actor = await this.object.createActor()
		await actor?.sheet?.render(true)
		return this.close()
	}

	protected override _getHeaderButtons(): Application.HeaderButton[] {
		const buttons: Application.HeaderButton[] = []
		const all_buttons = super._getHeaderButtons()
		all_buttons.at(-1)!.label = ""
		all_buttons.at(-1)!.icon = "gcs-circled-x"
		return [...buttons, all_buttons.at(-1)!]
	}

	protected async _updateObject(_event: Event, formData: any): Promise<unknown> {
		for (const i of Object.keys(formData)) {
			if (i.startsWith("attributes.")) {
				const attributes: AttributeObj[] =
					(formData["system.attributes"] as AttributeObj[]) ?? duplicate(this.object.system.attributes)
				const id = i.split(".")[1]
				const att = this.object.attributes.get(id)
				if (att) {
					if (i.endsWith(".adj")) (formData[i] as number) -= att.max - att.adj
					if (i.endsWith(".damage")) (formData[i] as number) = Math.max(att.max - (formData[i] as number), 0)
				}
				const key = i.replace(`attributes.${id}.`, "")
				const index = attributes.findIndex(e => e.attr_id === id)
				setProperty(attributes[index], key, formData[i])
				formData["system.attributes"] = attributes
				delete formData[i]
			}
			if (i === "thrust") formData.thrust = new DiceGURPS(formData.thrust)
			if (i === "swing") formData.swing = new DiceGURPS(formData.swing)
		}
		console.log(formData)
		return this.object.update(formData)
	}
}
