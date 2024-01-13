import { AllManeuverIDs, AllPostures } from "@item/condition/data"
import { allMoveTypeOverrideConditions } from "@module/move_type"
import {
	AllNumericCompareTypes,
	AllStringCompareTypes,
	ContainedQuantityNumericCompareTypes,
	LocalizeGURPS,
	allLengthUnits,
	allWeightUnits,
} from "@util"
import {
	affects,
	attribute,
	container,
	difficulty,
	display,
	emcost,
	emweight,
	feature,
	movelimit,
	prereq,
	progression,
	selfctrl,
	skillsel,
	spellcmp,
	spellmatch,
	stlimit,
	stdmg,
	study,
	tmcost,
	wsel,
	wswitch,
} from "@util/enum"

export function prepareSelectOptions(): void {
	const SELECT_OPTIONS: Record<string, Record<string, string>> = {
		cr_level: selfctrl.Rolls.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: selfctrl.Roll.toString(c),
			})
		}, {}),
		cr_adj: selfctrl.Adjustments.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: selfctrl.Adjustment.toString(c),
			})
		}, {}),
		study: study.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: study.Type.toString(c),
			})
		}, {}),
		study_level: study.Levels.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: study.Level.toString(c),
			})
		}, {}),
		attribute: attribute.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: attribute.Type.toString(c),
			})
		}, {}),
		progression: progression.Options.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: progression.Option.toString(c),
			})
		}, {}),
		numeric_criteria: AllNumericCompareTypes.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: LocalizeGURPS.translations.gurps.numeric_criteria.string[c],
			})
		}, {}),
		numeric_criteria_strict: ContainedQuantityNumericCompareTypes.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: LocalizeGURPS.translations.gurps.numeric_criteria.quantity[c],
			})
		}, {}),
		string_criteria: AllStringCompareTypes.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: LocalizeGURPS.translations.gurps.string_criteria.string[c],
			})
		}, {}),
		has: {
			true: LocalizeGURPS.translations.gurps.enum.has.true,
			false: LocalizeGURPS.translations.gurps.enum.has.false,
		},
		all: {
			true: LocalizeGURPS.translations.gurps.prereq.list.true,
			false: LocalizeGURPS.translations.gurps.prereq.list.false,
		},
		tmcost: tmcost.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: tmcost.Type.toString(c),
			})
		}, {}),
		emcost: emcost.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: emcost.Type.toString(c),
			})
		}, {}),
		emweight: emweight.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: emweight.Type.toString(c),
			})
		}, {}),
		wsel: wsel.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: wsel.Type.toString(c),
			})
		}, {}),
		skillsel: skillsel.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: skillsel.Type.toString(c),
			})
		}, {}),
		spellcmp: spellcmp.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: spellcmp.Type.toString(c),
			})
		}, {}),
		spellmatch: spellmatch.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: spellmatch.Type.toString(c),
			})
		}, {}),
		stlimit: stlimit.Options.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: stlimit.Option.toString(c),
			})
		}, {}),
		stdmg: stdmg.Options.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: stdmg.Option.toString(c),
			})
		}, {}),
		movelimit: movelimit.Options.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: movelimit.Option.toString(c),
			})
		}, {}),
		feature: feature.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: feature.Type.toString(c),
			})
		}, {}),
		feature_strict: feature.TypesWithoutContainedWeightReduction.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: feature.Type.toString(c),
			})
		}, {}),
		prereq: prereq.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: prereq.Type.toString(c),
			})
		}, {}),
		prereq_strict: prereq.TypesWithoutList.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: prereq.Type.toString(c),
			})
		}, {}),
		difficulty: difficulty.Levels.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: difficulty.Level.toString(c),
			})
		}, {}),
		container: container.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: container.Type.toString(c),
			})
		}, {}),
		affects: affects.Options.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: affects.Option.toString(c),
			})
		}, {}),
		percentage: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80].reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: c.toString(),
			})
		}, {}),
		maneuvers: AllManeuverIDs.reduce(
			(acc, c) => {
				return Object.assign(acc, {
					[c]: LocalizeGURPS.translations.gurps.maneuver[c],
				})
			},
			{ none: LocalizeGURPS.translations.gurps.maneuver.none }
		),
		postures: AllPostures.reduce(
			(acc, c) => {
				return Object.assign(acc, {
					[c]: LocalizeGURPS.translations.gurps.status[c],
				})
			},
			{ none: LocalizeGURPS.translations.gurps.maneuver.none }
		),
		display: display.Options.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: display.Option.toString(c),
			})
		}, {}),
		length_units: allLengthUnits.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: LocalizeGURPS.translations.gurps.length_units[c],
			})
		}, {}),
		weight_units: allWeightUnits.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: LocalizeGURPS.translations.gurps.weight_units[c],
			})
		}, {}),
		move_override: allMoveTypeOverrideConditions.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: LocalizeGURPS.translations.gurps.enum.move_override[c],
			})
		}, {}),
		wswitch: wswitch.Types.reduce((acc, c) => {
			return Object.assign(acc, {
				[c]: wswitch.Type.toString(c),
			})
		}, {}),
		wswitch_value: {
			true: LocalizeGURPS.translations.gurps.enum.wswitch_value.true,
			false: LocalizeGURPS.translations.gurps.enum.wswitch_value.false,
		},
		color: {
			auto: LocalizeGURPS.translations.gurps.enum.color.auto,
			dark: LocalizeGURPS.translations.gurps.enum.color.dark,
			light: LocalizeGURPS.translations.gurps.enum.color.light,
		},
	}
	CONFIG.GURPS.select = SELECT_OPTIONS
}