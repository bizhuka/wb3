"use strict";

const axios = require('axios');

const {JSDOM} = require("jsdom");
// const htmlparser2 = require("htmlparser2");
// const xml2js = require('xml2js');

const util = require('util');

// Synchronization with R3
const sync = require('./sync')();

// options
const connWialon = JSON.parse(process.env.WIALON_OPT);

async function getAsMethod(url) {
    const urls = [
        // Get cookie
        "",

        // Login
        "login_action.html?user=" + connWialon.user + "&passw=" + connWialon.password + "&store_cookie=on&lang=ru&action=login",

        // Redirect
        null,

        // And then read data
        url
    ];

    let cookiesStr = null;
    for (let i = 0; i < urls.length; i++) {

        // Redirect without 301?
        let params = {
            // maxRedirects: 2
        };

        // Add cookie
        if (cookiesStr)
            params.headers = {
                Cookie: cookiesStr
            };

        // Send http request
        let response = await axios.get(connWialon.host + urls[i], params);

        switch (i) {
            case 0:
                cookiesStr = response.headers["set-cookie"].join(';');
                break;

            case 1:
                const match = response.data.match('url=([^"]*)');

                // Get redirect url
                urls[2] = match[1];
                break;

            case 2:
                // just skip
                break;

            case 3:
                return response.data;
        }
    }

    return null;
}

module.exports = (app, srv) => {

    //////////////////////////////////////////////////////////////////////////////
    app.all("/wialon/loadWlnVehicle", async (req, res) => {
        const {WlnVehicle} = srv.entities('wb.db');

        // Get all items from HTML
        const text = await getAsMethod("service.html");

        // All items
        const txtStart = ',"items":[{';
        const start = text.indexOf(txtStart) + txtStart.length - 2;
        const end = text.indexOf('}],"classes":{"', start) + 2;
        const html = text.substring(start, end);

        const wlnVehicles = JSON.parse(html);
        const newList = [];

        for (let i = 0; i < wlnVehicles.length; i++) {
            const wlnVehicle = wlnVehicles[i];
            if (wlnVehicle.cls !== 3)
                continue;

            const newItem = {
                Gd: wlnVehicle.gd,
                Id: '' + wlnVehicle.id,
                Nm: wlnVehicle.nm,
                Uid: wlnVehicle.uid,
            };
            newList.push(newItem);

            // Copy additional info
            if (!wlnVehicle.pos || !wlnVehicle.pos.p)
                wlnVehicle.pos = {
                    p: {}
                };

            newItem.Gps_mileage = wlnVehicle.pos.p.gps_mileage || 0;
            newItem.Mileage = wlnVehicle.pos.p.mileage || 0;
            newItem.Rs485_fls02 = wlnVehicle.pos.p.rs485_fls02 || 0;
            newItem.Rs485_fls12 = wlnVehicle.pos.p.rs485_fls12 || 0;
            newItem.Rs485_fls22 = wlnVehicle.pos.p.rs485_fls22 || 0;
        }

        await sync.persist(req, res, WlnVehicle, {
            FM: 'Z_WB_WIALON_VEHICLE',
            RFC_PARAMS: {
                IT_WIALON_VEHICLE: sync.itemsTransform(WlnVehicle, newList, true),
                EV_DBCNT: 0
            },
            // For saving in DB
            newList: newList,

            afterCall: function (result, sapResult) {
                result.dbcnt = sapResult.EV_DBCNT;
            }
        });
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/wialon/getSpentByWialon", async (req, res) => {
        if (process.env.RFC_TEST === 'true') {
            res.json(
                {
                    "MotoHour": 2536,
                    "OdoDiff": 5578.808212,
                    "Spent1": 34.56942,
                    "Spent2": 0,
                    "Spent4": 0
                });
            return;
        }

        const wialonId = req.query.wialonId;
        const sFrom = req.query.from;
        const sTo = req.query.to;

        const fullUrl = "report_templates_filter/export_to_file.html?file_name=&flags=0&gen=1&file_type=xml&page_orientation=landscap&page_size=a4&pack_file=0&att_map=0&object_prop_id=0&coding=utf8&delimiter=semicolon&headers=1&ignore_basis=0&xlsx=1" +
            "&object_id=" + wialonId + "&from=" + sFrom + "&to=" + sTo +
            "&report_template_id=" + connWialon.templateId + // 19
            "&resource_id=" + connWialon.resourceId +        // 291
            "&tz_offset=" + connWialon.tzOffset +            // 134239328
            "&rand=" + (new Date()).getTime();

        const text = await getAsMethod(fullUrl);
        if (!text)
            return;

        // const parseString = util.promisify(xml2js.parseString);
        // const html = htmlparser2.parseDOM(text);
        const html = new JSDOM(text).window.document;

        // Result
        const wlnSpent = {
            MotoHour: 0,
            OdoDiff: 0,
            Spent1: 0,
            Spent2: 0,
            Spent4: 0
        };

        // Read info about columns
        let indexOdo = -1, indexMotoHour = -1, indexTopFuel = -1, indexFuel = -1, indexBoothFuel = -1;
        const columns = html.querySelectorAll('col[name]');
        for (let i = 0; i < columns.length; i++) {
            const columnName = columns[i].getAttribute('name');

            if (columnName === "Пробег")
                indexOdo = i;
            else if (columnName === "Моточасы")
                indexMotoHour = i;
            else if (columnName === "Будка" || columnName === "Booth")
                indexBoothFuel = i;
            else if (columnName.indexOf("ДАРТ") >= 0 && columnName.indexOf("ППУА)") >= 0)
                indexTopFuel = i;
            else if ((columnName.indexOf("ДАРТ") >= 0 && columnName.indexOf("ТС)") >= 0) || columnName === "Потрачено по ДИРТ")
                indexFuel = i;
        }

        const values = html.querySelectorAll('col[val]');
        for (let i = 0; i < values.length; i++) {
            const index = i % columns.length;
            const value = Number(values[i].getAttribute('val'));

            switch (index) {
                case indexOdo:
                    wlnSpent.OdoDiff += value;
                    break;

                case indexMotoHour:
                    wlnSpent.MotoHour += value;
                    break;

                case indexFuel:
                    wlnSpent.Spent1 += value;
                    break;

                case indexTopFuel:
                    wlnSpent.Spent2 += value;
                    break;

                case indexBoothFuel:
                    wlnSpent.Spent4 += value;
                    break;
            }
        }

        // And send back to js
        res.json(wlnSpent);
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/wialon/exportMessages", async (req, res) => {
        const wialonId = req.query.wialonId;
        const sFrom = req.query.from;
        const sTo = req.query.to;

        const html = await getAsMethod("messages_filter/export_msgs.html?fmt=wln&id=" + wialonId + "&from=" + sFrom + "&to=" + sTo + "&arh=0");
        if (!html)
            return;

        const messages = html.split("\r\n");

        const wlnMessageInfo = {
            messages: [],
            count: 0,
            from: null,
            to: null,
            mileage: 0,
            diff: 0
        };
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const parts = message.split(";");
            if (parts.length < 2 || parts[0] !== "REG")
                continue;

            let mileage = 0;
            let fuel = 0;
            const points = parts[6].split(",");
            for (let p = 0; p < points.length; p++) {
                const pair = points[p].split(":");
                if (pair.length === 0)
                    continue;

                if (pair[0] === "mileage")
                    mileage = Number(pair[1]);
                if (pair[0] === "rs485_fls02")
                    fuel = Number(pair[1]);
            }

            const wlnMessage = {
                date: new Date(Number(parts[1]) * 1000), // TODO date like ? 15.03.2019 02:38:50
                lon: Number(parts[2]),
                lat: Number(parts[3]),
                mileage: mileage,
                fuel: fuel
            };

            if (wlnMessage.lat > 0 && wlnMessage.lon > 0)
                wlnMessageInfo.messages.push(wlnMessage);
        }

        // And send back to js
        res.json(wlnMessageInfo);
    });
};