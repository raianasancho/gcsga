import { LocalizeGURPS } from "./localize"

export enum StringCompareType {
	AnyString = "none",
	IsString = "is",
	IsNotString = "is_not",
	ContainsString = "contains",
	DoesNotContainString = "does_not_contain",
	StartsWithString = "starts_with",
	DoesNotStartWithString = "does_not_start_with",
	EndsWithString = "ends_with",
	DoesNotEndWithString = "does_not_end_with",
}

export const AllStringCompareTypes: StringCompareType[] = [
	StringCompareType.AnyString,
	StringCompareType.IsString,
	StringCompareType.IsNotString,
	StringCompareType.ContainsString,
	StringCompareType.DoesNotContainString,
	StringCompareType.StartsWithString,
	StringCompareType.DoesNotStartWithString,
	StringCompareType.EndsWithString,
	StringCompareType.DoesNotEndWithString,
]

export class StringCriteria {
	compare: StringCompareType

	qualifier: string

	constructor(compare: StringCompareType, qualifier: string = "") {
		this.compare = compare
		this.qualifier = qualifier
	}

	matches(s: string): boolean {
		switch (this.compare) {
			case StringCompareType.AnyString:
				return true
			case StringCompareType.IsString:
				return equalFold(s, this.qualifier)
			case StringCompareType.IsNotString:
				return !equalFold(s, this.qualifier)
			case StringCompareType.ContainsString:
				return this.qualifier.toLowerCase().includes(s.toLowerCase())
			case StringCompareType.DoesNotContainString:
				return !this.qualifier.toLowerCase().includes(s.toLowerCase())
			case StringCompareType.StartsWithString:
				return this.qualifier.toLowerCase().startsWith(s.toLowerCase())
			case StringCompareType.DoesNotStartWithString:
				return !this.qualifier.toLowerCase().startsWith(s.toLowerCase())
			case StringCompareType.EndsWithString:
				return this.qualifier.toLowerCase().endsWith(s.toLowerCase())
			case StringCompareType.DoesNotEndWithString:
				return !this.qualifier.toLowerCase().endsWith(s.toLowerCase())
		}
	}

	matchesList(...s: string[]): boolean {
		if (s.length === 0) return this.matches("")
		let matches = 0
		for (const one of s) {
			if (this.matches(one)) matches++
		}
		switch (this.compare) {
			case StringCompareType.AnyString:
			case StringCompareType.IsString:
			case StringCompareType.ContainsString:
			case StringCompareType.StartsWithString:
			case StringCompareType.EndsWithString:
				return matches > 0
			case StringCompareType.IsNotString:
			case StringCompareType.DoesNotContainString:
			case StringCompareType.DoesNotStartWithString:
			case StringCompareType.DoesNotEndWithString:
				return matches === s.length
		}
	}

	toString(): string {
		return LocalizeGURPS.translations.gurps.string_criteria.string[this.compare]
	}

	altString(): string {
		switch (this.compare) {
			case StringCompareType.IsNotString:
			case StringCompareType.DoesNotContainString:
			case StringCompareType.DoesNotStartWithString:
			case StringCompareType.DoesNotEndWithString:
				return LocalizeGURPS.translations.gurps.string_criteria.alt_string[this.compare]
			default:
				return this.toString()
		}
	}

	describe(): string {
		const result = this.toString()
		if (this.compare === StringCompareType.AnyString) return result
		return `${result} "${this.qualifier}"`
	}
}

export function equalFold(s: string, t: string): boolean {
	if (!s && !t) return false
	return s.toLowerCase() === t.toLowerCase()
}