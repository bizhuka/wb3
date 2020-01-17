"use strict";

const Db = require('../util/Db');

const fs = require('fs');
const Status = require('../util/Status');
const Time = require('../util/Time');

const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage()
});

const AdmZip = require('adm-zip');

const parser = require('fast-xml-parser');

module.exports = (app, srv) => {
    // DB info
    const entities = srv.entities('wb.db');

    const findEntity = function (tableName) {
        for (let entityKey in entities)
            if (entities.hasOwnProperty(entityKey) &&
                entities[entityKey]["@cds.persistence.name"] === tableName) {
                return entities[entityKey];
            }
        throw (`Entity '${tableName}' not found`)
    };
    const getField = function (tableName, fieldName) {
        fieldName = fieldName.toLowerCase();

        const entity = findEntity(tableName);

        // switch (entityName) {
        //     case "Equipment":
        //         switch (fieldName) {
        //             case "orig_class":
        //                 fieldName = "origclass";
        //                 break;
        //         }
        //         break;
        // }

        let elem = null;
        for (let elemName in entity.elements) {
            // noinspection JSUnfilteredForInLoop
            const field = entity.elements[elemName];
            if (field.name.toLowerCase() === fieldName) {
                elem = field;
                break;
            }
        }

        if (!elem)
            throw (`Field name '${fieldName}' not found`);

        return elem;
    };

    //////////////////////////////////////////////////////////////////////////////
    app.all("/db/import_old", upload.single('zip_file'), async (req, res) => {

        // read zip from 'zip_file' parameter
        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();

        // SQL transaction
        const tx = cds.transaction(req);

        // Csv parser
        const Papa = require('papaparse');

        // Result
        const result = [];

        // Each folder is an entity
        const zipNames = zipEntries
            .filter(zipEntry => zipEntry.entryName.endsWith('/'))
            .map(zipEntry => zipEntry.entryName.split('/')[0]);

        for (let ind = 0; ind < zipNames.length; ind++) {
            // Get info about entity
            const zipName = zipNames[ind];
            const entity = findEntity(zipName);

            // Get info about fields
            const entryHeader = zipEntries.find(item => item.entryName === zipName + '/table.xml');

            // Parse info from XML
            const fields = parser.parse(entryHeader.getData().toString('utf8')).Table.AllAttrs.Field;

            // add fields to header
            const header = [];
            const cdsFields = [];
            for (let f = 0; f < fields.length; f++)

                if (!fields[f].Name.startsWith('$')) {
                    const field = getField(zipName, fields[f].Name);
                    header.push(field.name);
                    // Save description
                    cdsFields.push(field);
                }
            // Get table data
            const entryCSV = zipEntries.find(item => item.entryName === zipName + '/data.csv');

            // Parse data
            const csvResult = Papa.parse(
                header.join(',') + "\n" +
                entryCSV.getData().toString('utf8')
                , {
                    header: true,
                    skipEmptyLines: true,
                    escapeChar: '\\'
                });

            const oneInsert = {
                name: zipName,
                count: 0,
                errors: csvResult.errors
            };

            // insert 1 by 1 !
            for (let i = 0; i < csvResult.data.length; i++) {
                const item = csvResult.data[i];

                // transform datetimes
                cdsFields.forEach(cdsField => {

                    switch (cdsField.type) {
                        case 'cds.Timestamp':
                            // case 'ccds.Date':
                            const dateValue = item[cdsField.name];

                            if (dateValue)
                                item[cdsField.name] = (new Date(dateValue.substr(0, 23).replace(' ', 'T'))).toISOString();
                            else
                                item[cdsField.name] = null;
                            break;

                        case 'cds.DecimalFloat':
                            let numValue = item[cdsField.name];
                            if (numValue === '')
                                numValue = 0;

                            item[cdsField.name] = Number(numValue);
                            break;
                    }

                });

                for (let key in item)
                    if (item.hasOwnProperty(key) && typeof item[key] === 'string')
                        item[key] = item[key]
                            .replace(/\\"/g, '"')
                            .replace(/\\,/g, ',')
                            .replace(/\\\\/g, '\\');

                // Run insert query
                if (req.query.byOne === 'true')
                    try {
                        oneInsert.count += await tx.run(
                            INSERT.into(entity).entries(item)
                        );
                    } catch (err) {
                        // Add item info
                        const errDesc = {
                            item,
                            err
                        };
                        console.error(errDesc);
                        result.push(errDesc);
                    }
            }

            if (req.query.byOne !== 'true')
                try {
                    oneInsert.count += await tx.run(
                        INSERT.into(entity).entries(csvResult.data)
                    );
                } catch (err) {
                    console.error(err);
                    result.push(err);
                }

            console.log(`${oneInsert.name}, ${oneInsert.count}`);
            result.push(oneInsert);
        }

        // Commit and show info
        Db.close(tx, true);
        console.warn('================================');
        console.warn(result);
        res.json(result);
    });

    //////////////////////////////////////////////////////////////////////////////
    app.all("/db/sql_insert", async (req, res) => {
        const filePrefix = 'd:\\Users\\MoldaB\\IdeaProjects\\wb\\test-data\\';
        const fileOutPrefix = 'd:\\Users\\MoldaB\\IdeaProjects\\wb3\\db\\test\\';

        let wholeSql = '';
        for (const key in entities)
            if (entities.hasOwnProperty(key)) {
                const entity = entities[key];
                const fileName = filePrefix + key.toLowerCase() + '.sql';
                if (!fs.existsSync(fileName))
                    continue;

                // get liens
                const contents = fs.readFileSync(fileName, 'utf8').split("\n");

                let iSkipCnt = 0;
                let sqlText = 'INSERT INTO ' + entity["@cds.persistence.name"] + ' (';
                for (let i = 0; i < contents.length; i++) {
                    const line = contents[i];
                    if (line.indexOf("INSERT INTO ") !== 0)
                        continue;

                    if (iSkipCnt === 0) {
                        const endValues = ") VALUES";
                        const indLast = line.indexOf(endValues);
                        iSkipCnt = indLast + endValues.length;

                        const fromText = 'INSERT INTO public."wb.dbt::pack.' + key.toLowerCase() + '" (';
                        const fields = line.substr(fromText.length, indLast - fromText.length).split(", ");
                        for (let f = 0; f < fields.length; f++) {
                            const field = getField(key, fields[f]);
                            sqlText += (field.name + ",");
                        }
                        sqlText = sqlText.substr(0, sqlText.length - 1) + ") VALUES ";
                    }
                    sqlText += (line.substr(iSkipCnt, line.length - iSkipCnt - 1) + "\n,");
                }
                sqlText = sqlText.substr(0, sqlText.length - 1) + ";";
                wholeSql += sqlText;
                fs.writeFileSync(fileOutPrefix + key + ".sql", sqlText);
            }
        fs.writeFileSync(fileOutPrefix + "!whole.sql", wholeSql);

        res.json({
            ok: "ok"
        });
    });
};