using wb.db as path from '../db/data-model';

service CatalogService {  
  entity Waybills as projection on path.Waybill;
  entity Werks as projection on path.Werk;
  entity Drivers as projection on path.Driver;
  entity Equipments as projection on path.Equipment;
  entity Statustexts as projection on path.StatusText;
  entity EqunrGrps as projection on path.EqunrGrp;
  entity Gasspents as projection on path.GasSpent;
  entity Gastypes as projection on path.GasType;
  entity Lgorts as projection on path.Lgort;
  entity ReqHeaders as projection on path.ReqHeader;
  entity ReqHistorys as projection on path.ReqHistory;
  entity Schedules as projection on path.Schedule;
  entity Wlnvehicles as projection on path.Wlnvehicle;

  entity VWaybills @readonly as projection on path.VWaybill;
  entity VReqHeaders @readonly as projection on path.VReqHeader;
  entity VDrivers @readonly as projection on path.VDriver;
  entity VCountWBs @readonly as projection on path.VCountWB;
  entity VCountREQs @readonly as projection on path.VCountREQ;
  entity VGasspents @readonly as projection on path.VGasSpent; 

  action csvUploadDriverMedCards(csv : String) returns String;
  action uploadEquipment(csv : String) returns String;
}