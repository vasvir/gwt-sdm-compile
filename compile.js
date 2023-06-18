function messageEventListener(event) {
    const message = event.data;
    //console.log('content.js got message: ', message);

    if (!message.hasOwnProperty('server_url') || !message.hasOwnProperty('module_name')) {
        console.error("Unexpected message type: ", message);
        return;
    }

    //console.log("removing listener from compilePageJs");
    removeEventListener('message', messageEventListener);

    __gwt_bookmarklet_params = message;
    const script = document.createElement("script");
    script.src = message.server_url + "dev_mode_on.js";
    document.head.appendChild(script);
}

//console.log("compilePageJs for " + location);
addEventListener('message', messageEventListener);
//console.log("compilePageJs for " + location + " received message");
