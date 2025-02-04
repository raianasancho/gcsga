import {
	EquipmentContainerSystemData,
	EquipmentModifierContainerSystemData,
	EquipmentModifierSystemData,
	EquipmentSystemData,
	ItemFlags,
	ItemFlagsGURPS,
	MeleeWeaponSystemData,
	NoteContainerSystemData,
	NoteSystemData,
	RangedWeaponSystemData,
	RitualMagicSpellSystemData,
	SkillContainerSystemData,
	SkillSystemData,
	SpellContainerSystemData,
	SpellSystemData,
	TechniqueSystemData,
	TraitContainerSystemData,
	TraitModifierContainerSystemData,
	TraitModifierSystemData,
	TraitSystemData,
} from "@item"
import { Feature, ItemSystemDataGURPS } from "@module/config"
import { ItemType, SYSTEM_NAME } from "@module/data"
import { SkillDefault } from "@module/default"
import { PrereqList } from "@prereq"
import { LocalizeGURPS } from "./localize"
import { newUUID } from "./misc"
import { feature, selfctrl, stdmg } from "./enum"

class ImportUtils {
	static importItems(
		list: Array<ItemSystemDataGURPS | any>,
		context: { container: string | null; other?: boolean; sort: number } = { container: null, sort: 0 }
	): Array<any> {
		if (!list) return []
		let items: Array<any> = []

		for (const item of list) {
			item.name ??= (item as any).description ?? (item as any).text ?? (item as any).usage
			const [itemData, itemFlags, children, id] = ImportUtils.getItemData(item, context, randomID())

			let type = itemData.type.replace("_container", "")
			if (type === ItemType.Technique) type = ItemType.Skill
			else if (type === ItemType.RitualMagicSpell) type = ItemType.Spell
			else if (type === ItemType.Equipment) type = "equipment"
			const newItem = {
				name: item.name,
				img: `systems/${SYSTEM_NAME}/assets/icons/${type}.svg`,
				type: itemData.type,
				system: itemData,
				flags: itemFlags,
				sort: context.sort * 1000,
				_id: id,
			}
			if (!newItem.name) {
				newItem.name = game.i18n.localize(`TYPES.Item.${newItem.system.type}`)
			}
			items.push(newItem)
			items = items.concat(children)
			context.sort++
		}
		return items
	}

	private static getItemData(
		item: ItemSystemDataGURPS,
		context: { container: string | null; other?: boolean; sort: number },
		id: string
	): [ItemSystemDataGURPS, ItemFlagsGURPS, Array<any>, string] {
		// const flags: ItemFlagsGURPS = { [SYSTEM_NAME]: { [ItemFlags.Container]: null } }
		const flags: ItemFlagsGURPS = { [SYSTEM_NAME]: { [ItemFlags.Container]: context.container } }
		if (["equipment", "equipment_container"].includes(item.type))
			flags[SYSTEM_NAME]![ItemFlags.Other] = context.other || false
		let items: Array<any> = []
		switch (item.type) {
			case "trait":
				items = [
					...ImportUtils.importItems((item as any).modifiers, { container: id, sort: context.sort }),
					...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort }),
				]
				return [ImportUtils.getTraitData(item as TraitSystemData), flags, items, id]
			case "trait_container":
				items = [
					...ImportUtils.importItems((item as any).children, { container: id, sort: context.sort }),
					...ImportUtils.importItems((item as any).modifiers, { container: id, sort: context.sort }),
					...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort }),
				]
				return [ImportUtils.getTraitContainerData(item as TraitContainerSystemData), flags, items, id]
			case "modifier":
				return [ImportUtils.getTraitModifierData(item as TraitModifierSystemData), flags, items, id]
			case "modifier_container":
				items = [...ImportUtils.importItems((item as any).children, { container: id, sort: context.sort })]
				return [
					ImportUtils.getTraitModifierContainerData(item as TraitModifierContainerSystemData),
					flags,
					items,
					id,
				]
			case "skill":
				items = [...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort })]
				return [ImportUtils.getSkillData(item as SkillSystemData), flags, items, id]
			case "technique":
				items = [...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort })]
				return [ImportUtils.getTechniqueData(item as TechniqueSystemData), flags, items, id]
			case "skill_container":
				items = [...ImportUtils.importItems((item as any).children, { container: id, sort: context.sort })]
				return [ImportUtils.getSkillContainerData(item as SkillContainerSystemData), flags, items, id]
			case "spell":
				items = [...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort })]
				return [ImportUtils.getSpellData(item as SpellSystemData), flags, items, id]
			case "ritual_magic_spell":
				items = [...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort })]
				return [ImportUtils.getRitualMagicSpellData(item as RitualMagicSpellSystemData), flags, items, id]
			case "spell_container":
				items = [...ImportUtils.importItems((item as any).children, { container: id, sort: context.sort })]
				return [ImportUtils.getSpellContainerData(item as SpellContainerSystemData), flags, items, id]
			case "equipment":
				items = [
					...ImportUtils.importItems((item as any).modifiers, { container: id, sort: context.sort }),
					...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort }),
				]
				return [ImportUtils.getEquipmentData(item as EquipmentSystemData), flags, items, id]
			case "equipment_container":
				items = [
					...ImportUtils.importItems((item as any).children, { container: id, sort: context.sort }),
					...ImportUtils.importItems((item as any).modifiers, { container: id, sort: context.sort }),
					...ImportUtils.importItems((item as any).weapons, { container: id, sort: context.sort }),
				]
				return [ImportUtils.getEquipmentContainerData(item as EquipmentContainerSystemData), flags, items, id]
			case "eqp_modifier":
				return [ImportUtils.getEquipmentModifierData(item as EquipmentModifierSystemData), flags, items, id]
			case "eqp_modifier_container":
				items = [...ImportUtils.importItems((item as any).children, { container: id, sort: context.sort })]
				return [
					ImportUtils.getEquipmentModifierContainerData(item as EquipmentModifierContainerSystemData),
					flags,
					items,
					id,
				]
			case "note":
				return [ImportUtils.getNoteData(item as NoteSystemData), flags, items, id]
			case "note_container":
				items = [...ImportUtils.importItems((item as any).children, { container: id, sort: context.sort })]
				return [ImportUtils.getNoteContainerData(item as NoteContainerSystemData), flags, items, id]
			case "melee_weapon":
				return [ImportUtils.getMeleeWeaponData(item as MeleeWeaponSystemData), flags, items, id]
			case "ranged_weapon":
				return [ImportUtils.getRangedWeaponData(item as RangedWeaponSystemData), flags, items, id]
			default:
				throw new Error(
					LocalizeGURPS.format(LocalizeGURPS.translations.gurps.error.import.invalid_item_type, {
						type: item.type,
					})
				)
		}
	}

	private static getTraitData(data: TraitSystemData): TraitSystemData {
		return {
			name: data.name ?? "Trait",
			type: ItemType.Trait,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? PrereqList.fromObject(data.prereqs) : new PrereqList(),
			round_down: data.round_down ?? false,
			disabled: data.disabled ?? false,
			can_level: data.can_level ?? false,
			levels: data.levels ?? 0,
			base_points: data.base_points ?? 0,
			points_per_level: data.points_per_level ?? 0,
			cr: data.cr ?? selfctrl.Roll.NoCR,
			cr_adj: data.cr_adj ?? selfctrl.Adjustment.NoCRAdj,
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
			study_hours_needed: data.study_hours_needed ?? "200",
			userdesc: data.userdesc ?? "",
		}
	}

	private static getTraitContainerData(data: TraitContainerSystemData): TraitContainerSystemData {
		return {
			name: data.name ?? "Trait Container",
			type: ItemType.TraitContainer,
			container_type: data.container_type ?? "group",
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			disabled: data.disabled ?? false,
			cr: data.cr ?? selfctrl.Roll.NoCR,
			cr_adj: data.cr_adj ?? selfctrl.Adjustment.NoCRAdj,
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getTraitModifierData(data: TraitModifierSystemData): TraitModifierSystemData {
		return {
			name: data.name ?? "Trait Modifier",
			type: ItemType.TraitModifier,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			disabled: data.disabled ?? false,
			cost_type: data.cost_type ?? "percentage",
			cost: data.cost ?? 0,
			affects: data.affects ?? "total",
			levels: data.levels ?? 0,
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getTraitModifierContainerData(
		data: TraitModifierContainerSystemData
	): TraitModifierContainerSystemData {
		return {
			name: data.name ?? "Trait Modifier Container",
			type: ItemType.TraitModifierContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getSkillData(data: SkillSystemData): SkillSystemData {
		return {
			name: data.name ?? "Skill",
			type: ItemType.Skill,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? PrereqList.fromObject(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			specialization: data.specialization ?? "",
			tech_level: data.tech_level ?? "",
			tech_level_required: !!data.tech_level,
			encumbrance_penalty_multiplier: data.encumbrance_penalty_multiplier ?? 0,
			difficulty: data.difficulty ?? "dx/a",
			defaults: data.defaults ? ImportUtils.importDefaults(data.defaults) : [],
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
			study_hours_needed: data.study_hours_needed ?? "200",
			defaulted_from: null,
		}
	}

	private static getTechniqueData(data: TechniqueSystemData): TechniqueSystemData {
		return {
			name: data.name ?? "Technique",
			type: ItemType.Technique,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? PrereqList.fromObject(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			limit: data.limit ?? 0,
			limited: !!data.limit ?? false,
			tech_level: data.tech_level ?? "",
			encumbrance_penalty_multiplier: data.encumbrance_penalty_multiplier ?? 0,
			difficulty: data.difficulty ?? "dx/a",
			default: data.default ? new SkillDefault(data.default) : new SkillDefault(),
			defaults: data.defaults ? ImportUtils.importDefaults(data.defaults) : [],
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
			study_hours_needed: data.study_hours_needed ?? "200",
			defaulted_from: null,
		}
	}

	private static getSkillContainerData(data: SkillContainerSystemData): SkillContainerSystemData {
		return {
			name: data.name ?? "Skill Container",
			type: ItemType.SkillContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getSpellData(data: SpellSystemData): SpellSystemData {
		return {
			name: data.name ?? "Spell",
			type: ItemType.Spell,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? PrereqList.fromObject(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			tech_level: data.tech_level ?? "",
			tech_level_required: !!data.tech_level,
			difficulty: data.difficulty ?? "dx/a",
			college: data.college ?? [],
			power_source: data.power_source ?? "",
			spell_class: data.spell_class ?? "",
			resist: data.resist ?? "",
			casting_cost: data.casting_cost ?? "",
			maintenance_cost: data.maintenance_cost ?? "",
			casting_time: data.casting_time ?? "",
			duration: data.duration ?? "",
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
			study_hours_needed: data.study_hours_needed ?? "200",
		}
	}

	private static getRitualMagicSpellData(data: RitualMagicSpellSystemData): RitualMagicSpellSystemData {
		return {
			name: data.name ?? "Spell",
			type: ItemType.RitualMagicSpell,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? PrereqList.fromObject(data.prereqs) : new PrereqList(),
			points: data.points ?? 1,
			tech_level: data.tech_level ?? "",
			tech_level_required: !!data.tech_level,
			difficulty: data.difficulty ?? "dx/a",
			college: data.college ?? [],
			power_source: data.power_source ?? "",
			spell_class: data.spell_class ?? "",
			resist: data.resist ?? "",
			casting_cost: data.casting_cost ?? "",
			maintenance_cost: data.maintenance_cost ?? "",
			casting_time: data.casting_time ?? "",
			duration: data.duration ?? "",
			base_skill: data.base_skill ?? "",
			prereq_count: data.prereq_count ?? 0,
			vtt_notes: data.vtt_notes ?? "",
			study: data.study ?? [],
			study_hours_needed: data.study_hours_needed ?? "200",
		}
	}

	private static getSpellContainerData(data: SpellContainerSystemData): SpellContainerSystemData {
		return {
			name: data.name ?? "Spell Container",
			type: ItemType.SpellContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	// private static getEquipmentData(data: EquipmentSystemData, other = false): EquipmentSystemData {
	private static getEquipmentData(data: EquipmentSystemData): EquipmentSystemData {
		return {
			name: data.name ?? "Equipment",
			type: ItemType.Equipment,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? PrereqList.fromObject(data.prereqs) : new PrereqList(),
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			tech_level: data.tech_level ?? "",
			value: data.value ?? 0,
			weight: data.weight ?? "0 lb",
			uses: data.uses ?? 0,
			max_uses: data.max_uses ?? 0,
			equipped: data.equipped ?? true,
			description: data.description ?? "",
			legality_class: data.legality_class ?? "4",
			quantity: data.quantity ?? 0,
			ignore_weight_for_skills: data.ignore_weight_for_skills ?? false,
			rated_strength: data.rated_strength ?? 0,
			// other: other,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getEquipmentContainerData(
		data: EquipmentContainerSystemData
		// other = false
	): EquipmentContainerSystemData {
		return {
			name: data.name ?? "Equipment",
			type: ItemType.EquipmentContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			prereqs: data.prereqs ? PrereqList.fromObject(data.prereqs) : new PrereqList(),
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			tech_level: data.tech_level ?? "",
			value: data.value ?? 0,
			weight: data.weight ?? "0 lb",
			uses: data.uses ?? 0,
			max_uses: data.max_uses ?? 0,
			equipped: data.equipped ?? true,
			description: data.description ?? "",
			legality_class: data.legality_class ?? "4",
			quantity: data.quantity ?? 0,
			ignore_weight_for_skills: data.ignore_weight_for_skills ?? false,
			rated_strength: data.rated_strength ?? 0,
			// other: other,
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getEquipmentModifierData(data: EquipmentModifierSystemData): EquipmentModifierSystemData {
		return {
			name: data.name ?? "Equipment Modifier",
			type: ItemType.EquipmentModifier,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			cost_type: data.cost_type ?? "to_original_cost",
			cost: data.cost ?? "",
			weight_type: data.weight_type ?? "to_original_weight",
			weight: data.weight ?? "",
			tech_level: data.tech_level ?? "",
			features: data.features ? ImportUtils.importFeatures(data.features) : [],
			disabled: data.disabled ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getEquipmentModifierContainerData(
		data: EquipmentModifierContainerSystemData
	): EquipmentModifierContainerSystemData {
		return {
			name: data.name ?? "Equipment Modifier Container",
			type: ItemType.EquipmentModifierContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getNoteData(data: NoteSystemData): NoteSystemData {
		return {
			name: data.text ?? "Note",
			type: ItemType.Note,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			text: data.text ?? "",
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getNoteContainerData(data: NoteContainerSystemData): NoteContainerSystemData {
		return {
			name: data.name ?? "Note",
			type: ItemType.NoteContainer,
			id: data.id ?? newUUID(),
			reference: data.reference ?? "",
			reference_highlight: data.reference_highlight ?? "",
			notes: data.notes ?? "",
			tags: data.tags ?? [],
			text: data.text ?? "",
			open: data.open ?? false,
			vtt_notes: data.vtt_notes ?? "",
		}
	}

	private static getMeleeWeaponData(data: MeleeWeaponSystemData): MeleeWeaponSystemData {
		return {
			id: data.id ?? newUUID(),
			type: ItemType.MeleeWeapon,
			strength: data.strength ?? "",
			usage: data.usage ?? "",
			usage_notes: data.usage_notes ?? "",
			defaults: data.defaults ? ImportUtils.importDefaults(data.defaults) : [],
			reach: data.reach ?? "",
			parry: data.parry ?? "",
			block: data.block ?? "",
			damage: {
				type: data.damage.type ?? "",
				st: data.damage.st ?? stdmg.Option.None,
				base: data.damage.base ?? "",
				armor_divisor: data.damage.armor_divisor ?? 1,
				fragmentation: data.damage.fragmentation ?? "",
				fragmentation_armor_divisor: data.damage.fragmentation_armor_divisor ?? 1,
				fragmentation_type: data.damage.fragmentation_type ?? "",
				modifier_per_die: data.damage.modifier_per_die ?? 0,
			},
		}
	}

	private static getRangedWeaponData(data: RangedWeaponSystemData): RangedWeaponSystemData {
		return {
			id: data.id ?? newUUID(),
			type: ItemType.RangedWeapon,
			strength: data.strength ?? "",
			usage: data.usage ?? "",
			usage_notes: data.usage_notes ?? "",
			defaults: data.defaults ? ImportUtils.importDefaults(data.defaults) : [],
			accuracy: data.accuracy ?? "",
			range: data.range ?? "",
			rate_of_fire: data.rate_of_fire ?? "",
			shots: data.shots ?? "",
			bulk: data.bulk ?? "",
			recoil: data.recoil ?? "",
			damage: {
				type: data.damage.type ?? "",
				st: data.damage.st ?? stdmg.Option.None,
				base: data.damage.base ?? "",
				armor_divisor: data.damage.armor_divisor ?? 1,
				fragmentation: data.damage.fragmentation ?? "",
				fragmentation_armor_divisor: data.damage.fragmentation_armor_divisor ?? 1,
				fragmentation_type: data.damage.fragmentation_type ?? "",
				modifier_per_die: data.damage.modifier_per_die ?? 0,
			},
		}
	}

	private static importFeatures(features: Feature[]): Feature[] {
		const list: Feature[] = []
		for (const e of features) {
			const FeatureConstructor = CONFIG.GURPS.Feature.classes[e.type as feature.Type]
			if (FeatureConstructor) {
				const f = FeatureConstructor.fromObject(e)
				list.push(f.toObject())
			}
		}
		return list
	}

	private static importDefaults(features: SkillDefault[]): SkillDefault[] {
		const list: SkillDefault[] = []
		for (const d of features) {
			list.push(new SkillDefault(d))
		}
		return list
	}
}

export { ImportUtils }
