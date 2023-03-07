({

    callApexMethod: function (cmp, methodName, params) {
        let promiseInstance = new Promise($A.getCallback(function (resolve, reject) {
            console.log("Firing the following apex method: " + methodName);
            let action = cmp.get("c." + methodName);
            console.log("Applying the following parameters to method: ");
            console.log(params);
            action.setParams(params);
            action.setCallback(this, function (res) {
                console.log("Successsfully made it to callback fcn");
                let state = res.getState();
                if (state === "SUCCESS") {
                    console.log("Apex method ran successfully...");
                    console.log("Returning following data: ");
                    console.log(res.getReturnValue());
                    resolve(JSON.parse(JSON.stringify(res.getReturnValue())));
                } else if (state === "INCOMPLETE") {
                    console.log("Unable to complete apex action...");
                    reject("INCOMPLETE");
                } else if (state === "ERROR") {
                    console.log("Error occurred from apex action...");
                    let error = res.getError();
                    if (error) {
                        if (error[0] && error[0].message) {
                            console.log("Error whenever running apex method: " + error[0].message);
                            reject(error[0].message);
                        }
                    } else {
                        reject("ERROR");
                    }
                } else {
                    console.log("Unknown error occurred from apex action...");
                    reject("UNKNOWN");
                }
            });

            $A.enqueueAction(action);
        }));

        return promiseInstance;

    },

    fetchWells: function (cmp, evt, helper) {
        let action = cmp.get("c.wellQuery");
        action.setParams({
            "recordId": cmp.get("v.account"),
            "status": cmp.get("v.selectedStatus")
        });
        action.setCallback(this, function (res) {
            console.log("Successsfully made it to callback fcn");
            let state = res.getState();
            if (state === "SUCCESS") {
                console.log("Apex method ran successfully...");
                console.log("Returning following data: ");
                console.log(res.getReturnValue());
                let wells = res.getReturnValue();
                cmp.set("v.wellList", wells);
                helper.organizeMapMarkers(cmp, wells);
                if (wells.length > 25) {
                    cmp.set("v.relativeWells", wells.splice(0, 25));
                } else {
                    cmp.set("v.relativeWells", wells);
                }
                cmp.set("v.mapLoaded", true);
            } else if (state === "INCOMPLETE") {
                console.log("Unable to complete apex action...");
            } else if (state === "ERROR") {
                console.log("Error occurred from apex action...");
                let error = res.getError();
                if (error) {
                    if (error[0] && error[0].message) {
                        console.log("Error whenever running apex method: " + error[0].message);
                    }
                } else {
                }
            } else {
                console.log("Unknown error occurred from apex action...");
            }
        });
        $A.enqueueAction(action);
    },

    organizeMapMarkers: function (cmp, wells) {
        let userId = cmp.get("v.user");
        console.log("Receiving following user id from MAP: " + cmp.get("v.user"));
        var map = cmp.get("v.mapRef");
        var clusters = cmp.get("v.clusterRef");
        if (clusters) {
            clusters.clearLayers();
        }
        let wellData = wells;
        var markerClusters = L.markerClusterGroup();
        for (let i = 0; i < wellData.length; i++) {
            let wellIcon = '';
            let status = '';
            let statusCSS = '';
            if (wellData[i].Status__c == 'Passed') {
                wellIcon = `https://api.geoapify.com/v1/icon/?type=material&color=green&size=xx-large&icon=verified&noWhiteCircle&apiKey=25d62ab3b69e4b6b9fbe1a1cc8748246`;
                status = 'Passed';
                statusCSS = 'slds-theme_success';
            } else if (wellData[i].Status__c == 'Failed') {
                wellIcon = `https://api.geoapify.com/v1/icon/?type=material&color=red&size=xx-large&icon=dangerous&noWhiteCircle&apiKey=25d62ab3b69e4b6b9fbe1a1cc8748246`;
                status = 'Needs Attention';
                statusCSS = 'slds-theme_error';
            } else {
                wellIcon = `https://api.geoapify.com/v1/icon/?type=material&color=orange&size=xx-large&icon=help_center&noWhiteCircle&apiKey=25d62ab3b69e4b6b9fbe1a1cc8748246`;
                status = 'Needs Attention';
                statusCSS = 'slds-theme_warning';
            }

            let markerIcon = L.icon({
            iconUrl: wellIcon,
            iconSize: [31, 46], // size of the icon
            iconAnchor: [15.5, 42], // point of the icon which will correspond to marker's location
            popupAnchor: [0, -45] // point from which the popup should open relative to the iconAnchor
            });
            let popup = "<h2 class=\"popup-header\">" + "<a href=\"#" + wellData[i].Id + "\"" + ">" + wellData[i].Name + "</a>" + "<br/><span class=\"slds-badge "  + statusCSS + "\" style=\"text-align: center\">" + status + "</span></h2>";
            
            popup += '<br/>';
            
            if (wellData[i].Inspections__r == undefined) {
                popup += '<h2 id=\"element-with-table-label\" class=\"slds-text-heading_medium slds-m-bottom_xx-small popup-tableHeader\">Not Inspected</h2>';
            }
            else {

                popup += '<h2 id=\"element-with-table-label\" class=\"slds-text-heading_medium slds-m-bottom_xx-small popup-tableHeader\">Latest Inspections</h2>';

                popup += '<table class=\"slds-table slds-table_cell-buffer slds-table_bordered popup-table\" aria-labelledby=\"element-with-table-label other-element-with-table-label\">';
                
                popup += '<thead>';
                popup += '<tr class=\"slds-line-height_reset\">';
                popup += '<th class=\"\" scope=\"col\">';
                popup += '<div class=\"slds-truncate\" title=\"Ticket #\">Ticket #</div>';
                popup += '</th>';
                popup += '<th class=\"\" scope=\"col\">';
                popup += '<div class=\"slds-truncate\" title=\"Type\">Type</div>';
                popup += '</th>';
                popup += '<th class=\"\" scope=\"col\">';
                popup += '<div class=\"slds-truncate\" title=\"Date\">Date</div>';
                popup += '</th>';
                popup += '<th class=\"\" scope=\"col\">';
                popup += '<div class=\"slds-truncate\" title=\"Status\">Status</div>';
                popup += '</th>';
                popup += '</tr>';
                popup += '</thead>';

                popup += '<tbody>';

                //loop inspections here

                    for (let j = 0; j < wellData[i].Inspections__r.length; j++) {
                        if (j == 3) {
                            break;
                        }
                        let inspection = wellData[i].Inspections__r[j];
                        popup += '<tr class=\"slds-hint-parent\">';
                        popup += '<th data-label=\"Name\" scope=\"row\">';
                        popup += '<div class=\"slds-truncate\" title=\"' + inspection.Name + '\">' + inspection.Name + '</div>';
                        popup += '</th>';
                        popup += '<td data-label=\"Type\">';
                        popup += '<div class=\"slds-truncate\" title=\"' + inspection.Record_Type__c + '\">' + inspection.Record_Type__c + '</div>';
                        popup += '</td>';
                        if (inspection.Completion_Date__c) {
                            popup += '<td data-label=\"Date\">';
                            popup += '<div class=\"slds-truncate\" title=\"' + inspection.Completion_Date__c + '\">' + inspection.Completion_Date__c + '</div>';
                            popup += '</td>';
                        } else if (inspection.Schedule_date__c) {
                            popup += '<td data-label=\"Date\">';
                            popup += '<div class=\"slds-truncate\" title=\"' + inspection.Schedule_date__c + '\">' + inspection.Schedule_date__c + '</div>';
                            popup += '</td>';
                        } else {
                            popup += '<td data-label=\"Date\">';
                            popup += '<div class=\"slds-truncate\" title=\"N/A\">N/A</div>';
                            popup += '</td>';
                        }

                        if (inspection.CompletionStatus__c) {
                            let inspStatusCSS = '';
                            if (inspection.CompletionStatus__c == 'Pass') {
                                inspStatusCSS = 'slds-theme_success';
                            } else if (inspection.CompletionStatus__c == 'Fail') {
                                inspStatusCSS = 'slds-theme_error'
                            } else {
                                inspStatusCSS = 'slds-theme_warning';
                            }
                            popup += '<td data-label=\"Status\">';
                            popup += '<div class=\"slds-truncate\" title=\"Status\">';
                            popup += '<span class=\"slds-badge ' + inspStatusCSS + '\">' + inspection.CompletionStatus__c + '</span>';
                            popup += '</div >';
                            popup += '</td>';
                            popup += '</tr>';
                        } else if (inspection.Status__c) {
                            popup += '<td data-label=\"Status\">';
                            popup += '<div class=\"slds-truncate\" title=\"Status\">';
                            popup += '<span class=\"slds-badge\">' + inspection.Status__c + '</span>';
                            popup += '</div >';
                            popup += '</td>';
                            popup += '</tr>';
                        } else {
                            popup += '<td data-label=\"Status\">';
                            popup += '<div class=\"slds-truncate\" title=\"Status\">';
                            popup += '<span class=\"slds-badge\">N/A</span>';
                            popup += '</div >';
                            popup += '</td>';
                            popup += '</tr>';
                        }
    
                    }
            }
            
            popup += '</tbody>';

            popup += '</table>';
            popup += '<br/>';
            popup += "<h2 class=\"requestHeader\"><a class=\"requestBtn\" target=\"_blank\" href=\"https://pneumatech--ptdevfull.sandbox.my.salesforce-sites.com/customer/NewInspectionRequest?wellId=" + wellData[i].Id + "&userId=" + userId + "\"" + ">Request New Inspection</a></h2>";
           



            let wellMarker = L.marker([wellData[i].GPS_Coordinates__Latitude__s, wellData[i].GPS_Coordinates__Longitude__s], {
            icon: markerIcon
            }).bindPopup(popup);
            wellMarker.title = wellData[i].Name;

            markerClusters.addLayer(wellMarker);
            
        }

        map.addLayer(markerClusters);

        cmp.set("v.clusterRef", markerClusters);
    },

    navWell: function (cmp, recordId) {
       //navItem, recordId passes into navInspection event to go to well detail page
        let navEvent = $A.get("e.c:navInspection");
        navEvent.setParams({
            "recordId": recordId,
            "navItem": "Well"
        });
        navEvent.fire();
    },

    findWells: function (cmp, queryTerm) {
        let action = cmp.get("c.searchWells");
        console.log("Querying wells for customer:");
        console.log(cmp.get("v.account"));
        action.setParams({
            accountId: cmp.get("v.account"),
            searchTerm: queryTerm
        });
        action.setCallback(this, function (res) {
            let state = res.getState();
            if (state === "SUCCESS") {
                console.log("Returning the following wells from query: ");
                console.log(res.getReturnValue());
                cmp.set("v.relativeWells", res.getReturnValue());
            } else if (state === "INCOMPLETE") {
                //handle incompletion
            } else if (state === "ERROR") {
                //handle error 
                let errors = res.getError();
                if (errors) {
                    if (errors[0] && errors[0].message) {
                        console.log("Error occurred whenever fetching wells by name: " + errors[0].message);
                    }
                }
            } else {
                console.log("UNKNOWN ERROR OCCURRED WHENEVER FETCHING WELLS BY NAME");
            }
        });

        $A.enqueueAction(action);
    }
})