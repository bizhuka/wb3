
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
