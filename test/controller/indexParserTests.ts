// test/IndexParser.test.ts
import { expect } from "chai";
import { parseIndexHtml, BuildingData } from "../../src/controller/IndexParserUtils";
import { parseCampusZip } from "../../src/controller/IndexParser";
import * as path from "path";
import * as fs from "fs/promises";

describe("IndexParserUtils Tests", () => {
	it("should extract building data from sample index.htm content", () => {
		const sampleHTML = `
      <html>
        <body>
          <table>
            <tbody>
              <tr>
                <td class="views-field views-field-title">
                  <a href="./campus/discover/buildings-and-classrooms/ACU.htm" title="Building Details and Map">ACU</a>
                </td>
                <td class="views-field views-field-field-building-address">
                  2211 Wesbrook Mall
                </td>
              </tr>
              <tr>
                <td class="views-field views-field-title">
                  <a href="./campus/discover/buildings-and-classrooms/ALRD.htm" title="Building Details and Map">ALRD</a>
                </td>
                <td class="views-field views-field-field-building-address">
                  1822 East Mall
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
		const buildings: BuildingData[] = parseIndexHtml(sampleHTML);
		expect(buildings).to.be.an("array").with.lengthOf(2);

		// Check first building
		expect(buildings[0].shortname).to.equal("ACU");
		expect(buildings[0].address).to.equal("2211 Wesbrook Mall");
		expect(buildings[0].href).to.equal("./campus/discover/buildings-and-classrooms/ACU.htm");

		// Check second building
		expect(buildings[1].shortname).to.equal("ALRD");
		expect(buildings[1].address).to.equal("1822 East Mall");
		expect(buildings[1].href).to.equal("./campus/discover/buildings-and-classrooms/ALRD.htm");
	});
});

describe("IndexParser Integration Test with campus.zip", () => {
	it("should extract building data from campus.zip", async () => {
		// Adjust the path to where you stored your campus.zip under resources/archives
		const zipPath = path.join(__dirname, "..", "resources", "archives", "campus.zip");
		// Check that the file exists
		await fs.access(zipPath);
		const buildings: BuildingData[] = await parseCampusZip(zipPath);
		// We expect the campus zip to have at least one building entry.
		expect(buildings).to.be.an("array").that.is.not.empty;

		// Optionally, log the first building for manual inspection:
		console.log("First building parsed from campus.zip:", buildings[0]);

		// Check that each building has non-empty shortname, address, and href.
		buildings.forEach(building => {
			expect(building.shortname).to.be.a("string").that.is.not.empty;
			expect(building.address).to.be.a("string").that.is.not.empty;
			expect(building.href).to.be.a("string").that.is.not.empty;
		});
	});
});
