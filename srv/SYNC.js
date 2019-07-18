"use strict";

// const util = require('util');

// const Client = require('node-rfc').Client;
// const sapSystem = JSON.parse(process.env.WB_RFC_DEST);
// const rfcClient = new Client(sapSystem);


module.exports = async (app, srv) => {

    // // open connection
    // rfcClient.connect(function (err) {
    //         // check for login/connection errors
    //         if (err)
    //             return console.error('could not connect to server', err);
    //     }
    // );

    // //////////////////////////////////////////////////////////////////////////////
    // app.all("/r3/WERK", async (req, res) => {
    //     const {Werk} = srv.entities('wb.db');
    //     await persist(req, res, Werk, {});
    // });
};


// async function persist(req, res, Entity, params) {
//     const result = {
//         inserted: 0,
//         updated: 0,
//         deleted: 0,
//         dbcnt: 0
//     };

//     // Key & mapping info
//     const fields = [];
//     for (let key in Entity.elements) {
//         // noinspection JSUnfilteredForInLoop
//         const field = Entity.elements[key];

//         fields.push({
//             name: field.name,
//             key: field.key,
//             dbName: field["@PERS_FIELD"],
//         })
//     }

//     const tx = cds.transaction(req);
//     const dbList = await tx.run(
//         SELECT.from(Entity)
//         // TODO .where()
//     );

//     // With key for speed
//     const dbMap = {};
//     for (let i = 0; i < dbList.length; i++) {
//         const dbItem = dbList[i];
//         dbMap[createKey(fields, dbItem)] = dbItem
//     }

//     const paths = req.route.path.split('/');
//     const action = paths[paths.length - 1];

//     // const callFm = util.promisify( rfcClient.invoke);
//     rfcClient.invoke('Z_WB_READ', {
//         IV_METHOD: action,
//         IV_WHERE: '' // TODO
//     }, async function (err, sapResult) {
//         if (err)
//             return console.error('Error invoking Z_WB_READ:', err);

//         const newList = sapResult[action];
//         for (let i = 0; i < newList.length; i++) {
//             // New item from SAP
//             const r3Item = createFromSap(newList[i], fields);

//             // Old DB item
//             const sKey = createKey(fields, r3Item);
//             const dbItem = dbMap[sKey];

//             // Insert or update
//             if (!dbItem) {
//                 await tx.run(
//                     INSERT.into(Entity).entries(r3Item)
//                 );
//                 result.inserted++;
//                 continue;
//             }

//             // Update fields in DB
//             await tx.run(
//                 UPDATE(Entity).set(r3Item).where(createKey(fields, dbItem, true))
//             );
//             result.updated++;

//             // Exclude from DB list
//             delete dbMap[sKey];
//         }

//         // Delete old items
//         if (params.deleteOld)
//             for (let key in dbMap)
//                 if (dbMap.hasOwnProperty(key)) {
//                     const dbItem = dbMap[key];
//                     tx.run(DELETE.from(Entity).where(createKey(fields, dbItem, true)));
//                     result.deleted++;
//                 }

//         // Save to DB
//         await tx.commit();

//         // And return info
//         res.json(result);
//     })
// }

// function createKey(fields, dbItem, asObject) {
//     let key = asObject ? {} : "";

//     for (let i = 0; i < fields.length; i++) {
//         const field = fields[i];
//         if (!field.key)
//             continue;

//         if (asObject)
//             key[field.name] = dbItem[field.name];
//         else
//             key += ("-" + dbItem[field.name])
//     }
//     return key;
// }

// function createFromSap(item, fields) {
//     const result = {};
//     for (let i = 0; i < fields.length; i++) {
//         const field = fields[i];
//         if (field.dbName)
//             result[field.name] = item[field.dbName]
//     }

//     return result;
// }