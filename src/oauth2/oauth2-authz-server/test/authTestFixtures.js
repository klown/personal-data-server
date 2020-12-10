/*

    Test fixtures common to the auth tests.

 */
"use strict";
var fluid = require("infusion");

fluid.registerNamespace("fluid.tests.oauth2");


fluid.defaults("fluid.tests.oauth2.caseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    events: {
        createService: null
    }
});

fluid.defaults("fluid.tests.oauth2.createService", {
    gradeNames: ["fluid.test.sequenceElement"],
    sequence: [{
        func: "{caseHolder}.events.createService.fire"
    }]
});

fluid.defaults("fluid.tests.oauth2.sequenceGrade", {
    gradeNames: ["fluid.test.sequence"],
    sequenceElements: {
        startCouch: {
            gradeNames: "fluid.tests.startCouchSequence",
            priority: "before:sequence"
        },
        createPreferencesService: {
            gradeNames: "fluid.tests.oauth2.createService",
            priority: "after:startCouch"
        },
        stopCouch: {
            gradeNames: "fluid.tests.stopCouchSequence",
            priority: "after:sequence"
        }
    }
});


// We use the same base grade as the main harness, but avoid merging with that to avoid picking up the wrong test data.
fluid.defaults("fluid.tests.oauth2.baseEnvironment", {
    gradeNames: ["fluid.tests.couchdb.environment.base"],
    components: {
        caseHolder: {
            type: "fluid.tests.oauth2.caseHolder"
        }
    }
});
