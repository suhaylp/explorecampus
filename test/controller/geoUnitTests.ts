import { expect } from "chai";
import { fetchGeolocation } from "../../src/controller/GeoHelper"; // Adjust the path as necessary

describe("GeoHelper Unit Tests", () => {
	it("should return valid lat and lon for a known valid address", async () => {
		const validAddress = "6245 Agronomy Road V6T 1Z4"; // Example valid address from the dataset
		try {
			const { lat, lon } = await fetchGeolocation(validAddress);
			expect(lat).to.be.a("number");
			expect(lon).to.be.a("number");
		} catch (error) {
			expect.fail(`Expected valid geolocation, but got error: ${(error as Error).message}`);
		}
	});

	it("should reject for an invalid address", async () => {
		const invalidAddress = "Invalid Address 123";
		try {
			await fetchGeolocation(invalidAddress);
			expect.fail("Expected fetchGeolocation to reject for an invalid address");
		} catch (error) {
			expect(error).to.be.instanceOf(Error);
			expect((error as Error).message).to.be.a("string");
			// Optionally, you can check that the error message contains specific text
		}
	});
});
