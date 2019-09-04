"use strict";

const fs = require('fs');
const Status = require('../util/Status');
const Time = require('../util/Time');


module.exports = (app, srv) => {
    //////////////////////////////////////////////////////////////////////////////
    app.all("/db/sql_insert", async (req, res) => {
        const filePrefix = 'd:\\Users\\MoldaB\\IdeaProjects\\wb\\test-data\\';
        const fileOutPrefix = 'd:\\Users\\MoldaB\\IdeaProjects\\wb3\\db\\test\\';

        const entities = srv.entities('wb.db');
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
                            let fieldName = fields[f];

                            switch (key) {
                                case "Equipment":
                                    switch (fieldName) {
                                        case "orig_class":
                                            fieldName = "origclass";
                                            break;
                                    }
                                    break;
                            }

                            let elem = null;
                            for (let elemName in entity.elements) {
                                // noinspection JSUnfilteredForInLoop
                                const field = entity.elements[elemName];
                                if (field.name.toLowerCase() === fieldName) {
                                    elem = field;
                                    break;
                                }
                            }

                            sqlText += (elem.name + ",");
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