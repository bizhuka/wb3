    namespace wb.db;

    type TWaybill : Integer64;
    type TAufnr : String(12);
    type TObjnr : String(22);
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
        @EndUserText.label: 'Waybill main id'
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

            //Equnr: TEqunr;
            Equipment : Association to Equipment;
            
            @Comment: 'stype = WB'
            Status : Association to StatusText;

            @Comment: 'stype = DR'
            DelayReason: Association to StatusText;

            ReqHeaders: Association to many ReqHeader on ReqHeaders.Waybill_Id = $self.Id;
            Schedules: Association to many Schedule on Schedules.Waybill_Id = $self.Id;
            ReqHistories: Association to many ReqHistory on ReqHistories.Waybill_Id = $self.Id;
            GasSpents: Association to many GasSpent on GasSpents.Waybill_Id = $self.Id;

            // Counts
            virtual req_cnt  : Integer;
            virtual sch_cnt  : Integer;
            virtual hist_cnt : Integer;
            virtual gas_cnt  : Integer;
    };

    @Comment: 'Works for authority checks'
    entity Werk {
            @R3_FIELD : 'T001W_WERKS'
        key Werks : TWerks;

            @R3_FIELD : 'T001K_BUKRS'
            Bukrs : TBukrs;

            @R3_FIELD : 'T001_BUTXT'
            Butxt : String(25);

            @R3_FIELD : 'T001W_NAME1'
            Name1 : String(30);
    };

    entity Driver {
            @R3_FIELD : 'DR_BE'
        key Bukrs     : TBukrs not null;

            @R3_FIELD : 'DR_TN'
        key Pernr     : TPernr not null;

            @Comment : 'Load from 1C'
            Barcode   : TBarcode;

            @R3_FIELD : 'DR_DATBEG'
            Datbeg    : Date;

            @R3_FIELD : 'DR_FIO'
            Fio       : TFio;

            @R3_FIELD : 'DR_PODR'
            Podr      : String(50);

            @R3_FIELD : 'DR_POST'
            Post      : String(120);

            @Comment : 'IIN is now empty'
            @R3_FIELD : 'DR_STCD3'
            Stcd3     : TIin;

            ValidDate : Timestamp;
    };

    @Comment: 'Vehicles of PM'
    entity Equipment {
            @R3_FIELD : 'EQUI_EQUNR'
        key Equnr        : TEqunr not null;

            @Comment: 'Works regulate access to data'
            @R3_FIELD : 'ILOA_SWERK'
            Swerk        : TWerks;

            @R3_FIELD : '_MARK'
            Expelled     : String(1);

            @Comment: 'For reading data from Wialon system'
            @R3_FIELD : 'WV_ID'
            WialonId     : String(5);

            NoDriverDate : Timestamp;

            TooName      : String(50);

            @R3_FIELD : 'ILOA_ANLNR'
            Anln1        : String(12);

            @R3_FIELD : 'EQUI_BAUJJ'
            Baujj        : String(4);

            @R3_FIELD : 'EQUI_BAUMM'
            Baumm        : String(2);

            @R3_FIELD : 'T001K_BUKRS'
            Bukrs        : String(4);

            @R3_FIELD : 'EQUZ_DATBI'
            Datbi        : Date;

            @R3_FIELD : 'FLEET_ENGINE_TYPE'
            Engine_type  : String(10);

            @R3_FIELD : 'EQUI_EQART'
            Eqart        : String(10);

            @R3_FIELD : 'EQKT_EQKTX'
            Eqktx        : String(40);

            @R3_FIELD : 'FLEET_FLEET_NUM'
            Fleet_num    : String(18);

            @R3_FIELD : 'FLEET_FUEL_PRI'
            Fuel_pri     : String(12);

            @R3_FIELD : 'FLEET_FUEL_SEC'
            Fuel_sec     : String(12);

            @R3_FIELD : 'EQUI_GERNR'
            Gernr        : String(18);

            @R3_FIELD : 'EQUI_HERLD'
            Herld        : String(3);

            @R3_FIELD : 'EQUI_HERST'
            Herst        : String(30);

            @R3_FIELD : 'WV_IMEI'
            Imei         : String(40);

            @R3_FIELD : 'EQUI_INBDT'
            Inbdt        : Date;

            @R3_FIELD : '_T435T_TXT'
            KtschTxt     : String(40);

            @R3_FIELD : 'FLEET_LICENSE_NUM'
            License_num  : String(15);

            @R3_FIELD : 'IMPTT_MPTYP'
            Mptyp        : String(1);

            @R3_FIELD : 'KLAH_CLASS'
            N_class      : String(15);

            @R3_FIELD : '_ORIG_CLASS'
            OrigClass    : String(15);

            @R3_FIELD : 'WV_PETROL_MODE'
            PetrolMode   : String(3);

            @R3_FIELD : 'IFLOTX_PLTXT'
            Pltxt        : String(40);

            @R3_FIELD : 'IMPTT_POINT'
            Point        : String(12);

            @R3_FIELD : 'FLEET_SPEED_MAX'
            Speed_max    : DecimalFloat; //Decimal;

            @R3_FIELD : 'ILOA_TPLNR'
            Tplnr        : String(30);

            @R3_FIELD : 'EQUI_TYPBZ'
            Typbz        : String(20);
    };

    entity StatusText {
        @R3_FIELD       : 'STATUS_ID'
        key Id          : Integer;

            @R3_FIELD   : 'MESSAGE_TYPE'
            MessageType : TMessagetype;

            @Comment: 'Each for different purpose'
            @R3_FIELD   : 'STATUS_TYPE'
            Stype       : TStype;

            // TODO 'X' ???
            @R3_FIELD   : 'IN_TILE'
            InTile      : String(1);

            @R3_FIELD   : 'KZ'
            Kz          : String(40);

            @R3_FIELD   : 'RU'
            Ru          : String(40);
    };

    entity EqunrGrp {
        @R3_FIELD : 'KTSCH'
        key Ktsch : TKtsch; // Class

        @R3_FIELD : 'GRP'
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
        @R3_FIELD : 'MARA_MATNR'
        key Matnr : TMatnr;

            @R3_FIELD : 'MAKT_MAKTX'
            Maktx : String(40);

            @R3_FIELD : 'T006A_MSEHL'
            Msehl : String(30);
    };

    entity Lgort {
        @R3_FIELD : 'T001L_WERKS'
        key Werks : TWerks; // Association to Werk;

        @R3_FIELD : 'T001L_LGORT'
        key Lgort : TLgort;

        @R3_FIELD : 'T001L_LGOBE'
            Lgobe : String(16);
    };

    entity ReqHeader {
            @R3_FIELD    : 'AFVC_OBJNR'
        key Objnr        : TObjnr;

            @R3_FIELD : 'AFIH_AUFNR'
            Aufnr        : String(12);

            @R3_FIELD : 'AFIH_IWERK'
            Werks        : TWerks; // Association to Werk;

            Waybill_Id   : TWaybill;

            FromDate     : Timestamp;
            ToDate       : Timestamp;

            Reason       : String(100);
            Status       : Association to StatusText;

            @R3_FIELD : 'AFVC_KTSCH'
            Ktsch        : TKtsch; // Association to EqunrGrp;

            @R3_FIELD : 'T435T_TXT'
            KtschTxt     : String(40);

            @R3_FIELD : 'ILOA_BEBER'
            Beber        : String(3);

            @R3_FIELD : 'AFVV_DAUNO'
            Duration     : DecimalFloat;

            @R3_FIELD : 'AFIH_EQUNR'
            Equnr        : TEqunr;

            @R3_FIELD : 'AFKO_GLTRP'
            Gltrp        : Date;

            @R3_FIELD : 'AFKO_GSTRP'
            Gstrp        : Date;

            @R3_FIELD : 'AFIH_ILART'
            Ilart        : String(3);

            @R3_FIELD : 'T353I_ILATX'
            Ilatx        : String(30);

            @R3_FIELD : 'AFIH_INGPR'
            Ingpr        : String(3);

            @R3_FIELD : 'T024I_INNAM'
            Innam        : String(18);

            @R3_FIELD : 'AFVC_LTXA1'
            Ltxa1        : String(40);

            @R3_FIELD : 'IFLOTX_PLTXT'
            Pltxt        : String(40);

            @R3_FIELD : 'AFIH_PRIOK'
            Priok        : String(1);

            @R3_FIELD : 'T356_PRIOKX'
            Priokx       : String(20);

            @R3_FIELD : 'T499S_KTEXT'
            Stand        : String(40);

            @R3_FIELD : 'ILOA_TPLNR'
            Tplnr        : String(30);

            @R3_FIELD : 'T357_FING'
            Fing         : String(14);

            @R3_FIELD : '_HOURS'
            Hours        : String(11);
    };

    entity ReqHistory {
        key Waybill_Id : TWaybill;
        key Objnr      : TObjnr;
    };

    entity Schedule {
            @R3_FIELD : 'DATUM'
        key Datum      : Date;

            @R3_FIELD : 'WERKS'
        key Werks      : TWerks; // Association to Werk;

            @R3_FIELD : 'EQUNR'
        key Equnr      : TEqunr; // Association to Equipment;

            @R3_FIELD : 'ILART'
            Ilart      : String(3);

            Waybill_Id : TWaybill;
    };

    entity WlnVehicle {
        @R3_FIELD       : 'GUID'
        key Gd          : TGuid;

            @R3_FIELD   : 'ID'
            Id          : String(5);

            @R3_FIELD   : 'TEXT'
            Nm          : String(50);

            @R3_FIELD   : 'IMEI'
            Uid         : String(20);

            @R3_FIELD   : ''
            Mileage     : DecimalFloat;

            @R3_FIELD   : ''
            Gps_mileage : DecimalFloat;

            @R3_FIELD   : ''
            Rs485_fls02 : DecimalFloat;

            @R3_FIELD   : ''
            Rs485_fls12 : DecimalFloat;

            @R3_FIELD   : ''
            Rs485_fls22 : DecimalFloat;
    };

    define entity VWaybill AS SELECT FROM Waybill  {
        *,
        Driver.Fio,

        Equipment.Eqktx,
        Equipment.Point,
        Equipment.Imei,
        Equipment.Mptyp,
        Equipment.WialonId,
        Equipment.License_num,
        Equipment.TooName,
        Equipment.PetrolMode,
        Equipment.Anln1,
        Equipment.KtschTxt
    } ;

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
        WHEN PtType = 1 THEN 'Негізгі бак'
        WHEN PtType = 2 THEN 'Жоғары жабдықтау'
        WHEN PtType = 4 THEN 'Күрке'
      END as PtType_kz : String(40),

      CASE
        WHEN PtType = 1 THEN 'Основной бак'
        WHEN PtType = 2 THEN 'Верхнее оборудование'
        WHEN PtType = 4 THEN 'Будка'
      END as PtType_ru : String(40)
    } ORDER BY Waybill_Id, PtType, Pos;

    define entity VCountREQ AS SELECT FROM ReqHeader{
        key Werks as Werks,
        key Status as Status,
        count(*) as cnt   : Integer
    }
    group by Werks, Status
    order by Werks, Status;


    define entity VCountWB AS SELECT FROM Waybill{
        key Werks as Werks,
        key Status as Status,
        count(*) as cnt  : Integer
    }group by Werks, Status
     order by Werks, Status;