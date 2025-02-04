/* eslint-disable jest/no-disabled-tests */
import { OtFLinkedAction, OtFTestAction, OtFCostsAction, parselink } from "@module/otf"

describe("too small or non-matching", () => {
	it("empty", () => {
		let s = ""
		let parsed_otf = parselink(s)
		expect(parsed_otf.action).toBeUndefined()
		expect(parsed_otf.text).toBe(s)
	})
	it("size 1", () => {
		let s = "X"
		let parsed_otf = parselink(s)
		expect(parsed_otf.action).toBeUndefined()
		expect(parsed_otf.text).toBe(s)
	})
	it("non-matching", () => {
		let s = "this should not match anything"
		let parsed_otf = parselink(s)
		expect(parsed_otf.action).toBeUndefined()
		expect(parsed_otf.text).toBe(s)
	})
})
describe("modifiers", () => {
	it("+1", () => {
		let s = "+1"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("modifier")
		expect(action.num).toBe(1)
	})
	it("-1", () => {
		let s = "-1"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("modifier")
		expect(action.num).toBe(-1)
	})
	it("+1 desc", () => {
		let s = "+1 desc"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("modifier")
		expect(action.num).toBe(1)
		expect(action.desc).toBe("desc")
	})
	it("-1 desc", () => {
		let s = "-1 desc"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("modifier")
		expect(action.num).toBe(-1)
		expect(action.desc).toBe("desc")
	})
	it("+1 desc & -2 desc2", () => {
		let s = "+1 desc & -2 desc2"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("modifier")
		expect(action.num).toBe(1)
		expect(action.desc).toBe("desc")
		action = <OtFCostsAction>action.next
		expect(action.type).toBe("modifier")
		expect(action.num).toBe(-2)
		expect(action.desc).toBe("desc2")
	})
	it("-@margin desc", () => {
		let s = "-@margin desc"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("modifier")
		expect(action.num).toBeUndefined()
		expect(action.margin).toBe("-@margin")
		expect(action.desc).toBe(s)
	})
})
describe("chat", () => {
	it("/cmd", () => {
		let s = "/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("chat")
		expect(action.orig).toBe(s)
		expect(parsed_otf.text).toMatch(new RegExp(`<span[^>]+>${s}</span>`))
	})
	it("!/cmd", () => {
		let s = "!/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action).toBeDefined()
		expect(action.type).toBe("chat")
		expect(action.orig).toBe("/cmd")
		// Expect(action.blindroll).toBeDefined()
		expect(parsed_otf.text).toMatch(/<span[^>]+>\/cmd<\/span>/)
	})
	it("'override'/cmd", () => {
		let s = "'override'/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("chat")
		expect(action.orig).toBe("/cmd")
		expect(parsed_otf.text).toMatch(/override/)
	})
	it('"override"/cmd', () => {
		let s = "'override'/cmd"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("chat")
		expect(action.orig).toBe("/cmd")
		expect(parsed_otf.text).toMatch(/override/)
	})
})
describe("html", () => {
	it("http:///someplace", () => {
		let s = "http:///someplace"
		let parsed_otf = parselink(s)
		let action = <OtFLinkedAction>parsed_otf.action
		expect(action.type).toBe("href")
		expect(action.orig).toBe(s)
		expect(parsed_otf.text).toMatch(new RegExp(`<a href="${s}">${s}</a>`))
	})
	it("https:///someplace", () => {
		let s = "https:///someplace"
		let parsed_otf = parselink(s)
		let action = <OtFLinkedAction>parsed_otf.action
		expect(action.type).toBe("href")
		expect(action.orig).toBe(s)
		// expect(action.blindroll).toBeTruthy()
		expect(parsed_otf.text).toMatch(new RegExp(`<a href="${s}">${s}</a>`))
	})
	it("'override'http:///someplace", () => {
		let s = "'override'http:///someplace"
		let parsed_otf = parselink(s)
		let action = <OtFCostsAction>parsed_otf.action
		expect(action.type).toBe("href")
		expect(action.orig).toBe("http:///someplace")
		expect(parsed_otf.text).toMatch(/<a href="http:\/\/\/someplace">override<\/a>/)
	})
})
describe("[@margin] [@isCritSuccess] [@IsCritFailure]", () => {
	it("[@margin]", () => {
		let s = "@margin"
		let parsed_otf = parselink(s)
		let action = <OtFTestAction>parsed_otf.action
		expect(action.type).toBe("test-if")
		expect(action.orig).toBe(s)
		expect(action.desc).toBe(s.substring(1))
		expect(action.formula).toBeUndefined()
	})
	it("[@isCritSuccess]", () => {
		let s = "@isCritSuccess"
		let parsed_otf = parselink(s)
		let action = <OtFTestAction>parsed_otf.action
		expect(action.type).toBe("test-if")
		expect(action.orig).toBe(s)
		expect(action.desc).toBe(s.substring(1))
		expect(action.formula).toBeUndefined()
	})
	it("[@IsCritFailure]", () => {
		let s = "@IsCritFailure"
		let parsed_otf = parselink(s)
		let action = <OtFTestAction>parsed_otf.action
		expect(action.type).toBe("test-if")
		expect(action.orig).toBe(s)
		expect(action.desc).toBe(s.substring(1))
		expect(action.formula).toBeUndefined()
	})
	it("[@margin > 1]", () => {
		let s = "@margin > 1"
		let parsed_otf = parselink(s)
		let action = <OtFTestAction>parsed_otf.action
		expect(action.type).toBe("test-if")
		expect(action.orig).toBe(s)
		expect(action.desc).toBe("margin")
		expect(action.formula).toBe("> 1")
	})
	it("[@margin = 99]", () => {
		let s = "@margin = 99"
		let parsed_otf = parselink(s)
		let action = <OtFTestAction>parsed_otf.action
		expect(action.type).toBe("test-if")
		expect(action.orig).toBe(s)
		expect(action.desc).toBe("margin")
		expect(action.formula).toBe("= 99")
	})
})
