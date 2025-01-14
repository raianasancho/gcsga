import { WeaponGURPS } from "@module/config"
import { TooltipGURPS } from "@module/tooltip"
import { Int } from "@util/fxp"
import { gid } from "@module/data"
import { WeaponField } from "./weapon_field"
import { feature, wswitch } from "@util/enum"

export class WeaponBlock extends WeaponField {
	no = false

	modifier = 0

	static parse(s: string): WeaponBlock {
		const wp = new WeaponBlock()
		s = s.toLowerCase()
		wp.no = s.includes("no")
		if (!wp.no) {
			wp.modifier = Int.fromString(s)
		}
		wp.validate()
		return wp
	}

	resolve(w: WeaponGURPS, tooltip: TooltipGURPS | null): WeaponBlock {
		const result = WeaponBlock.parse(this.toString())
		result.no = !w.resolveBoolFlag(wswitch.Type.CanBlock, !result.no)
		if (!result.no) {
			const actor = w.actor
			if (actor !== null) {
				let primaryTooltip: TooltipGURPS | null = null
				if (tooltip !== null) primaryTooltip = new TooltipGURPS()
				const preAdj = w.skillLevelBaseAdjustment(actor, primaryTooltip)
				const postAdj = w.skillLevelPostAdjustment(actor, primaryTooltip)
				let best = -Infinity
				for (const def of w.defaults) {
					let level = def.skillLevelFast(actor, false, null, true)
					if (level === -Infinity) continue
					level += preAdj
					if (def.type !== gid.Block) level = Math.trunc(level / 2)
					level += postAdj
					if (best < level) best = level
				}
				if (best !== -Infinity) {
					if (primaryTooltip !== null) tooltip?.push("\n", primaryTooltip)
					result.modifier += 3 + best + actor.parryBonus
					for (const bonus of w.collectWeaponBonuses(1, tooltip, feature.Type.WeaponBlockBonus)) {
						result.modifier += bonus.adjustedAmountForWeapon(w)
					}
					result.modifier = Math.trunc(Math.max(result.modifier, 0))
				} else result.modifier = 0
			}
		}
		result.validate()
		return result
	}

	toString(): string {
		if (this.no) return "No" // not localized
		if (this.modifier === 0) return ""
		let buffer = ""
		buffer += this.modifier.toString()
		return buffer
	}

	validate() {
		if (this.no) {
			this.modifier = 0
		}
	}
}
