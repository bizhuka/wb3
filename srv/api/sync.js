"use strict";

const Db = require('../util/Db');
const Time = require('../util/Time');

const util = require('util');

let rfcClient = null;
try {
    const Client = require('node-rfc').Client;
    const sapSystem = JSON.parse(process.env.WB_RFC_DEST);
    rfcClient = new Client(sapSystem);
} catch (e) {
    console.error(e);
}


async function persist(req, res, Entity, params) {

    const result = {
        inserted: 0,
        updated: 0,
        deleted: 0,
        dbcnt: 0
    };

    //////////////////////////////
    // №1 R3
    //////////////////////////////

    // Default implementation
    if (!params.FM) {
        params.FM = 'Z_WB_READ';

        const paths = req.route.path.split('/');

        params.RFC_PARAMS = {
            IV_METHOD: paths[paths.length - 1],
            IV_WHERE: (params.R3_WHERE ? params.R3_WHERE : '')
        };
    }
    //TODO open connection & call RFC fm
    if (!rfcClient)
        return
    await rfcClient.open(); // if (err) return console.error('could not connect to server', err);
    const sapResult = await rfcClient.call(params.FM, params.RFC_PARAMS);

    // Get from R3
    if (params.FM === 'Z_WB_READ')
        params.newList = itemsTransform(Entity, sapResult[params.RFC_PARAMS.IV_METHOD], false);

    if (params.afterCall)
        params.afterCall(result, sapResult);

    //////////////////////////////
    // №2 DB
    //////////////////////////////
    const tx = cds.transaction(req);

    // console.log(Entity)
    const query = 'SELECT * FROM ' + Entity["@cds.persistence.name"] +
        (params.DB_WHERE ? params.DB_WHERE : '');
    const dbList = await tx.run(query);

    // With key for speed
    const dbMap = {};
    for (let i = 0; i < dbList.length; i++) {
        const dbItem = dbList[i];
        dbMap[createKey(Entity, dbItem)] = dbItem
    }

    for (let i = 0; i < params.newList.length; i++) {
        // New item from SAP
        const newItem = params.newList[i];

        // Old DB item
        const sKey = createKey(Entity, newItem);
        const dbItem = dbMap[sKey];

        // Insert or update

        if (!dbItem)
            try {
                await tx.run(
                    INSERT.into(Entity).entries(newItem)
                );
                result.inserted++;
                continue;
            } catch (e) {
                // After that try to UPDATE
                console.error('INSERT error: ', e);
                console.error('KEY: ', sKey);
            }

        // Update fields in DB
        await tx.run(
            UPDATE(Entity).set(newItem).where(createKey(Entity, newItem, true))
        );
        result.updated++;

        // Exclude from DB list
        delete dbMap[sKey];
    }

    // Delete old items
    if (params.DELETE_OLD)
        for (let key in dbMap)
            if (dbMap.hasOwnProperty(key)) {
                const dbItem = dbMap[key];
                tx.run(DELETE.from(Entity).where(createKey(Entity, dbItem, true)));
                result.deleted++;
            }

    await Db.close(tx, true);

    // And return info
    res.json(result);

    // R3 items
    return params.newList;
}

function itemsTransform(Entity, items, toR3) {
    const result = [];

    for (let i = 0; i < items.length; i++) {
        const oldItem = items[i];

        // Save for result
        const newItem = {};
        result.push(newItem);

        for (let elem in Entity.elements) {
            // noinspection JSUnfilteredForInLoop
            const field = Entity.elements[elem];
            const r3Name = field["@R3_FIELD"];
            if (!r3Name)
                continue;

            switch (toR3) {
                case true:
                    // Do not have any transformation (do not send date to R3)
                    newItem[r3Name] = oldItem[field.name];
                    break;

                case false:
                    let value = oldItem[r3Name];
                    switch (field.type) {
                        case 'cds.Date':
                            value = Time.getSqlDate(value);

                            // Do not save
                            if(value === '0000-00-00')
                                value = undefined;
                            break;
                    }
                    newItem[field.name] = value;
                    break;
            }
        }
    }

    return result;
}

function createKey(Entity, dbItem, asObject) {
    let key = asObject ? {} : "";

    for (let elem in Entity.elements) {
        // noinspection JSUnfilteredForInLoop
        const field = Entity.elements[elem];

        if (!field.key)
            continue;

        if (asObject)
            key[field.name] = dbItem[field.name];
        else
            key += ("-" + dbItem[field.name])
    }
    return key;
}

// Public Fm
const exportObject = {
    persist: persist,
    itemsTransform: itemsTransform,
    rfcClient: rfcClient
};

module.exports = (app, srv) => {
    // Just export functions
    if (!app)
        return exportObject;

    // All DB
    const {Werk, GasType, Lgort, EqunrGrp, StatusText, Driver, Equipment, Schedule, ReqHeader} = srv.entities('wb.db');

    // From user rights
    const {getWerksR3Clause, getBukrsR3Clause} = require('./user_info')();

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/WERK", async (req, res) => {
        await persist(req, res, Werk, {});
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/GAS_TYPE", async (req, res) => {
        await persist(req, res, GasType, {
            DELETE_OLD: true
        });
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/LGORT", async (req, res) => {
        await persist(req, res, Lgort, {});
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/EQUNR_GRP", async (req, res) => {
        await persist(req, res, EqunrGrp, {
            DELETE_OLD: true
        });
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/STATUS_TEXT", async (req, res) => {
        await persist(req, res, StatusText, {
            DELETE_OLD: false // Do not delete!
        });
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/DRIVER", async (req, res) => {
        // Bukrs by rights
        const where = await getBukrsR3Clause(req, srv);

        await persist(req, res, Driver, {
            DB_WHERE: where ? ' WHERE Bukrs ' + where : '',
            R3_WHERE: where ? ' DR~BE ' + where : ''
        });
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/EQUIPMENT", async (req, res) => {
        // Werks by rights
        const where = await getWerksR3Clause(req, srv);

        await persist(req, res, Equipment, {
            DB_WHERE: where ? ' WHERE Swerk ' + where : '',
            R3_WHERE: where ? ' ILOA~SWERK ' + where : ''
        });
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/SCHEDULE", async (req, res) => {
        // Only to parameters
        let sapDateFrom = req.query.FROM_DATE.replace(/-/g, '');
        let sapDateTo = req.query.TO_DATE.replace(/-/g, '');

        // Werks by rights
        const where = await getWerksR3Clause(req, srv);
        const filter = {
            DB_WHERE: where ? ' WHERE Werks ' + where + ' AND ' : '',
            R3_WHERE: where ? ' AFIH~IWERK ' + where + ' AND ' : '',

            afterCall: function (result, sapResult) { // params === filter
                // Could be wider than original date range
                for (let i = 0; i < sapResult.SCHEDULE.length; i++) {
                    const datum = sapResult.SCHEDULE[i].DATUM;
                    if (datum < sapDateFrom)
                        sapDateFrom = datum;

                    if (datum > sapDateTo)
                        sapDateTo = datum;
                }

                filter.DB_WHERE += ("Datum <= '" + Time.getSqlDate(sapDateTo) +
                    "' AND Datum >= '" + Time.getSqlDate(sapDateFrom) + "'");
            }
        };

        filter.R3_WHERE += ("AFKO~GSTRP <= '" + sapDateTo +
            "' AND AFKO~GLTRP >= '" + sapDateFrom + "'");

        await persist(req, res, Schedule, filter);
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/r3/REQ_HEADER", async (req, res) => {
        // Only to parameters
        const sapDateFrom = req.query.FROM_DATE.replace(/-/g, '');
        const sapDateTo = req.query.TO_DATE.replace(/-/g, '');

        // Werks by rights
        const where = await getWerksR3Clause(req, srv);
        const filter = {
            DB_WHERE: where ? ' WHERE Werks ' + where + ' AND ' : '',
            R3_WHERE: where ? ' AFIH~IWERK ' + where + ' AND ' : ''
        };

        filter.DB_WHERE += ("Gstrp <= '" + Time.getSqlDate(sapDateTo) +
            "' AND Gltrp >= '" + Time.getSqlDate(sapDateFrom) + "'");

        filter.R3_WHERE += ("AFKO~GSTRP <= '" + sapDateTo +
            "' AND AFKO~GLTRP >= '" + sapDateFrom + "'");

        const newList = await persist(req, res, ReqHeader, filter);

        // open connection & call RFC fm
        await rfcClient.open(); // if (err) return console.error('could not connect to server', err);
        const arrObjnr = [];
        for (let i = 0; i < newList.length; i++)
            arrObjnr.push("OR" + newList[i].Aufnr);

        await rfcClient.call('Z_WB_SET_STATUS', {
            IV_STATUS: '', // TODO check 'E0019'
            IV_INACT: '',
            IT_OBJNR: arrObjnr
        });
    });
};