sap.ui.require.preload({
	"com/modekzWaybill/view/frag/PetrolFrag.fragment.xml": "<core:FragmentDefinition\r\n        xmlns=\"sap.m\"\r\n        xmlns:core=\"sap.ui.core\"><IconTabFilter icon=\"{petrol>/icon}\" tooltip=\"\"><OverflowToolbar design=\"Transparent\"><Input type=\"Number\" width=\"10rem\" visible=\"{petrol>/inputEnabled}\"\r\n                   enabled=\"{ parts:[ { path: 'wb>Status' }, { path: 'wb>CreateDate' }, { path: 'userInfo>/WbChangeWialonData' }, { path: 'userInfo>/WbChangeWialonDataClose' }, { path: 'petrol>/noSource' } ], formatter: '.spentIsEnabled' }\"\r\n                   liveChange=\"onDataChange\"\r\n                   valueLiveUpdate=\"true\"\r\n                   value=\"{{SPENT_PATH}}\"\r\n                   id=\"{{SPENT_ID}}\"/><Title text=\"{petrol>/title}\"/></OverflowToolbar><Table items=\"{petrol>/data}\" sticky=\"ColumnHeaders,HeaderToolbar\"><columns><Column width=\"15rem\"><header><Label text=\"{i18n>gasType}\"/></header></Column><Column visible=\"{petrol>/inputEnabled}\" width=\"7rem\"><header><Label text=\"{i18n>remOut}\"\r\n                               tooltip=\"{i18n>remOutLong}\"/></header></Column><Column visible=\"{petrol>/inputEnabled}\" width=\"7rem\"><header><Label text=\"{i18n>give}\"/></header></Column><Column width=\"5rem\"><header><Label text=\"{i18n>fromLgort}\"/></header></Column><Column visible=\"{petrol>/inputEnabled}\" width=\"7rem\"><header><Label text=\"{i18n>actual}\" tooltip=\"{i18n>actualGiven}\"/></header></Column><Column width=\"7rem\"><header><Label text=\"{i18n>consumption}\"\r\n                               tooltip=\"{i18n>consumption}\"/></header></Column><Column visible=\"{petrol>/inputEnabled}\" width=\"7rem\"><header><Label text=\"{i18n>remIn}\"\r\n                               tooltip=\"{i18n>remInLong}\"/></header></Column></columns><ColumnListItem><cells><ComboBox items=\"{path:'wb>/GasTypes', templateShareable:false}\"\r\n                              selectedKey=\"{petrol>GasMatnr}\"\r\n                              enabled=\"{ parts:[ { path: 'petrol>/inputEnabled' }, { path: 'petrol>GasMatnr' }, { path: 'wb>Status' }, { path: 'wb>CreateDate' }, { path: 'userInfo>/WbChangeWialonData' }, { path: 'userInfo>/WbChangeWialonDataClose' }, { path:'i18n>_GasMatnr' } ], formatter: '.inputIsEnabled' }\"\r\n                              selectionChange=\"onMatnrChange\"\r\n                              width=\"100%\"><core:Item key=\"{wb>Matnr}\" text=\"{wb>Maktx}\"/></ComboBox><Input type=\"Number\" value=\"{petrol>GasBefore}\"\r\n                           enabled=\"{ parts:[ { path: 'petrol>/inputEnabled' }, { path: 'petrol>GasMatnr' }, { path: 'wb>Status' }, { path: 'wb>CreateDate' }, { path: 'userInfo>/WbChangeWialonData' }, { path: 'userInfo>/WbChangeWialonDataClose' }, { path:'i18n>_GasBefore' } ], formatter: '.inputIsEnabled' }\"\r\n                           liveChange=\"onDataChange\"\r\n                           valueLiveUpdate=\"true\"/><Input type=\"Number\" value=\"{petrol>GasGive}\"\r\n                           enabled=\"{= ${petrol>/inputEnabled}&amp;&amp;%{wb>Status}===${status>/CREATED}&amp;&amp;${petrol>GasMatnr}.length>0}\"\r\n                           liveChange=\"onDataChange\"\r\n                           valueLiveUpdate=\"true\"/><Input type=\"Text\" value=\"{petrol>GasLgort}\"\r\n                           enabled=\"{ parts:[ { path: 'petrol>/inputEnabled' }, { path: 'petrol>GasMatnr' }, { path: 'wb>Status' }, { path: 'wb>CreateDate' }, { path: 'userInfo>/WbChangeWialonData' }, { path: 'userInfo>/WbChangeWialonDataClose' }, { path:'i18n>_GasLgort' } ], formatter: '.inputIsEnabled' }\"\r\n                           liveChange=\"onDataChange\"\r\n                           valueLiveUpdate=\"true\"\r\n\r\n                           showValueHelp=\"true\"\r\n                           valueHelpRequest=\"handle_lgort_f4\"/><Input type=\"Number\" value=\"{petrol>GasGiven}\"\r\n                           enabled=\"{ parts:[ { path: 'petrol>/inputEnabled' }, { path: 'petrol>GasMatnr' }, { path: 'wb>Status' }, { path: 'wb>CreateDate' }, { path: 'userInfo>/WbChangeWialonData' }, { path: 'userInfo>/WbChangeWialonDataClose' }, { path:'i18n>_GasGiven' } ], formatter: '.inputIsEnabled' }\"\r\n                           liveChange=\"onDataChange\"\r\n                           valueLiveUpdate=\"true\"/><Input type=\"Number\" value=\"{petrol>GasSpent}\" enabled=\"false\"/><Input type=\"Number\" value=\"{petrol>GasAfter}\" enabled=\"false\"/></cells></ColumnListItem></Table></IconTabFilter></core:FragmentDefinition>"
}, "com/modekzWaybill/Component-preload");