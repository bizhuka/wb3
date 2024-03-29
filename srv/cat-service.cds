using wb.db as path from '../db/data-model';
// using { Country, managed } from '@sap/cds/common';

service CatalogService {
  entity Waybills as projection on path.Waybill;
  entity Werks as projection on path.Werk;
  entity Drivers as projection on path.Driver;
  entity Equipments as projection on path.Equipment;
  entity Statustexts as projection on path.StatusText;
  entity EqunrGrps as projection on path.EqunrGrp;
  entity GasSpents as projection on path.GasSpent;
  entity GasTypes as projection on path.GasType;
  entity Lgorts as projection on path.Lgort;
  entity ReqHeaders as projection on path.ReqHeader;
  entity ReqHistorys as projection on path.ReqHistory;
  entity Schedules as projection on path.Schedule;
  entity WlnVehicles as projection on path.WlnVehicle;

  entity VWaybills as projection on path.VWaybill; // @readonly manual update
  entity VReqHeaders @readonly as projection on path.VReqHeader;
  entity VDrivers @readonly as projection on path.VDriver;
  entity VCountWBs @readonly as projection on path.VCountWB;
  entity VCountREQs @readonly as projection on path.VCountREQ;
  entity VGasSpents @readonly as projection on path.VGasSpent;
}