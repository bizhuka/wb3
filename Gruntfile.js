module.exports = function (grunt) {
    "use strict";
    // grunt.loadNpmTasks("@sap/grunt-sapui5-bestpractice-build");
    // grunt.config.merge({
    // 	compatVersion: "edge"
    // });
    // grunt.registerTask("default", [
    // 	// "lint"
    // ]);

    grunt.initConfig({
        "openui5_preload": {
            "AnchorNavigation": {
                options: {
                    resources: {
                        cwd: 'srv/web',
                        prefix: 'com/modekzWaybill',
                        src: [
                            '**/*.js',
                            '**/*.fragment.json',
                            '**/*.fragment.xml',
                            '**/*.view.xml',
                            '**/*.properties'
                        ]
                    },
                    dest: "srv/web"
                },
                components: '**'
            }
        }
    });
    grunt.loadNpmTasks('grunt-openui5');
    grunt.registerTask('default', ['openui5_preload']);
};