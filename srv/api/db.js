"use strict";

const Db = require('../util/Db');
const Status = require('../util/Status');
const Time = require('../util/Time');
// Synchronization with R3
const {getRfcClient} = require('./sync')();

const {getUserInfo} = require('./user_info')();

module.exports = (app, srv) => {

    const {Waybill, ReqHeader, ReqHistory, Schedule, GasSpent, VGasSpent} = srv.entities('wb.db');

    ////////////////////////////////////////////////////////////////////////////
    srv.before('UPDATE', 'Drivers', async (context) => {
        const driver = context.data;

        // {"ValidDate":"0001-01-01T00:00:01Z"}
        if (Time.isNow(driver.ValidDate))
            driver.ValidDate = Time.getNow();

        return driver;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.before('UPDATE', 'Equipments', async (context) => {
        const equipment = context.data;

        if (Time.isNow(equipment.NoDriverDate))
            equipment.NoDriverDate = Time.getNow();

        return equipment;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.before('UPDATE', 'ReqHeaders', async (context) => {
        const reqHeader = context.data;

        // Get current Waybill_Id
        const tx = cds.transaction(context._.req);
        const arrReqheader = await tx.run(
            SELECT.from(ReqHeader)
                .where({Objnr: reqHeader.Objnr})
        );
        const Waybill_Id = Number(arrReqheader[0].Waybill_Id);

        // No proper waybill
        if (Waybill_Id !== Status.WB_ID_NULL && Waybill_Id !== Status.WB_ID_REJECTED) {
            // Find waybill status
            const arrWaybill = await tx.run(
                SELECT.from(Waybill)
                    .where({id: Waybill_Id})
            );

            const newReqHistory = {Waybill_Id: Waybill_Id, Objnr: reqHeader.Objnr};

            if (arrWaybill && arrWaybill[0].Status < Status.ARRIVED)
                try {
                    await tx.run(
                        INSERT.into(ReqHistory).entries(newReqHistory)
                    );
                } catch (e) {
                    console.log(JSON.stringify(newReqHistory) + " " + e.toString())
                }
        }

        // Always
        console.log('---REQHEADER-COMMIT--');
        Db.close(tx, true);

        return reqHeader;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.before(['CREATE', 'UPDATE'], 'Waybills', async (context) => {
        console.log('-----------------BEFORE-Waybills-------------------');

        let waybill = context.data;

        // Status changed
        for (let key in waybill) {
            if (waybill.hasOwnProperty(key) && key.endsWith('Date')) {
                if (Time.isNow(waybill[key]))
                    waybill[key] = Time.getNow();
            }
        }
        console.log('{waybill}=', waybill);

        // Who changed
        waybill.ChangeDate = Time.getNow();
        const userInfo = getUserInfo(context._.req);
        if (userInfo)
            waybill.ChangeUser = userInfo.email;

        // Generate new key
        if (!waybill.Id) {
            console.log('Generate waybill.Id');

            // waybill.Id = (new Date()).getTime(); create option ?
            const rfcClient = await getRfcClient();
            const result = await rfcClient.call('Z_WB_NEXT_WAYBILL_ID', {});
            rfcClient.close();

            // from SAP
            waybill.Id = result.EV_WAYBILL_ID;
            console.log('waybill.Id=', waybill.Id);
        }

        if (!waybill.DelayReason)
            waybill.DelayReason = Status.DR_NO_DELAY;

        // Find old waybill
        const tx = cds.transaction(context._.req);

        let dbWaybill = await tx.run(
            SELECT.from(Waybill)
                .where({Id: waybill.Id})
        );

        // Get first item and update based on status
        if (dbWaybill && dbWaybill.length === 1) {
            dbWaybill = dbWaybill[0];
            dbWaybill.Status = waybill.Status ? waybill.Status : dbWaybill.Status;

            // For dates in journal
            dbWaybill.FromDate = waybill.FromDate ? waybill.FromDate : dbWaybill.FromDate;
            dbWaybill.ToDate = waybill.ToDate ? waybill.ToDate : dbWaybill.ToDate;
            waybill = dbWaybill;
        } else {
            // If new item
            waybill.WithNoReqs = waybill.WithNoReqs === undefined ? false : waybill.WithNoReqs;
        }

        if (waybill.Status !== Status.ARRIVED) {
            switch (waybill.Status) {
                case Status.CREATED:
                case Status.IN_PROCESS: //AGREED:
                    // Modify schedule
                    let fromDate = new Date(waybill.FromDate);
                    const fromDateTime = fromDate.getTime();
                    const toDateTime = new Date(waybill.ToDate).getTime();
                    while (fromDate.getTime() < toDateTime || fromDate.getTime() === fromDateTime) {

                        // Insert only (no Modify)
                        let schedule = {
                            Datum: Time.getSqlDate(fromDate),
                            Werks: waybill.Werks,
                            Equnr: waybill.Equnr,
                            Waybill_Id: waybill.Id
                        };

                        let isModified = await tx.run(
                            UPDATE(Schedule).set(schedule).where({
                                Datum: schedule.Datum,
                                Werks: schedule.Werks,
                                Equnr: schedule.Equnr
                            })
                        );
                        if (!isModified)
                            await tx.run(
                                INSERT.into(Schedule).entries(schedule)
                            );
                        console.log(isModified ? 'UPDATE' : 'INSERT', schedule);

                        // Next date
                        fromDate = new Date(fromDate.getTime() + (1000 * 3600 * 24));
                    }
                    break;

                // Cancel WB
                case Status.REJECTED:
                    await tx.run(DELETE.from(Schedule).where({Waybill_Id: waybill.Id}));
                    console.log('Delete Schedule=', waybill.Id);
                    break;

                // Close WB
                case Status.CLOSED:
                    await tx.run(DELETE.from(ReqHistory).where({Waybill_Id: waybill.Id}));
                    console.log('Delete ReqHistory=', waybill.Id);
                    break;
            }
        }
        // Always
        console.log('---WAYBILL-COMMIT--');
        Db.close(tx, true);

        return waybill;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.after('READ', 'VWaybills', async (result, context) => {
        // Get all waybill ids
        let idsList = '';
        const idsMap = {};
        for (let i = 0; i < result.length; i++) {
            const item = result[i];

            // No waybill id, just count
            if (!item.Id)
                return result;

            if (idsList)
                idsList += (',' + item.Id);
            else
                idsList = ('' + item.Id);

            // What to change
            idsMap[String(item.Id)] = item;
        }

        // Oops
        if (!idsList)
            return result;


        // Fill virtual fields
        let statement =
            '  SELECT w.Id,\n' +
            '    (SELECT COUNT (*) FROM _REQHEADER_ as r WHERE r.Waybill_Id = w.Id) AS Req_Cnt,\n' +
            '    (SELECT COUNT (*) FROM _SCHEDULE_ as s WHERE s.Waybill_Id = w.Id) AS Sch_Cnt,\n' +
            '    (SELECT COUNT (*) FROM _REQHISTORY_ as h WHERE h.Waybill_Id = w.Id) AS Hist_Cnt,\n' +
            '    (SELECT COUNT (*) FROM _GASSPENT_ as g WHERE g.Waybill_Id = w.Id) AS Gas_Cnt\n' +
            '  FROM _WAYBILL_ as w\n' +
            '  WHERE w.Id IN (_LIST_ID_)';

        statement = statement
            .replace('_WAYBILL_', Waybill["@cds.persistence.name"])
            .replace('_REQHEADER_', ReqHeader["@cds.persistence.name"])
            .replace('_SCHEDULE_', Schedule["@cds.persistence.name"])
            .replace('_REQHISTORY_', ReqHistory["@cds.persistence.name"])
            .replace('_GASSPENT_', GasSpent["@cds.persistence.name"])
            .replace('_LIST_ID_', idsList);

        const tx = cds.transaction(context._.odataReq);
        const items = await tx.run(statement);
        Db.close(tx, true);

        // Add virtual fields info
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const resultItem = idsMap[String(Db.readProperty(item, 'Id'))];

            // write counts
            resultItem.Req_Cnt = Db.readProperty(item, 'Req_Cnt');
            resultItem.Sch_Cnt = Db.readProperty(item, 'Sch_Cnt');
            resultItem.Hist_Cnt = Db.readProperty(item, 'Hist_Cnt');
            resultItem.Gas_Cnt = Db.readProperty(item, 'Gas_Cnt');
        }

        // And return
        return result;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.after('READ', 'VGasSpents', async (result, context) => {
        //const tx = cds.transaction(context._.odataReq);

        // By primary key Waybill_Id, PtType, Pos
        result.sort((a, b) => {
            let result = a.Waybill_Id - b.Waybill_Id;
            if (result !== 0)
                return result;

            result = a.PtType - b.PtType;
            if (result !== 0)
                return result;

            return a.Pos - b.Pos;
        });

        let prevItem = null;
        for (let i = 0; i < result.length; i++) {
            // from second position
            if (result[i].Pos === 0) {
                prevItem = result[i];
                continue;
            }

            const item = result[i];

            // // Read previous item
            // let prevItem = await tx.run(
            //     SELECT.from(VGasSpent)
            //         .where({
            //             Waybill_Id: item.Waybill_Id,
            //             PtType: item.PtType,
            //             Pos: item.Pos - 1
            //         }));
            //
            // // Oops
            // if (!prevItem || prevItem.length === 0)
            //     continue;
            // prevItem = prevItem[0];

            // Both fuel
            let total = Number(item.GasBefore) + Number(item.GasGiven);

            // GasSpent
            let prevGasAfterNext = Number(prevItem.GasAfterNext);
            if (prevGasAfterNext > 0)
                result[i].GasSpent = 0;
            else {
                if (prevGasAfterNext < 0)
                    prevGasAfterNext = -1 * prevGasAfterNext;

                if (total > prevGasAfterNext)
                    result[i].GasSpent = prevGasAfterNext;
                // else result[i].GasSpent = total - prevGasAfterNext;
            }

            // GasAfterNext
            prevGasAfterNext = Number(prevItem.GasAfterNext);
            if (prevGasAfterNext > 0)
                result[i].GasAfterNext = total;
            else
                result[i].GasAfterNext = prevGasAfterNext + total;

            // GasAfter
            const gasAfterNext = result[i].GasAfterNext;
            if (gasAfterNext < 0)
                result[i].GasAfter = 0;
            else
                result[i].GasAfter = gasAfterNext;

            // For next
            prevItem = item;
        }

        // Final rounding
        for (let i = 0; i < result.length; i++) {
            result[i].GasBefore = Math.round(result[i].GasBefore * 100) / 100;
            result[i].GasGive = Math.round(result[i].GasGive * 100) / 100;
            result[i].GasGiven = Math.round(result[i].GasGiven * 100) / 100;
            result[i].GasSpent = Math.round(result[i].GasSpent * 100) / 100;
            result[i].GasAfter = Math.round(result[i].GasAfter * 100) / 100;
        }
        // Db.close(tx);

        // And return
        return result;
    });

    //////////////////////////////////////////////////////////////////////////////
    srv.on('UPDATE', 'VWaybills', async (context) => {
        const wb = {};
        for (let prop in context.data)
            if (context.data.hasOwnProperty(prop)) {
                switch (prop) {
                    case "OdoDiff":
                    case "MotoHour":
                    case "Spent1":
                    case "Spent2":
                    case "Spent4":
                        wb[prop] = context.data[prop];
                        break;
                }
            }

        // No need
        if (Object.keys(wb).length === 0)
            return;
        console.log('-----START--UPDATE--VWaybills--');

        const tx = cds.transaction(context._.odataReq);
        await tx.run(
            UPDATE(Waybill).set(wb).where({
                Id: context.data.Id
            })
        );

        Db.close(tx, true);
        console.log('-----END--UPDATE--VWaybills--', context.data.Id, typeof context.data.Id);
    });
};