"use strict";

//console.log("scanPageJs for " + location);
var __gwt_activeModules2 = {};
if (typeof __gwt_activeModules !== 'undefined') {
    console.log(__gwt_activeModules);
    for (const k in __gwt_activeModules) {
        __gwt_activeModules2[k] = 'superdevmode' in __gwt_activeModules[k] ? true : false;
    }
}

postMessage({
    type: 'gwtActiveModules',
    gwtActiveModules: __gwt_activeModules2
}, origin);
//console.log("scanPageJs for " + location + " posted message");
