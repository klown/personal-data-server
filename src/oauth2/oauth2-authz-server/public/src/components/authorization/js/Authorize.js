/*!
GPII OAuth2 server

Copyright 2014 OCAD University

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

You may obtain a copy of the License at
https://github.com/gpii/universal/LICENSE.txt
*/

/* global fluid, jQuery */

var gpii = gpii || {};

(function ($, fluid) {
    "use strict";

    fluid.defaults("gpii.oauth2.authorization", {
        gradeNames: ["fluid.rendererRelayComponent", "autoInit"],
        selectors: {
            user: ".gpiic-oauth2-authorization-user",
            logout: ".gpiic-oauth2-authorization-logout",
            transaction: ".gpiic-oauth2-authorization-transaction",
            description: ".gpiic-oauth2-authorization-description",
            allow: ".gpiic-oauth2-authorization-allow",
            cancel: ".gpiic-oauth2-authorization-cancel",
            directions: ".gpiic-oauth2-authorization-directions",
            selection: ".gpiic-oauth2-authorization-selection",
            selectionLabel: ".gpiic-oauth2-authorization-selectionLabel",
            selectionValue: ".gpiic-oauth2-authorization-selectionValue"
        },
        selectorsToIgnore: ["selection", "selectionValue"],
        strings: {
            description: "In order to personalise your experience, <strong>%service</strong> would like to access some of your Cloud for All preferences.",
            allow: "allow",
            cancel: "do not allow",
            directions: "To edit your privacy settings at any time, go to your Account settings in the Preference Management Tool",
            logout: "Log Out",
            selectionLabel: "Select the preferences you wish to share:"
        },
        model: {
            user: "",
            service: "",
            transactionID: ""
        },
        protoTree: {
            user: "${{that}.model.user}",
            logout: {messagekey: "logout"},
            transaction: "${{that}.model.transactionID}",
            description: {
                markup: {
                    messagekey: "description",
                    args: {service: "{that}.model.service"}
                }
            },
            allow: {messagekey: "allow"},
            cancel: {messagekey: "cancel"},
            directions: {messagekey: "directions"},
            selectionLabel: {messagekey: "selectionLabel"}
        },
        renderOnInit: true,
        components: {
            selectionTree: {
                type: "gpii.oauth2.preferencesSelectionTree",
                container: "{that}.dom.selection",
                createOnEvent: "afterRender",
                options: {
                    requestedPrefs: {
                        "increase-size": true,
                        "increase-size.appearance": true,
                        "increase-size.appearance.text-size": true,
                        "increase-size.appearance.inputs-larger": true,
                        "increase-size.appearance.line-spacing": true,
                        "simplify": true,
                        "simplify.table-of-contents": true,
                        "visual-styling": true,
                        "visual-styling.change-contrast": true,
                        "visual-styling.emphasize-links": true,
                        "visual-styling.text-style": true
                    },
                    model: {
                        expander: {
                            funcName: "gpii.oauth2.selectionTree.toModel",
                            args: [{}, "{that}.options.requestedPrefs"]
                        }
                    },
                    modelListeners: {
                        "": {
                            listener: "gpii.oauth2.authorization.setSelection",
                            args: ["{authorization}.dom.selectionValue", {
                                expander: {
                                    func: "{that}.toServerModel"
                                }
                            }]
                        }
                    }
                }
            }
        }
    });

    gpii.oauth2.authorization.setSelection = function (input, selectionModel) {
        input.val(JSON.stringify(selectionModel));
    };
})(jQuery, fluid);
