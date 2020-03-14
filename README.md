1. run npm install in / & /srv/ folders
2. launch in /package.json deploy & deploySQLite & build
3. for local test launch wb3\cdsRun.js as node.js   before launching:
     extract wb3\db\wb.7z (replace wb.db)
     copy form github node_modules\ & \srv\node_modules\ again (some libraries were changed)
     install rfc for connecting to SAP (or make environment variable RFC_TEST === 'true')
     create env variables based on wb3\manifest-srv.yml (WB_IS_TEST=true, WIALON_OPT, WB_CONNECTIONS)
4. for hana testing ->  cf push -f manifest-srv.yml




SELECT COUNT(*) FROM wb_db_Waybill
WHERE CreateDate <= '2019-11-01';

SELECT COUNT(*) FROM wb_db_ReqHeader
WHERE Gltrp <= '2019-11-01';

SELECT COUNT(*) FROM wb_db_GasSpent
WHERE Waybill_Id NOT IN (SELECT DISTINCT Id FROM wb_db_Waybill);

SELECT COUNT(*) FROM wb_db_Schedule
WHERE Waybill_Id NOT IN (SELECT DISTINCT Id FROM wb_db_Waybill);

SELECT COUNT(*) FROM wb_db_ReqHistory
WHERE Waybill_Id NOT IN (SELECT DISTINCT Id FROM wb_db_Waybill);

vacuum ;
