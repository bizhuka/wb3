"use strict";

const Db = require('../util/Db');
const xssec = require("@sap/xssec");
const util = require('util');
const fs = require('fs');

const readFile = util.promisify(fs.readFile);

async function getUserInfo() {
    // get from json
    const token = Db.isTest() ?
        JSON.parse(await readFile(Db.getFilePath('json/token.json'), 'utf8')) :
        getHanaAuthInfo();

    // Parsed info
    const result = {
        login: token.user_name, // authInfo.userInfo.logonName,
        email: token.email, // authInfo.userInfo.email,
        firstName: token.given_name,// authInfo.userInfo.givenName,
        lastName: token.family_name, // authInfo.userInfo.familyName,
        scopes: [],
        werks: [],
        ingrp: [],
        beber: []
        //timeZoneOffset;
    };

    // Get scopes
    for (let i = 0; i < token.scope.length; i++) {
        const arr = token.scope[i].split('.');
        if (arr.length === 2) {
            const scopeName = arr[1];
            result.scopes.push(scopeName);

            // For speed
            result[scopeName] = true;
        }
    }

    // Rights by values
    const items = token["xs.system.attributes"]["xs.saml.groups"];

    // All scopes and
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.startsWith("Werks_"))
            result.werks.push(item.substring(6));
        else if (item.startsWith("Ingrp_"))
            result.ingrp.push(item.substring(11));
        else if (item.startsWith("Beber_"))
            result.beber.push(item.substring(11));
    }

    return result;
}

async function getWerksR3Clause(req) {
    const userInfo = await getUserInfo();

    // No restriction
    if (userInfo.werks.length === 0)
        return '';

    let clause = ' IN (';
    for (let i = 0; i < userInfo.werks.length; i++) {
        if (i !== 0)
            clause += ", ";
        clause += ("'" + userInfo.werks[i] + "'");
    }

    return clause + ')';
}

async function getBukrsR3Clause(req, srv) {
    const {Werk} = srv.entities('wb.db');
    const query = 'SELECT Bukrs FROM ' + Werk["@cds.persistence.name"] + ' WHERE Werks ' + await getWerksR3Clause(req);

    const tx = cds.transaction(req);
    const arrWerks = await tx.run(query);
    await Db.close(tx);

    // No restriction
    if (arrWerks.length === 0)
        return '';

    let clause = ' IN (';
    for (let i = 0; i < arrWerks.length; i++) {
        if (i !== 0)
            clause += ", ";

        const bukrs = Db.readProperty(arrWerks[i], 'Bukrs');
        clause += ("'" + bukrs + "'");
    }
    return clause + ')';
}

function getHanaAuthInfo() {
    let parsedPayload = null;
    try {
        parsedPayload = JSON.parse(xssec.ssojwt.getJWPayload());
    } catch (er) {
        const errorString = 'Access token payload could not be parsed successfully.\n'
            + 'Error: ' + er.message;
        return console.error(errorString);
    }
    return parsedPayload;
}

// Public Fm
const exportObject = {
    getUserInfo: getUserInfo,
    getWerksR3Clause: getWerksR3Clause,
    getBukrsR3Clause: getBukrsR3Clause
};

module.exports = (app) => {
    // Just export functions
    if (!app)
        return exportObject;

    //////////////////////////////////////////////////////////////////////////////
    app.all("/userInfo", async (req, res) => {
        const data = await getUserInfo(req);
        res.status(200).json(data)
    });
};