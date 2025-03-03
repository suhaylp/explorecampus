// test/BuildingParser.test.ts
import { expect } from "chai";
import { parseBuildingHtml, RoomData } from "../../src/controller/BuildingParserUtils";

describe("BuildingParserUtils Tests", () => {
	it("should extract room data from sample building HTML with valid classes", () => {
		const sampleBuildingHtml = `
      <html>
        <body>
          <h1>Biological Sciences</h1>
          <p>6270 University Boulevard</p>
          <table>
            <tr>
              <th>Room</th>
              <th>Capacity</th>
              <th>Furniture type</th>
              <th>Room type</th>
              <th>More info</th>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">1503</td>
              <td class="views-field views-field-field-room-capacity">16</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Movable Tables & Chairs</td>
              <td class="views-field views-field-field-room-type">Small Group</td>
              <td class="views-field views-field-title"><a href="./BIOL1503.htm">More info</a></td>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">2000</td>
              <td class="views-field views-field-field-room-capacity">228</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Fixed Tablets</td>
              <td class="views-field views-field-field-room-type">Tiered Large Group</td>
              <td class="views-field views-field-title"><a href="./BIOL2000.htm">More info</a></td>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">2200</td>
              <td class="views-field views-field-field-room-capacity">76</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Fixed Tables/Movable Chairs</td>
              <td class="views-field views-field-field-room-type">Tiered Large Group</td>
              <td class="views-field views-field-title"><a href="./BIOL2200.htm">More info</a></td>
            </tr>
            <tr>
              <td class="views-field views-field-field-room-number">2519</td>
              <td class="views-field views-field-field-room-capacity">16</td>
              <td class="views-field views-field-field-room-furniture">Classroom-Movable Tables & Chairs</td>
              <td class="views-field views-field-field-room-type">Small Group</td>
              <td class="views-field views-field-title"><a href="./BIOL2519.htm">More info</a></td>
            </tr>
          </table>
        </body>
      </html>
    `;

		const buildingInfo = {
			shortname: "BIOL",
			address: "6270 University Boulevard",
			lat: 49.26125,
			lon: -123.24807,
			fullname: "Biological Sciences"
		};

		const rooms = parseBuildingHtml(sampleBuildingHtml, buildingInfo);
		expect(rooms).to.be.an("array").with.lengthOf(4);

		// Verify the first room's details
		const room1 = rooms[0];
		expect(room1.rooms_number).to.equal("1503");
		expect(room1.rooms_seats).to.equal(16);
		expect(room1.rooms_furniture).to.equal("Classroom-Movable Tables & Chairs");
		expect(room1.rooms_type).to.equal("Small Group");
		expect(room1.rooms_href).to.equal("./BIOL1503.htm");
		expect(room1.rooms_name).to.equal("BIOL_1503");
		expect(room1.rooms_fullname).to.equal("Biological Sciences");
	});
});
