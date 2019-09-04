sap.ui.define([
        'sap/ui/base/Object',
        'sap/ui/model/json/JSONModel',
        'com/modekzWaybill/jsLib/ol'
    ], function (BaseObject, JSONModel, olLib) {
        "use strict";

        return BaseObject.extend("com.modekzWaybill.controller.LibWlnMessage", {
            owner: null,
            fuelDialog: null,

            mapDialog: null,
            map: null,

            wlnModel: null,

            constructor: function (owner, objExt) {
                this.owner = owner;
                this.wlnModel = new JSONModel(
                    "/././wialon/exportMessages?wialonId=" + objExt.wialonId + "&from=" + objExt.fromDate + "&to=" + objExt.toDate);
                this[objExt.id + "_init"].call(this);

                var _this = this;

                // Ok
                this.wlnModel.attachRequestCompleted(function () {
                    _this[objExt.id].call(_this);
                    objExt.wlnOk();

                    // If have additional functionality
                    if (objExt.wlnCallback)
                        objExt.wlnCallback();
                });

                // Oops
                this.wlnModel.attachRequestFailed(function () {
                    objExt.wlnError();
                });
            },

            wln_show_fuel_init: function () {
                var _this = this;

                if (_this.fuelDialog == null)
                    _this.fuelDialog = this.owner.createFragment("com.modekzWaybill.view.frag.WlnFuelDialog", {
                        closeFuelDialog: function () {
                            _this.fuelDialog.close();
                            _this.fuelDialog.destroy();
                            _this.fuelDialog = null;
                        }
                    });
                _this.fuelDialog.setModel(_this.wlnModel, "wialon");
            },

            wln_show_fuel: function () {
                this.fuelDialog.open();
            },

            wln_show_map_init() {
                var _this = this;

                // Load fo map
                $('head').append('<link rel="stylesheet" type="text/css" href="../css/ol.css">');

                if (_this.mapDialog == null)
                    _this.mapDialog = this.owner.createFragment("com.modekzWaybill.view.frag.WlnMapDialog", {
                        closeMapDialog: function () {
                            _this.mapDialog.close();
                            _this.mapDialog.destroy();
                            _this.mapDialog = null;
                        },

                        afterMapOpen: function () {
                            if (_this.map)
                                _this.map.setTarget(null);

                            var locations = [];
                            var data = _this.wlnModel.getData();
                            var messages = data.messages;
                            for (var i = 0; i < messages.length; i++) {
                                var message = messages[i];
                                locations.push([message.lon, message.lat]);
                            }

                            var route = new ol.geom.LineString(locations).transform('EPSG:4326', 'EPSG:3857');
                            var features = [
                                new ol.Feature({
                                    type: 'route',
                                    geometry: route
                                })
                            ];
                            var routeCoords = route.getCoordinates();
                            if (data.count >= 1) {
                                features.push(new ol.Feature({
                                    type: 'icon',
                                    geometry: new ol.geom.Point(routeCoords[0])
                                }));
                                features.push(new ol.Feature({
                                    type: 'icon',
                                    geometry: new ol.geom.Point(routeCoords[routeCoords.length - 1])
                                }));
                            }

                            var styles = {
                                route: new ol.style.Style({
                                    stroke: new ol.style.Stroke({
                                        width: 3,
                                        color: [237, 212, 0, 0.8]
                                    })
                                }),
                                icon: new ol.style.Style({
                                    image: new ol.style.Icon({
                                        anchor: [0.5, 1],
                                        src: './img/marker.png'
                                    })
                                })
                            };

                            // Custom layer
                            var vectorLayer = new ol.layer.Vector({
                                source: new ol.source.Vector({
                                    features: features
                                }),
                                style: function (feature) {
                                    return styles[feature.get('type')];
                                }
                            });

                            _this.map = new ol.Map({
                                target: 'id_map',
                                layers: [
                                    new ol.layer.Tile({
                                        source: new ol.source.OSM()
                                    }),
                                    vectorLayer
                                ],
                                view: new ol.View()
                            });
                            _this.map.getView().fit(
                                vectorLayer.getSource().getExtent(), _this.map.getSize(),
                                {padding: [30, 5, 5, 5]});
                        }
                    });
                _this.mapDialog.setModel(_this.wlnModel, "wialon");
            },

            wln_show_map: function () {
                this.mapDialog.open();
            }
        });
    }
);