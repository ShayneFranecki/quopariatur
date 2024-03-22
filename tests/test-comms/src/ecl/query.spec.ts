import { expect } from "chai";

import { Query } from "@hpcc-js/comms";
import { isTravis } from "@hpcc-js/util";
import { QUERY_URL } from "../testLib";

describe("test/esp/ecl/query", function () {
    if (!isTravis) {
        it("basic", async function () {
            const query: Query = await Query.attach({ baseUrl: QUERY_URL }, "roxie", "peopleaccounts.4").refresh();
            const resultNames = await query.resultNames();
            expect(resultNames.length).to.be.greaterThan(0);
            for (const resultName of resultNames) {
                const fields = await query.resultFields(resultName);
                expect(fields).has.length;
                expect(fields.length).to.be.greaterThan(0);
            }
        });
        it("requestSchema", async function () {
            const query = await Query.attach({ baseUrl: QUERY_URL }, "roxie", "peopleaccounts.4").refresh();
            const fields = query.requestFields();
            expect(fields.length).to.be.greaterThan(0);
        });
    }
});
