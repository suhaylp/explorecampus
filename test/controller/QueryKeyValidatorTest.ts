// test/controller/QueryKeyValidator.test.ts
import { expect } from "chai";
import { validateSField, validateMField, validateSKey, validateMKey } from "../../src/controller/queryperformers/validationhelpers/QueryKeyValidator";

describe("QueryKeyValidator - Rooms", () => {
	it("should accept valid rooms SFields", () => {
		expect(() => validateSField("fullname", "rooms")).to.not.throw();
		expect(() => validateSField("shortname", "rooms")).to.not.throw();
		expect(() => validateSField("number", "rooms")).to.not.throw();
		expect(() => validateSField("name", "rooms")).to.not.throw();
		expect(() => validateSField("address", "rooms")).to.not.throw();
		expect(() => validateSField("type", "rooms")).to.not.throw();
		expect(() => validateSField("furniture", "rooms")).to.not.throw();
		expect(() => validateSField("href", "rooms")).to.not.throw();
	});

	it("should reject invalid rooms SFields", () => {
		expect(() => validateSField("dept", "rooms")).to.throw();
		expect(() => validateSField("id", "rooms")).to.throw();
	});

	it("should accept valid rooms MFields", () => {
		expect(() => validateMField("lat", "rooms")).to.not.throw();
		expect(() => validateMField("lon", "rooms")).to.not.throw();
		expect(() => validateMField("seats", "rooms")).to.not.throw();
	});

	it("should reject invalid rooms MFields", () => {
		expect(() => validateMField("avg", "rooms")).to.throw();
	});
});

describe("QueryKeyValidator - Inferred Dataset Kind", () => {
	it("should infer 'rooms' for keys with id 'rooms'", () => {
		// For example, "rooms_fullname" should be valid.
		expect(() => validateSKey("rooms_fullname")).to.not.throw();
		expect(() => validateMKey("rooms_seats")).to.not.throw();
	});

	it("should infer 'sections' for keys with any other id", () => {
		// For example, "sections_dept" should be valid (using existing allowed sections keys).
		expect(() => validateSKey("sections_dept")).to.not.throw();
		expect(() => validateMKey("sections_avg")).to.not.throw();
	});

	it("should reject keys with invalid fields based on inferred dataset kind", () => {
		// "sections_fullname" should be invalid because 'fullname' is not an allowed sections field.
		expect(() => validateSKey("sections_fullname")).to.throw();
		// "rooms_avg" should be invalid because 'avg' is not an allowed rooms field.
		expect(() => validateMKey("rooms_avg")).to.throw();
	});
});
