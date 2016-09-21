/*!
Copyright 2016 OCAD university

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

You may obtain a copy of the License at
https://github.com/GPII/universal/blob/master/LICENSE.txt
*/

/* eslint-env browser */
/* eslint strict: ["error", "function"] */

var fluid = fluid || require("infusion"),
    gpii = fluid.registerNamespace("gpii");;

(function () {

    "use strict";

    fluid.defaults("gpii.tests.oauth2.pouchBackedTestEnvironment", {
        gradeNames: ["fluid.test.testEnvironment"],
        dbViewsLocation: null,   // provided by integrators
        pouchData: [],   // provided by integrators
        dbName: "auth",    // Configurable by integrators
        components: {
            dataLoader: {
                type: "fluid.component",
                createOnEvent: "constructFixtures",
                options: {
                    resources: {
                        dbViews: {
                            href: "{pouchBackedTestEnvironment}.options.dbViewsLocation",
                            options: {
                                dataType: "json"
                            }
                        }
                    },
                    events: {
                        onDbViewsLoaded: "{pouchBackedTestEnvironment}.events.onDbViewsLoaded"
                    },
                    listeners: {
                        "onCreate.fetchDbViews": {
                            listener: "gpii.tests.oauth2.pouchBackedTestEnvironment.fetchDbViews",
                            args: ["{that}"]
                        }
                    }
                }
            },
            pouchDb: {
                type: "gpii.pouch",
                createOnEvent: "constructFixtures",
                options: {
                    dbOptions: {
                        name: "{pouchBackedTestEnvironment}.options.dbName"
                    },
                    data: "{pouchBackedTestEnvironment}.options.pouchData",
                    listeners: {
                        "onCreate.populateData": {
                            listener: "{that}.bulkDocs",
                            args: ["{that}.options.data"]
                        },
                        "onBulkDocsComplete.escalate": "{pouchBackedTestEnvironment}.events.onPouchReady"
                    }
                }
            }
        },
        mergePolicy: {
            rawModules: "noexpand"
        },
        distributeOptions: {
            "pouchDBReadGrade": {
                record: "gpii.dataSource.pouchDB",
                target: "{that gpii.oauth2.dbDataSource}.options.gradeNames"
            },
            "pouchDBWriteGrade": {
                record: "gpii.dataSource.pouchDB.writable",
                target: "{that gpii.oauth2.dbDataSource.writable}.options.gradeNames"
            },
            "rawModules": {
                source: "{that}.options.rawModules",
                target: "{that > testCaseHolder}.options.rawModules"
            }
        },
        events: {
            constructFixtures: null,
            onDbViewsLoaded: null,
            onPouchReady: null,
            onFixturesConstructed: {
                events: {
                    onDbViewsLoaded: "onDbViewsLoaded",
                    onPouchReady: "onPouchReady"
                },
                args: ["{dataLoader}.dbViews"]
            }
        }
    });

    gpii.tests.oauth2.pouchBackedTestEnvironment.fetchDbViews = function (that) {
        fluid.fetchResources(that.options.resources, function (resourceSpecs) {
            that.dbViews = resourceSpecs.dbViews.resourceText;
            that.events.onDbViewsLoaded.fire(resourceSpecs.dbViews.resourceText);
        });
    };

    // Use in conjuction with "gpii.tests.oauth2.pouchBackedTestEnvironment" to perform in-browser testing for components
    // where gpii.oauth2.dbDataStore is required. How to use:
    // 1. Add "gpii.tests.oauth2.dbDataStore.base" as a base component on the test component
    // 2. Create the test component on event "onFixturesConstructed";
    // 3. Define the "dbViews" option with the argument fired by "onFixturesConstructed" event.
    fluid.defaults("gpii.tests.oauth2.dbDataStore.base", {
        gradeNames: ["fluid.component"],
        dbViews: {},   // supplied by integrators
        distributeOptions: {
            "dbViews": {
                record: "{that}.options.dbViews",
                target: "{that gpii.oauth2.dbDataSource}.options.dbViews"
            }
        }
    });

    // The base grade for the test case holder that starts tests when the testing fixtures are ready
    // and also destroy the pouchDB after each test sequence so the next test sequence can start with
    // a fresh data set.
    fluid.defaults("gpii.tests.oauth2.baseTestCaseHolder", {
        gradeNames: ["gpii.test.express.caseHolder.base"],
        sequenceStart: [{
            func: "{pouchBackedTestEnvironment}.events.constructFixtures.fire"
        }, {
            event: "{pouchBackedTestEnvironment}.events.onFixturesConstructed",
            listener: "fluid.log",
            args: ["Db views are loaded and pouchDB is ready"]
        }],
        sequenceEnd: [{
            func: "{pouchBackedTestEnvironment}.pouchDb.destroyPouch"
        }, {
            event:    "{pouchBackedTestEnvironment}.pouchDb.events.onDestroyPouchComplete",
            listener: "fluid.log",
            args:     ["PouchDB cleanup complete"]
        }],
        events: {
            onResponse: null,
            onError: null
        }
    });

})();
