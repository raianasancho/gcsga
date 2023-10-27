import { CharacterGURPS } from "@actor"
import {
	DEFAULT_INITIATIVE_FORMULA,
	Difficulty,
	DisplayMode,
	NumberCompare,
	NumberComparison,
	SETTINGS,
	StringCompare,
	StringComparison,
	Study,
	StudyType,
	SYSTEM_NAME,
} from "@module/data"
import { v4 as uuidv4 } from "uuid"

// /**
//  *
//  * @param value
//  * @param fallback
//  */
// export function i18n(value: string, fallback?: string): string {
// 	const result = game.i18n.localize(value)
// 	if (fallback) return value === result ? fallback : result
// 	return result
// }

// /**
//  * @param value
//  * @param data
//  * @param fallback
//  * @returns {string}
//  */
// export function i18n_f(value: string, data: Record<string, unknown>, fallback?: string): string {
// 	const template = game.i18n.has(value) ? value : fallback
// 	if (!template) return value
// 	const result = game.i18n.format(template, data)
// 	if (fallback) return value === result ? fallback : result
// 	return result
// }

export function sanitizeId(id: string, permit_leading_digits: boolean, reserved: string[]): string {
	const buffer: string[] = []
	for (let ch of id.split("")) {
		if (ch.match("[A-Z]")) ch = ch.toLowerCase()
		if (ch === "_" || ch.match("[a-z]") || (ch.match("[0-9]") && (permit_leading_digits || buffer.length > 0)))
			buffer.push(ch)
	}
	if (buffer.length === 0) buffer.push("_")
	let ok = true
	while (ok) {
		ok = true
		id = buffer.join("")
		for (const r of reserved) {
			if (r === id) {
				buffer.push("_")
				ok = false
				break
			}
		}
		if (ok) return id
	}
	// Cannot reach
	return ""
}

export function sanitize(text: string): string {
	text = text.replace(/%(?![0-9][0-9a-fA-F]+)/g, "%25")
	text = decodeURIComponent(text) // convert % (not followed by 2 digit hex) to %25, unicode characters into html format
	text = text.replace(/&nbsp;/g, " ") // we need to convert non-breaking spaces into regular spaces for parsing
	text = text.replace(/&amp;/g, "&") // we need to convert to & for easier parsing
	text = text.replace(/&minus;/g, "-") // we need to convert to - for easier parsing
	text = text.replace(/&plus;/g, "+") // we need to convert to - for easier parsing
	text = text.replace(/(&#215;|&#xD7;|&times)/g, "x") // we need to convert the multiplication symbol to x for easier parsing
	text = text.replace(/(<([^>]+)>)/gi, "") // remove <html> tags
	text = text.replace(/(\u201c|\u201d)/g, '"') // double quotes
	text = text.replace(/&quot;/g, '"') // double quotes
	text = text.replace(/&#x27;/g, "'") // single quotes
	text = text.replace(/\u2011/g, "-") // replace non-breaking hyphon with a minus sign
	text = text.replace(/\u2212/g, "-") // unicode minus to minus
	return text
}

/**
 *
 */
export function newUUID(): string {
	return uuidv4()
}

/**
 *
 */
export function getCurrentTime(): string {
	return new Date().toISOString()
}

/**
 *
 * @param value
 * @param base
 */
export function stringCompare(value?: string | string[] | null, base?: StringCompare): boolean {
	if (!base) return true
	if (!value) value = ""
	if (typeof value === "string") value = [value]
	value = value.map(e => {
		return e.toLowerCase()
	})
	base.qualifier = base.qualifier?.toLowerCase()
	switch (base.compare) {
		case StringComparison.None:
			return true
		case StringComparison.Is:
			return base.qualifier !== undefined && value.includes(base.qualifier)
		case StringComparison.IsNot:
			return base.qualifier !== undefined && !value.includes(base.qualifier)
		case StringComparison.Contains:
			for (const v of value) if (base.qualifier && v.includes(base.qualifier)) return true
			return false
		case StringComparison.DoesNotContain:
			for (const v of value) if (base.qualifier && v.includes(base.qualifier)) return false
			return true
		case StringComparison.StartsWith:
			for (const v of value) if (base.qualifier && v.startsWith(base.qualifier)) return true
			return false
		case StringComparison.DoesNotStartWith:
			for (const v of value) if (base.qualifier && v.startsWith(base.qualifier)) return false
			return true
		case StringComparison.EndsWith:
			for (const v of value) if (base.qualifier && v.endsWith(base.qualifier)) return true
			return false
		case StringComparison.DoesNotEndWith:
			for (const v of value) if (base.qualifier && v.endsWith(base.qualifier)) return false
			return true
	}
}

/**
 *
 * @param value
 * @param base
 */
export function numberCompare(value: number, base?: NumberCompare): boolean {
	if (!base) return true
	switch (base.compare) {
		case NumberComparison.None:
			return true
		case NumberComparison.Is:
			return value === base.qualifier
		case NumberComparison.IsNot:
			return value !== base.qualifier
		case NumberComparison.AtMost:
			return value <= base.qualifier
		case NumberComparison.AtLeast:
			return value >= base.qualifier
	}
}

/**
 *
 * @param str
 */
export function extractTechLevel(str: string): number {
	return Math.min(Math.max(0, parseInt(str)), 12)
}

export type WeightValueType =
	| "weight_addition"
	| "weight_percentage_addition"
	| "weight_percentage_multiplier"
	| "weight_multiplier"

/**
 *
 * @param s
 */
export function determineModWeightValueTypeFromString(s: string): WeightValueType {
	if (typeof s !== "string") s = `${s}`
	s = s.toLowerCase().trim()
	if (s.endsWith("%")) {
		if (s.startsWith("x")) return "weight_percentage_multiplier"
		return "weight_percentage_addition"
	} else if (s.endsWith("x") || s.startsWith("x")) return "weight_multiplier"
	return "weight_addition"
}

export interface Fraction {
	numerator: number
	denominator: number
}

/**
 *
 * @param s
 */
export function extractFraction(s: string): Fraction {
	if (typeof s !== "string") s = `${s}`
	let v = s.trim()
	while (v.length > 0 && v.at(-1)?.match("[0-9]")) {
		v = v.substring(0, v.length - 1)
	}
	const f = v.split("/")
	const fraction: Fraction = {
		numerator: parseInt(f[0]) || 0,
		denominator: parseInt(f[1]) || 1,
	}
	const revised = determineModWeightValueTypeFromString(s)
	if (revised === "weight_percentage_multiplier") {
		if (fraction.numerator <= 0) {
			fraction.numerator = 100
			fraction.denominator = 1
		}
	} else if (revised === "weight_multiplier") {
		if (fraction.numerator <= 0) {
			fraction.numerator = 1
			fraction.denominator = 1
		}
	}
	return fraction
}

/**
 *
 * @param i
 */
export function dollarFormat(i: number): string {
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	})
	return formatter.format(i)
}

export function round(n: number, p = 4): number {
	return Math.round(n * 10 ** p) / 10 ** p
}

/**
 *
 * @param n
 */
export function toWord(n: number): string {
	switch (n) {
		case 1:
			return "one"
		case 2:
			return "two"
		case 3:
			return "three"
		case 4:
			return "four"
		case 5:
			return "five"
		case 6:
			return "six"
		default:
			return "d6"
	}
}

/**
 *
 * @param str
 */
export function removeAccents(str: string): string {
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove accents
		.replace(/([^\w]+|\s+)/g, "-") // Replace space and other characters by hyphen
		.replace(/--+/g, "-") // Replaces multiple hyphens by one hyphen
		.replace(/(^-+|-+$)/g, "")
}

/**
 *
 * @param s
 */
export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

// Object.defineProperty(String.prototype, 'capitalize', {
// 	value: function() {
// 		return this.charAt(0).toUpperCase() + this.slice(1);
// 	},
// 	enumerable: false
// });

/**
 *
 * @param s
 */
export function getAdjustedStudyHours(s: Study): number {
	switch (s.type) {
		case StudyType.Self:
			return s.hours * 0.5
		case StudyType.Job:
			return s.hours * 0.25
		case StudyType.Teacher:
			return s.hours
		case StudyType.Intensive:
			return s.hours * 2
	}
}

export function prepareFormData(formData: any, object: any): any {
	for (let aKey of Object.keys(formData)) {
		if (formData[aKey] === null) formData[aKey] = "0"
		if (aKey.includes(".halve_")) {
			const tKey = aKey.replace(/\.halve_.*$/, "")
			const tOp = aKey.split(".").at(-1)
			formData[`${tKey}.ops`] ??= []
			if (formData[aKey]) formData[`${tKey}.ops`].push(tOp)
			delete formData[aKey]
		}
	}
	for (let aKey of Object.keys(formData)) {
		if (aKey.startsWith("array.") && aKey.match(/\d/)) {
			const key = aKey.replace(/^array./g, "")
			const arrayKey = key.split(/.\d+./)[0]
			let array: any[] = formData[arrayKey] || getProperty(object, arrayKey)
			const index = parseInt(key.match(/.(\d+)./)![1])
			const prop = key.replace(new RegExp(`^${arrayKey}.${index}.`), "")
			array = setArrayProperty(array, index, prop, formData[aKey])
			formData[arrayKey] = array
			delete formData[aKey]
		} else if (aKey.startsWith("array.")) {
			formData[aKey.replace("array.", "")] = formData[aKey]
			delete formData[aKey]
			// HACK: stupid exception for static resource trackers only. remove in 2.0
		} else if (aKey.startsWith("sarray.") && aKey.match(/\d/)) {
			const key = aKey.replace(/^sarray./g, "")
			const arrayKey = `${key.split(/thresholds.\d+./)[0]}thresholds`
			const array: any[] = getProperty(object, arrayKey)
			const index = parseInt(key.match(/thresholds.(\d+)./)![1])
			const prop = key.replace(new RegExp(`^${arrayKey}.${index}.`), "")
			setArrayProperty(array, index, prop, formData[aKey])
			formData[arrayKey] = array
			delete formData[aKey]
		}
	}
	return formData
}

/**
 *
 * @param a
 * @param index
 * @param prop
 * @param value
 */
function setArrayProperty(a: any[], index: number, prop: string, value: any): any[] {
	if (prop.match(/.\d+./)) {
		const inArrayKey = prop.split(/.\d+./)[0]
		const inArrayArray = getProperty(a[index], inArrayKey)
		const inArrayIndex = parseInt(prop.match(/.(\d+)./)![1])
		const inArrayProp = prop.replace(`${inArrayKey}.${inArrayIndex}.`, "")
		setProperty(a[index], inArrayKey, setArrayProperty(inArrayArray, inArrayIndex, inArrayProp, value))
		return a
	}
	setProperty(a[index], prop, value)
	return a
}

export function equalFold(s: string, t: string): boolean {
	if (!s && !t) return false
	return s.toLowerCase() === t.toLowerCase()
}

/**
 * Prounounced "dee six if eye" Convert a GURPS dice roll to Foundry dice roll (e.g. 1d => 1d6, 2d-1 => 2d6-1)
 * @param {string} str
 * @param {string | null} flavor
 * @returns {string}
 */
export function d6ify(str: string, flavor: string | null = ""): string {
	let w = str.replace(/d([^6])/g, `d6${flavor || ""}$1`) // Find 'd's without a 6 behind it, and add it.
	return w.replace(/d$/g, `d6${flavor || ""}`) // And do the same for the end of the line.
}

export function difficultyRelativeLevel(d: Difficulty): number {
	switch (d) {
		case Difficulty.Easy:
			return 0
		case Difficulty.Average:
			return -1
		case Difficulty.Hard:
			return -2
		case Difficulty.VeryHard:
		case Difficulty.Wildcard:
			return -3
		default:
			return difficultyRelativeLevel(Difficulty.Easy)
	}
}

export async function urlToBase64(imageUrl: string) {
	const format = imageUrl.split(".").at(-1) || ""
	if (!["png", "webp", "jpg", "jpeg"].includes(format)) return ""
	let img: any = await fetch(imageUrl)
	img = await img.blob()
	let bitmap = await createImageBitmap(img)
	let canvas = document.createElement("canvas")
	let ctx = canvas.getContext("2d")
	canvas.width = bitmap.width
	canvas.height = bitmap.height
	ctx?.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height)
	switch (format) {
		case "webp":
			return canvas.toDataURL("image/webp").replace("data:image/webp;base64,", "")
		case "png":
			return canvas.toDataURL("image/png").replace("data:image/png;base64,", "")
		case "jpeg":
		case "jpg":
			return canvas.toDataURL("image/jpeg").replace("data:image/png;base64,", "")
	}
}

export function setInitiative() {
	let formula: string = game.settings.get(SYSTEM_NAME, SETTINGS.INITIATIVE_FORMULA) as string
	if (!formula) formula = DEFAULT_INITIATIVE_FORMULA
	if (game.user?.isGM) game.settings.set(SYSTEM_NAME, SETTINGS.INITIATIVE_FORMULA, formula)
	CONFIG.Combat.initiative.formula = formula
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: Iterable<K>): Pick<T, K> {
	return [...keys].reduce((result, key) => {
		if (key in obj) {
			result[key] = obj[key]
		}
		return result
	}, {} as Pick<T, K>)
}

export async function getDefaultSkills() {
	const skills: Item[] = []
	const skillPacks = (game.settings.get(SYSTEM_NAME, SETTINGS.COMPENDIUM_BROWSER_PACKS) as any).skill
	for (const s in skillPacks)
		if (skillPacks[s].skillDefault) {
			const pack = game.packs.get(s) as CompendiumCollection<any>
				; (await pack.getDocuments()).forEach(e => {
					skills.push(e)
				})
		}
	CONFIG.GURPS.skillDefaults = skills
}

export function flatten(obj: any, flatObj: Record<string, any> = {}, key = ""): Record<string, any> | null {
	if (obj === null) return null
	for (const k of Object.keys(obj)) {
		let valKey = key === "" ? k : `${key}.${k}`
		if (typeof obj[k] === "object") {
			if (Array.isArray(obj[k]) && !valKey.startsWith("array.")) valKey = `array.${valKey}`
			flatten(obj[k], flatObj, valKey)
		} else flatObj[valKey] = obj[k]
	}
	return flatObj
}

export function inlineNote(
	actor: CharacterGURPS,
	option: "user_description_display" | "modifiers_display" | "notes_display" | "skill_level_adj_display"
): boolean {
	return [DisplayMode.Inline, DisplayMode.InlineAndTooltip].includes(actor.settings[option])
}
