//console.log("scanPageJs for " + location);
postMessage({
    type: 'gwtActiveModules',
    gwtActiveModules: typeof __gwt_activeModules !== 'undefined' ? Object.keys(__gwt_activeModules) : []
}, origin);
//console.log("scanPageJs for " + location + " posted message");
