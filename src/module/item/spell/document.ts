import { ItemGCS } from "@item/gcs"
import { SkillLevel } from "@item/skill/data"
import { gid, sheetSettingsFor } from "@module/data"
import { TooltipGURPS } from "@module/tooltip"
import { LocalizeGURPS, NewLineRegex, resolveStudyHours, studyHoursProgressText } from "@util"
import { SpellSource } from "./data"
import { difficulty, display } from "@util/enum"
import { StringBuilder } from "@util/string_builder"
import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"

export class SpellGURPS extends ItemGCS<SpellSource> {
	level: SkillLevel = { level: 0, relative_level: 0, tooltip: new TooltipGURPS() }

	unsatisfied_reason = ""

	get formattedName(): string {
		const name: string = this.name ?? ""
		const TL = this.techLevel
		return `${name}${this.system.tech_level_required ? `/TL${TL ?? ""}` : ""}`
	}

	secondaryText(optionChecker: (option: display.Option) => boolean): string {
		const buffer = new StringBuilder()
		const settings = sheetSettingsFor(this.actor)
		if (optionChecker(settings.notes_display)) {
			buffer.appendToNewLine(this.notes.trim())
			buffer.appendToNewLine(this.rituals)
			buffer.appendToNewLine(
				studyHoursProgressText(resolveStudyHours(this.system.study), this.system.study_hours_needed, false)
			)
		}
		if (optionChecker(settings.skill_level_adj_display)) {
			if (
				this.level.tooltip.length !== 0 &&
				!this.level.tooltip.includes(LocalizeGURPS.translations.gurps.common.no_additional_modifiers)
			) {
				let levelTooltip = this.level.tooltip.string.trim().replaceAll(NewLineRegex, ", ")
				const msg = LocalizeGURPS.translations.gurps.common.includes_modifiers_from
				if (levelTooltip.startsWith(`${msg},`)) levelTooltip = `${msg}:${levelTooltip.slice(msg.length + 1)}`
				buffer.appendToNewLine(levelTooltip)
			}
		}
		return buffer.toString()
	}

	get rituals(): string {
		if (!this.actor) return ""
		const level = this.level?.level ?? 0
		switch (true) {
			case level < 10:
				return LocalizeGURPS.translations.gurps.ritual.sub_10
			case level < 15:
				return LocalizeGURPS.translations.gurps.ritual.sub_15
			case level < 20:
				let ritual = LocalizeGURPS.translations.gurps.ritual.sub_20
				// TODO:
				if (this.system.spell_class.toLowerCase() === "blocking") return ritual
				ritual += LocalizeGURPS.format(LocalizeGURPS.translations.gurps.ritual.cost, {
					adj: 1,
				})
				return ritual
			default:
				const adj = Math.trunc((level - 15) / 5)
				const spell_class = this.system.spell_class.toLowerCase()
				let time = ""
				if (!spell_class.includes("missile"))
					time = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.ritual.time, {
						adj: Math.pow(2, adj),
					})
				let cost = ""
				if (!spell_class.includes("blocking")) {
					cost = LocalizeGURPS.format(LocalizeGURPS.translations.gurps.ritual.cost, {
						adj: adj + 1,
					})
				}
				return LocalizeGURPS.translations.gurps.ritual.none + time + cost
		}
	}

	get points(): number {
		return this.system.points
	}

	get techLevel(): string {
		return this.system.tech_level
	}

	get attribute(): string {
		return this.system.difficulty?.split("/")[0] ?? gid.Intelligence
	}

	get difficulty(): difficulty.Level {
		return (this.system.difficulty?.split("/")[1] as difficulty.Level) ?? difficulty.Level.Hard
	}

	get powerSource(): string {
		return this.system.power_source
	}

	get college(): string[] {
		return this.system.college
	}

	get defaultedFrom(): null {
		return null
	}

	adjustedPoints(tooltip?: TooltipGURPS): number {
		let points = this.points
		if (this.actor) {
			points += this.actor.spellPointBonusesFor(this.name!, this.powerSource, this.college, this.tags, tooltip)
			points = Math.max(points, 0)
		}
		return points
	}

	get skillLevel(): string {
		if (this.effectiveLevel === -Infinity) return "-"
		return this.effectiveLevel.toString()
	}

	get relativeLevel(): string {
		if (this.level.level === -Infinity) return "-"
		return (
			(this.actor?.attributes?.get(this.attribute)?.attribute_def.name ?? "") +
			this.level.relative_level.signedString()
		)
	}

	// Point & Level Manipulation
	updateLevel(): boolean {
		const saved = this.level
		this.level = this.calculateLevel()
		return saved.level !== this.level.level
	}

	get effectiveLevel(): number {
		const actor = this.actor || this.dummyActor
		if (!actor) return -Infinity
		let att = actor.resolveAttributeCurrent(this.attribute)
		let effectiveAtt = actor.resolveAttributeEffective(this.attribute)
		return this.level.level - att + effectiveAtt
	}

	calculateLevel(): SkillLevel {
		const tooltip = new TooltipGURPS()
		let relativeLevel = difficulty.Level.baseRelativeLevel(this.difficulty)
		let level = -Infinity
		if (this.actor) {
			let points = Math.trunc(this.points)
			level = this.actor.resolveAttributeCurrent(this.attribute)
			if (this.difficulty === difficulty.Level.Wildcard) points = Math.trunc(points / 3)
			switch (true) {
				case points === 1:
					// relativeLevel is preset to this point value
					break
				case points > 1 && points < 4:
					relativeLevel += 1
					break
				case points >= 4:
					relativeLevel += 1 + Math.floor(points / 4)
					break
				default:
					level = -Infinity
					relativeLevel = 0
			}
			if (level !== -Infinity) {
				relativeLevel += this.actor.spellBonusFor(
					this.name!,
					this.powerSource,
					this.college,
					this.tags,
					tooltip
				)
				relativeLevel = Math.trunc(relativeLevel)
				level += relativeLevel
			}
		}
		return {
			level: level,
			relative_level: relativeLevel,
			tooltip: tooltip,
		}
	}

	incrementSkillLevel(options?: DocumentModificationOptions) {
		const basePoints = this.points + 1
		let maxPoints = basePoints
		if (this.difficulty === difficulty.Level.Wildcard) maxPoints += 12
		else maxPoints += 4

		const oldLevel = this.level.level
		for (let points = basePoints; points < maxPoints; points++) {
			this.system.points = points
			if (this.calculateLevel().level > oldLevel) {
				return this.update({ "system.points": points }, options)
			}
		}
	}

	decrementSkillLevel(options?: DocumentModificationOptions) {
		if (this.points <= 0) return
		const basePoints = this.points
		let minPoints = basePoints
		if (this.difficulty === difficulty.Level.Wildcard) minPoints -= 12
		else minPoints -= 4
		minPoints = Math.max(minPoints, 0)

		let oldLevel = this.level.level
		for (let points = basePoints; points >= minPoints; points--) {
			this.system.points = points
			if (this.calculateLevel().level < oldLevel) {
				break
			}
		}

		if (this.points > 0) {
			let oldLevel = this.calculateLevel().level
			while (this.points > 0) {
				this.system.points = Math.max(this.points - 1, 0)
				if (this.calculateLevel().level !== oldLevel) {
					this.system.points++
					return this.update({ "system.points": this.points }, options)
				}
			}
		}
	}

	setLevel(level: number) {
		return this.update({ "system.points": this.getPointsForLevel(level) })
	}

	getPointsForLevel(level: number): number {
		const basePoints = this.points
		const oldLevel = this.level.level
		if (oldLevel > level) {
			for (let points = basePoints; points > 0; points--) {
				this.system.points = points
				if (this.calculateLevel().level === level) {
					return points
				}
			}
			return 0
		} else {
			// HACK: capped at 100 points, probably not a good idea
			for (let points = basePoints; points < 100; points++) {
				this.system.points = points
				if (this.calculateLevel().level === level) {
					return points
				}
			}
			return 100
		}
	}
}
