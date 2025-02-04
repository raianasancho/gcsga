import { gid } from "@module/data"
import { attribute } from "@util/enum"

export interface AttributeObj {
	// Bonus?: number
	// effectiveBonus?: number
	// cost_reduction?: number
	// order: number
	attr_id: string
	adj: number
	damage?: number
	attribute_def?: AttributeDefObj
	apply_ops?: boolean
	calc?: {
		value: number
		current?: number
		points: number
	}
}

export interface AttributeDefObj {
	id: string
	type: attribute.Type
	name: string
	full_name?: string
	attribute_base: string
	cost_per_point?: number
	cost_adj_percent_per_sm?: number
	thresholds?: PoolThresholdDef[]
	order?: number
}

export enum ThresholdOp {
	HalveMove = "halve_move",
	HalveDodge = "halve_dodge",
	HalveST = "halve_st",
}

export interface PoolThresholdDef {
	state: string
	explanation?: string
	expression?: string
	ops?: ThresholdOp[]
}

export const reserved_ids: string[] = [gid.Skill, gid.Parry, gid.Block, gid.Dodge, gid.SizeModifier, gid.Ten]
