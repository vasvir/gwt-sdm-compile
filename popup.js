document.addEventListener('DOMContentLoaded', function () {
    console.log("Starting GWT SDM Extension Popup");
    let tab;
    let currentModuleIndex = 0;
    let portOffset = 9876;

    function showError(message) {
        const e = document.getElementById("error");
        e.innerHTML = e.innerHTML + "Error: " + message + "<br>";
        e.style.display = null;
    }

    function getInputHtml(label, id) {
        const lid = label + ":" + id;
        return "<input type='text' class='" + label + "' id='" + lid +  "' name='" + lid + "'>";
    }

    function getCell(label, id, text) {
        const lid = label + ":" + id;
        return "<td id='" + lid + "'>" + text + "</td>";
    }

    function getInputRowContent(module, id, proto) {
        return getCell("module", id, module) + getCell("proto", id, proto) + "<td>" + getInputHtml("host", id) + "</td><td>" + getInputHtml("port", id) + "</td><td><button id='stop:" + id + "'>Stop" + "</button></td>" + "</td><td><button id='compile:" + id + "'>Compile" + "</button></td>";
    }

    // add listeners
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (!sender.tab) {
            showError("Unexpected message from the extension.");
            return;
        }

        if (!message.hasOwnProperty('type') || message.type !== 'gwtActiveModules') {
            showError("Unexpected message type: " + message.type);
            return;
        }

        //console.log("sender: ", sender);
        //console.log("message: ", message);
        //console.log("gwtActiveModules: ", message.gwtActiveModules);
        const table = document.getElementById("list");
        //console.log("table: ", table);
        message.gwtActiveModules.forEach(function(module) {
            console.log("Configuring currentModuleIndex: ", currentModuleIndex + " module: ", module);
            const row = document.createElement('tr');
            row.id = "row:" + sender.frameId;
            row.classList.add("config");
            row.title = (sender.frameId ? "iframe" : "main") + ": " + sender.url;
            const proto = sender.url.split(":")[0];
            row.innerHTML = getInputRowContent(module, sender.frameId, proto);
            //console.log("row: ", row);
            const ports = row.getElementsByClassName("port");
            for (let ie of ports) {
                ie.maxLength = 5;
                ie.size = 4;
            }

            const hosts = row.getElementsByClassName("host");
            // try to find configuration in local storage
            const config_key = module + ":" + proto;
            chrome.storage.local.get(config_key).then(
                function(configs) {
                    const config = configs[config_key] || {};
                    //console.log("configuration: ", config);
                    let host = "localhost";
                    if (config.hasOwnProperty('host') && config.host) {
                        host = config.host;
                    }
                    for (let ie of hosts) {
                        ie.value = host;
                    }
                    let port = portOffset + 2 * currentModuleIndex + (proto === 'https' ? 1 : 0);
                    if (config.hasOwnProperty('port') && config.port) {
                        port = config.port;
                    }
                    for (let ie of ports) {
                        ie.value = "" + port;
                    }
                },
                function(e) {
                    console.error("Error: ", e);
                    showError("Cannot retrieve configuration from local storage.");
                }
            );

            table.append(row);

            document.getElementById("compile:" + sender.frameId).addEventListener('click', function() {
                const module = document.getElementById("module:" + sender.frameId).textContent;
                const proto = document.getElementById("proto:" + sender.frameId).textContent;
                const host = document.getElementById("host:" + sender.frameId).value;
                const port = document.getElementById("port:" + sender.frameId).value;
                const bookmarkletParams = {
                    server_url: proto + "://" + host + ":" + port + "/",
                    module_name: module
                };
                console.log("Compile... " + sender.frameId + " with bookmarkletParams: ", bookmarkletParams);
                chrome.scripting.executeScript({
                    target: {tabId: tab.id, frameIds: [sender.frameId]},
                    args: [bookmarkletParams],
                    func: function(bookmarkletParams) {
                        //console.log("Initializing compile content script for " + location);
                        const script = document.createElement('script');
                        script.src = chrome.runtime.getURL('compile.js');
                        script.onload = function() {
                            //console.log("compilePageJs loaded. Sending bookmarkletParams: ", bookmarkletParams);
                            postMessage(bookmarkletParams, origin);
                            this.remove();
                        };
                        document.head.appendChild(script);
                        //console.log("Finalizing compile content script for " + location);
                    }
                });
            });

            document.getElementById("stop:" + sender.frameId).addEventListener('click', function() {
                console.log("Stopping Dev Mode... " + sender.frameId);
                chrome.scripting.executeScript({
                    target: {tabId: tab.id, frameIds: [sender.frameId]},
                    func: function() {
                        //console.log("Initializing stop content script for " + location);
                        const toRemove = [];
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const key = sessionStorage.key(i);
                            if (key.indexOf('__gwtDevModeHook:') == 0) {
                                //console.log('Found __gwtDevModeHook: ' + key);
                                toRemove.push(key);
                            }
                        }
                        for (let i = 0; i < toRemove.length; i++) {
                            sessionStorage.removeItem(toRemove[i]);
                        }
                        location.reload();
                        //console.log("Finalizing stop content script for " + location);
                    }
                });
            });

            currentModuleIndex++;
            //console.log("Next currentModuleIndex: " + currentModuleIndex);
        });
    });

    document.getElementById("save").addEventListener('click', function() {
        const config = {};
        for (const row of document.querySelectorAll("table#list tr.config")) {
            const module = row.children[0].innerText;
            const proto = row.children[1].innerText;
            const host = row.children[2].children[0].value;
            const port = row.children[3].children[0].value;
            config[module + ":" + proto] = {host: host, port: port};
        }
        console.log("Saving configuration... ", config);
        chrome.storage.local.set(config);
    });

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        tab = tabs[0];
        //console.log("currentTab: " + tab.title);
        chrome.scripting.executeScript({
            target: {tabId: tab.id, allFrames: true},
            func: function() {
                    // content script
                    //console.log("Initializing scan content script for " + location);

                    function messageEventListener(event) {
                        const message = event.data;
                        //console.log('content.js got message: ', message);

                        if (!message.hasOwnProperty('type') || message.type !== 'gwtActiveModules') {
                            console.log("Unexpected message type: ", message);
                            return;
                        }

                        // send it to the extension
                        chrome.runtime.sendMessage(event.data);
                        removeEventListener('message', messageEventListener);
                    }

                    addEventListener('message', messageEventListener);

                    const script = document.createElement('script');
                    script.src = chrome.runtime.getURL('scan.js');
                    script.onload = function() {
                        //console.log("scanPageJs loaded");
                        this.remove();
                    };
                    // console.log(script.textContent);
                    document.head.appendChild(script);
                },
        });
    });
}, false);
