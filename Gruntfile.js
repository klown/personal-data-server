/*
    Copyright 2020 OCAD University.

    Licensed under the BSD-3-Clause license.
*/

/* eslint-env node */
"use strict";
module.exports = function (grunt) {
    grunt.initConfig({
        lintAll: {
            sources: {
                md:    ["./*.md", "./doc/*.md", "./src/**/*.md"],
                js:    ["./src/**/*.js", "./tests/**/*.js", "./*.js"],
                json:  ["./src/**/*.json", "./tests/**/*.json", "./*.json"],
                json5: ["./src/**/*.json5", "./tests/**/*.json5", "./*.json5"]
            }
        }
    });
    grunt.loadNpmTasks("fluid-grunt-lint-all");
    grunt.registerTask("lint", "Perform all standard lint checks.", ["lint-all"]);

    grunt.registerTask("default", ["lint"]);
};
