/*!
Copyright 2016 OCAD university

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

You may obtain a copy of the License at
https://github.com/GPII/universal/blob/master/LICENSE.txt
*/

/* global fluid */

"use strict";

(function () {

    var gpii = fluid.registerNamespace("gpii");

    var pouchData = [{
        "_id": "client1",
        "type": "gpiiAppInstallationClient",
        "name": "Test Computer",
        "oauth2ClientId": "testOauth2ClientId",
        "oauth2ClientSecret": "testOauth2ClientSecret"
    }];

    var dbViews = [{
        "_id": "_design/views",
        "views": {
            "findClientByOauth2ClientId": {
                "map": "function(doc) {emit(doc.oauth2ClientId, doc)}"
            }
        }
    }];

    fluid.defaults("gpii.tests.dataSourcePouchDB.testEnvironment", {
        gradeNames: ["gpii.tests.inBrowserPouchDB.testEnvironment"],
        pouchData: pouchData,
        dataSourceOptions: {
            dbViews: dbViews
        },
        dbName: "testDb",
        components: {
            dataSource: {
                type: "gpii.dataSource.pouchDB",
                createOnEvent: "onFixturesConstructed"
            },
            caseHolder: {
                type: "gpii.tests.inBrowserPouchDB.baseTestCaseHolder"
            }
        },
        distributeOptions: {
            "dataSourceOptions": {
                source: "{that}.options.dataSourceOptions",
                target: "{that > dataSource}.options"
            }
        }
    });

    // All expected results
    gpii.tests.dataSourcePouchDB.expected = {
        client1: {
            "type": "gpiiAppInstallationClient",
            "name": "Test Computer",
            "oauth2ClientId": "testOauth2ClientId",
            "oauth2ClientSecret": "testOauth2ClientSecret"
        },
        missingError: {
            error: true,
            message: "missing",
            name: "not_found",
            status: 404
        },
        newRecord: {
            "type": "new",
            "data": {
                "new": "random"
            }
        },
        setResponse: {
            "ok": true,
            "id": "newRecord"
        }
    };

    fluid.defaults("gpii.tests.dataSourcePouchDB.getByExisingId", {
        gradeNames: ["gpii.tests.dataSourcePouchDB.testEnvironment"],
        dataSourceOptions: {
            requestUrl: "/client1"
        },
        rawModules: [{
            name: "Query PouchDB by an existing document id",
            tests: [{
                name: "Querying by an existing document id returns the expected record",
                sequence: [{
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.get", [], "{that}"]
                }, {
                    listener: "jqUnit.assertLeftHand",
                    args: ["The expected record should be received", gpii.tests.dataSourcePouchDB.expected.client1, "{arguments}.0"],
                    event: "{that}.events.onResponse"
                }]
            }]
        }]
    });

    fluid.defaults("gpii.tests.dataSourcePouchDB.getByExisingIdWithModel", {
        gradeNames: ["gpii.tests.dataSourcePouchDB.testEnvironment"],
        dataSourceOptions: {
            requestUrl: "/%id",
            termMap: {
                id: "%id"
            }
        },
        rawModules: [{
            name: "Query PouchDB by an existing document id using term map and direct model",
            tests: [{
                name: "Querying by an existing document id using term map and direct model returns the expected record",
                sequence: [{
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.get", [{id: "client1"}], "{that}"]
                }, {
                    listener: "jqUnit.assertLeftHand",
                    args: ["The expected record should be received", gpii.tests.dataSourcePouchDB.expected.client1, "{arguments}.0"],
                    event: "{that}.events.onResponse"
                }]
            }]
        }]
    });

    fluid.defaults("gpii.tests.dataSourcePouchDB.getByNonexistentId", {
        gradeNames: ["gpii.tests.dataSourcePouchDB.testEnvironment"],
        dataSourceOptions: {
            requestUrl: "/%id",
            termMap: {
                id: "%id"
            }
        },
        rawModules: [{
            name: "Query PouchDB by an non-existent id",
            tests: [{
                name: "Querying by an non-existent id returns 404",
                sequence: [{
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.get", [{id: "nonexistent-id"}], "{that}"]
                }, {
                    listener: "jqUnit.assertLeftHand",
                    args: ["404 error should be received", gpii.tests.dataSourcePouchDB.expected.missingError, "{arguments}.0"],
                    event: "{that}.events.onError"
                }]
            }]
        }]
    });

    fluid.defaults("gpii.tests.dataSourcePouchDB.getByNonexistentId-notFoundIsEmpty", {
        gradeNames: ["gpii.tests.dataSourcePouchDB.testEnvironment"],
        dataSourceOptions: {
            requestUrl: "/%id",
            termMap: {
                id: "%id"
            },
            notFoundIsEmpty: true
        },
        rawModules: [{
            name: "Query PouchDB by an non-existent id with \"notFoundIsEmpty\" option being set to true",
            tests: [{
                name: "Querying by an non-existent id with \"notFoundIsEmpty\" being true returns undefined",
                sequence: [{
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.get", [{id: "nonexistent-id"}], "{that}"]
                }, {
                    listener: "jqUnit.assertUndefined",
                    args: ["undefined should be received", "{arguments}.0"],
                    event: "{that}.events.onResponse"
                }]
            }]
        }]
    });

    fluid.defaults("gpii.tests.dataSourcePouchDB.getByView", {
        gradeNames: ["gpii.tests.dataSourcePouchDB.testEnvironment"],
        dataSourceOptions: {
            requestUrl: "/_design/views/_view/findClientByOauth2ClientId?key=\"%oauth2ClientId\"",
            termMap: {
                oauth2ClientId: "%oauth2ClientId"
            }
        },
        rawModules: [{
            name: "Query PouchDB by a view",
            tests: [{
                name: "Querying by a view returns expected record",
                sequence: [{
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.get", [{oauth2ClientId: "testOauth2ClientId"}], "{that}"]
                }, {
                    listener: "jqUnit.assertLeftHand",
                    args: ["The expected record should be received", gpii.tests.dataSourcePouchDB.expected.client1, "{arguments}.0.rows.0.value"],
                    event: "{that}.events.onResponse"
                }]
            }]
        }]
    });

    fluid.defaults("gpii.tests.dataSourcePouchDB.getByViewWithUnmatchedRec", {
        gradeNames: ["gpii.tests.dataSourcePouchDB.testEnvironment"],
        dataSourceOptions: {
            requestUrl: "/_design/views/_view/findClientByOauth2ClientId?key=\"%oauth2ClientId\"",
            termMap: {
                oauth2ClientId: "%oauth2ClientId"
            }
        },
        rawModules: [{
            name: "Query PouchDB by a view",
            tests: [{
                name: "Querying by a view returns an empty \"rows\" array",
                sequence: [{
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.get", [{oauth2ClientId: "nonexistent-client"}], "{that}"]
                }, {
                    listener: "jqUnit.assertDeepEq",
                    args: ["An empty \"rows\" array should be received", [], "{arguments}.0.rows"],
                    event: "{that}.events.onResponse"
                }]
            }]
        }]
    });

    fluid.defaults("gpii.tests.dataSourcePouchDB.set", {
        gradeNames: ["gpii.tests.dataSourcePouchDB.testEnvironment"],
        dataSourceOptions: {
            requestUrl: "/%id",
            termMap: {
                id: "%id"
            }
        },
        distributeOptions: {
            "distributeWritable": {
                record: true,
                target: "{that > dataSource}.options.writable"
            }
        },
        rawModules: [{
            name: "Save into PouchDB by a document id",
            tests: [{
                name: "Saving by a document id",
                sequence: [{
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.set", [{id: "newRecord"}, gpii.tests.dataSourcePouchDB.expected.newRecord], "{that}"]
                }, {
                    listener: "jqUnit.assertLeftHand",
                    args: ["A success response should be received", gpii.tests.dataSourcePouchDB.expected.setResponse, "{arguments}.0"],
                    event: "{that}.events.onResponse"
                }, {
                    func: "gpii.tests.oauth2.invokePromiseProducer",
                    args: ["{dataSource}.get", [{id: "newRecord"}], "{that}"]
                }, {
                    listener: "jqUnit.assertLeftHand",
                    args: ["A success response should be received", gpii.tests.dataSourcePouchDB.expected.newRecord, "{arguments}.0"],
                    event: "{that}.events.onResponse"
                }]
            }]
        }]
    });

    fluid.test.runTests([
        "gpii.tests.dataSourcePouchDB.getByExisingId",
        "gpii.tests.dataSourcePouchDB.getByExisingIdWithModel",
        "gpii.tests.dataSourcePouchDB.getByNonexistentId",
        "gpii.tests.dataSourcePouchDB.getByNonexistentId-notFoundIsEmpty",
        "gpii.tests.dataSourcePouchDB.getByView",
        "gpii.tests.dataSourcePouchDB.getByViewWithUnmatchedRec",
        "gpii.tests.dataSourcePouchDB.set"
    ]);
})();
