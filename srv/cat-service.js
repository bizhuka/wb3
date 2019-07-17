"use strict";

module.exports = function (srv) {

	srv.on('CREATE', 'Books', req => {
		console.log('CREATE')
		// req.data.tenantID = req._.req.authInfo.identityZone;
	});

    srv.on('DELETE', 'Books', req => {
		console.log('DELETE')
		// req.query.DELETE.where.push("and", {
		// 	"ref": ["tenantID"]
		// }, "=", {
		// 	"val": req._.req.authInfo.identityZone
		// });
	});

    srv.on('UPDATE', 'Books', req => {
		console.log('UPDATE')
		// req.data.tenantID = req._.req.authInfo.identityZone;
		// req.query.UPDATE.where.push("and", {
		// 	"ref": ["tenantID"]
		// }, "=", {
		// 	"val": req._.req.authInfo.identityZone
		// });
	});

    srv.on('READ', 'Books', req => {
		console.log('READ')
		// if (!req.query.SELECT.where) {
		// 	req.query.SELECT.where = [{
		// 		"ref": ["tenantID"]
		// 	}, "=", {
		// 		"val": req._.req.authInfo.identityZone
		// 	}];
		// } else {
		// 	req.query.SELECT.where.push("and", {
		// 		"ref": ["tenantID"]
		// 	}, "=", {
		// 		"val": req._.req.authInfo.identityZone
		// 	});
		// }
	});
	
    // DB - updates
    require('./DB')(srv);

    // Update from CSV
    require('./CSV')(global.__express, srv);
};