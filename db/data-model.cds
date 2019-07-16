namespace wb.db;

// @EndUserText.label: 'Demo service Definition'
// context pack
    type TWaybill : Integer64;
    type TAufnr : String(12);
    type TEqunr : String(18);
    type TBukrs : String(4);
    type TWerks : String(4);
    type TLgort : String(4);
    type TPernr : String(8);
    type TEmail : String(40);
    type TDescription : String(150);
    type TMeasureDoc :String(20);

    type TBarcode : String(32);
    type TFio : String(30);
    type TIin : String(18);
    type TMatnr : String(18);
    type TKtsch : String(7);
    type TGuid : String(32);

    // Request confirm, Request reject, Waybill, Delay reason
    type TStype : String(2) enum { RC; RR; WB; DR; }

    type TMessagetype : String(40) enum { Success; Information; Warning; Error};

    type TPtType : Integer enum {
        main = 1;
        top  = 2;
        both = 4;
    };

    
    @Comment : 'Main waybill table'
    entity Waybill {
        @Comment : 'Waybill id'
        key Id            : TWaybill @title: '{i18n>waybill}' not null;
            Description   : TDescription @title: '{i18n>description}';

            @Comment: 'Authority checks'
            Werks         : TWerks;

            @Comment: 'Plan dates'
            FromDate      : Date;
            ToDate        : Date;

            @Comment: 'Created without requests'
            WithNoReqs    : Boolean @title: '{i18n>noReqs2}'; //  default false; // TODO default false;    error IN SQLite
            
            @Comment: 'Actual dates'
            CreateDate    : Timestamp;
            ConfirmDate   : Timestamp;
            GarageDepDate : Timestamp;
            GarageArrDate : Timestamp;
            CloseDate     : Timestamp;

            @Comment: 'Who and when changed waybill'
            ChangeUser    : TEmail;
            ChangeDate    : Timestamp;

            @Comment: 'Wialon data'
            Spent1        : DecimalFloat;
            Spent2        : DecimalFloat;
            Spent4        : DecimalFloat;
            MotoHour      : DecimalFloat;
            OdoDiff       : DecimalFloat;

            @Comment: 'After close WB coming from SAP'
            Docum         : TMeasureDoc;
            Aufnr         : TAufnr;
            
            // bukrs : TBukrs; driver: TPernr;
            Driver : Association to Driver;

            // equnr: TEqunr;
            Equipment : Association to Equipment;
            
            @Comment: 'stype = WB'
            Status : Association to StatusText;

            @Comment: 'stype = DR'
            DelayReason: Association to StatusText;

            ReqHeaders: Association to many ReqHeader on ReqHeaders.Waybill_Id = $self.Id;
            Schedules: Association to many Schedule on Schedules.Waybill_Id = $self.Id;
            ReqHistories: Association to many ReqHistory on ReqHistories.Waybill_Id = $self.Id;
            GasSpents: Association to many GasSpent on GasSpents.Waybill_Id = $self.Id;
    };
    
    define entity VWaybill AS SELECT FROM Waybill  {
        Id,
        Driver.Fio,
        // Equipment.Eqktx, Equipment.Point, Equipment.Imei, Equipment.Mptyp, Equipment.WialonId, Equipment.License_num, Equipment.TooName, Equipment.PetrolMode, Equipment.Anln1, Equipment.KtschTxt,

        // count(ReqHeaders.Objnr) as req_cnt : Integer,
        // count(Schedules.Datum) as sch_cnt : Integer,
        // count(ReqHistories.Objnr) as hist_cnt : Integer,
        count(GasSpents.Pos) as gas_cnt : Integer
    } group by Id, Driver.Fio;


    @Comment: 'Works for authority checks'
    entity Werk {
        key Werks : TWerks;
            Bukrs : TBukrs;
            Butxt : String(25);
            Name1 : String(30);
    };

    entity Driver {
        key Bukrs     : TBukrs not null;
        key Pernr     : TPernr not null;
            Barcode   : TBarcode;
            Datbeg    : Date;
            Fio       : TFio;
            Podr      : String(50);
            Post      : String(120);

            @Comment : 'IIN is now empty'
            Stcd3     : TIin;
            ValidDate : Timestamp;
    };

    @Comment: 'Vehicles of PM'
    entity Equipment {
        key Equnr        : TEqunr not null;

            @Comment: 'Works regulate access to data'
            Swerk        : TWerks;

            @Comment: 'For reading data from Wialon system'
            WialonId     : String(5);

            Anln1        : String(12);
            Baujj        : String(4);
            Baumm        : String(2);
            Bukrs        : String(4);
            Datbi        : Date;
            Engine_type  : String(10);
            Eqart        : String(10);
            Eqktx        : String(40);
            Fleet_num    : String(18);
            Fuel_pri     : String(12);
            Fuel_sec     : String(12);
            Gernr        : String(18);
            Herld        : String(3);
            Herst        : String(30);
            Imei         : String(40);
            Inbdt        : Date;
            KtschTxt     : String(40);
            License_num  : String(15);
            Mptyp        : String(1);
            N_class      : String(15);
            NoDriverDate : Timestamp;
            OrigClass    : String(15);
            PetrolMode   : String(3);
            Pltxt        : String(40);
            Point        : String(12);
            Speed_max    : DecimalFloat; //Decimal;
            TooName      : String(50);
            Tplnr        : String(30);
            Typbz        : String(20);
    };

    entity StatusText {
        key Id          : Integer;
            MessageType : TMessagetype;

            @Comment: 'Each for different purpose'
            Stype       : TStype;

            // TODO 'X' ???
            InTile      : String(1);

            Kz          : String(40);
            Ru          : String(40);
    };

    entity EqunrGrp {
        key Ktsch : TKtsch; // Class
            Grp   : String(40); // Group
    };

    entity GasSpent {
        key Waybill_Id : TWaybill;
        key PtType     : TPtType;
        key Pos        : Integer;
            GasBefore  : DecimalFloat;
            GasGive    : DecimalFloat;
            GasGiven   : DecimalFloat;
            GasLgort   : Association to Lgort;
            GasMatnr   : Association to GasType;
    };

    entity GasType {
        key Matnr : TMatnr;
            Maktx : String(40);
            Msehl : String(30);
    };

    entity Lgort {
        key Werks : Association to Werk;
        key Lgort : TLgort;
            Lgobe : String(16);
    };

    entity ReqHeader {
        key Objnr        : String(22);

            Aufnr        : String(12);
            Iwerk        : Association to Werk;
            Ktsch        : Association to EqunrGrp;
            KtschTxt     : String(40);

            Beber        : String(3);

            Duration     : DecimalFloat;
            Equnr        : String(18);
            Gltrp        : Date;
            Gstrp        : Date;
            Ilart        : String(3);
            Ilatx        : String(30);
            Ingpr        : String(3);
            Innam        : String(18);
            Ltxa1        : String(40);
            Pltxt        : String(40);
            Priok        : String(1);
            Priokx       : String(20);
            Stand        : String(40);
            Tplnr        : String(30);
            Waybill_Id   : TWaybill;
            FromDate     : Timestamp;
            Reason       : String(100);
            Status       : Association to StatusText;
            ToDate       : Timestamp;
            Fing         : String(14);
            Hours        : String(11);
    };

    entity ReqHistory {
        key Waybill_Id : TWaybill;
        key Objnr      : String(22);
    };

    entity Schedule {
        key Datum      : Date;
        key Werks      : Association to Werk ;
        key Equnr      : Association to Equipment;
            Ilart      : String(3);
            Waybill_Id : TWaybill;
    };

    entity Wlnvehicle {
        key Gd          : TGuid;
            Gps_mileage : DecimalFloat;
            Id          : String(5);
            Mileage     : DecimalFloat;
            Nm          : String(50);
            Rs485_fls02 : DecimalFloat;
            Rs485_fls12 : DecimalFloat;
            Rs485_fls22 : DecimalFloat;
            Uid         : String(20);
    };

    define entity VReqHeader AS SELECT FROM ReqHeader{
        *,
        Status.Kz as StatusReason_kz,
        Status.Ru as StatusReason_ru
    };

    define entity VDriver as SELECT FROM Driver { * };

    define entity VGasSpent AS SELECT FROM GasSpent left outer join Waybill as w on Waybill_Id = w.Id {
        key Waybill_Id,
        key PtType,
        key Pos,
        GasBefore, GasGive, GasGiven, GasLgort, GasMatnr,

        GasMatnr.Maktx,

        w.Id, w.Werks, w.CreateDate, w.OdoDiff, w.MotoHour, w.Description, w.Status,

        w.Equipment.Equnr, w.Equipment.Eqktx, w.Equipment.Point, w.Equipment.Imei, w.Equipment.Mptyp,
        w.Equipment.WialonId, w.Equipment.License_num, w.Equipment.TooName, w.Equipment.PetrolMode,
        w.Equipment.Anln1, w.Equipment.KtschTxt,

      CASE
        WHEN PtType = 1 THEN 'РќРµРіС–Р·РіС– Р±Р°Рє'
        WHEN PtType = 2 THEN 'Р–РѕТ“Р°СЂС‹ Р¶Р°Р±РґС‹Т›С‚Р°Сѓ'
        WHEN PtType = 4 THEN 'РљТЇСЂРєРµ'
      END as PtType_kz : String(40),

      CASE
        WHEN PtType = 1 THEN 'РћСЃРЅРѕРІРЅРѕР№ Р±Р°Рє'
        WHEN PtType = 2 THEN 'Р’РµСЂС…РЅРµРµ РѕР±РѕСЂСѓРґРѕРІР°РЅРёРµ'
        WHEN PtType = 4 THEN 'Р‘СѓРґРєР°'
      END as PtType_ru : String(40)
    } ORDER BY Waybill_Id, PtType, Pos;

    define entity VCountREQ AS SELECT FROM ReqHeader{
        key Iwerk as Werks,
        key Status as Status,
        count(*) as cnt   : Integer
    }
    group by Iwerk, Status
    order by Iwerk, Status;


    define entity VCountWB AS SELECT FROM Waybill{
        key Werks as Werks,
        key Status as Status,
        count(*) as cnt  : Integer
    }group by Werks, Status
     order by Werks, Status;