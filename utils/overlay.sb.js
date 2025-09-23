
const { Bus } = window.overlayKit;
const conn = false;

function setConnection(ok){
    conn = ok;
    Bus.emit('sb:conn', { ok });
 }

 //Connect to Streamer.bot Instance
const client = new StreamerbotClient({
    logLevel: 'debug',
    onConnect: (payload) => {
        console.log('Streamer.bot Instance', payload);
        setConnection(true);
    }
});


// Youtube

// Kick

// Twitch
client.on('Twitch.*', (payload) => {
    // Debug Entire Paylod to console for Developement
    console.log('Twitch Event Received:', payload);

    //Set Payload Type to Variable
    const alertType = payload.event.type;
    //console.log(alertType);

    // Helper functions for data parsing
    // Defines Sub Tier
    function tierLabel (payload){
        if (payload.data.is_prime == true){
            return "Prime";
        }
        switch (payload.data.sub_tier){
            case '1000': return "T1";
            case '2000': return "T2";
            case '3000': return "T3";
            default:     return "null";
        }
    };
    // Parse username path
    function getUsername(payload) {
        return payload.data.user_name
            || payload.data.user.name 
            || payload.data.from_broadcaster_user_name
            || "Unknown";
    };

    function getAdTimer(alertType, payload) {
        if(alertType == "AdRun") {
            return payload.data.length_seconds;
        } else { return null; }
    };

    // Alert Payload Builder
    function buildSub(payload) {
        const tier = tierLabel(payload);
        return {
            version: 1,
            type: alertType,
            user: getUsername(payload),
            tier: tier,
            message: payload.data.text,
            months: payload.data.cumulativeMonths,
            length: getAdTimer(alertType, payload),
            meta: { raw: payload } // Include Raw payload for debugging
        }
    };
    // push events to Bus
    const parsed = buildSub(payload);
    switch (alertType) {
        case "Follow":
            //console.log("User $[alertUser] has followed");
            // Old System
            //pushCard(new AlertCard('Follow', { user: payload.data.user_name, note: 'uplink joined' }));
            Bus.emit('alerts:follow', parsed);
            break;

        case "Raid":
            //pushCard(new AlertCard('Raid', { user: payload.data.from_broadcaster_user_name, viewers: payload.data.viewers }));
            Bus.emit('alerts:raid', parsed);
            break;

        case "Sub":
       /* if (!payload.data.is_prime) {
            switch (payload.data.sub_tier) {
            case "1000":
                //pushCard(new AlertCard('Sub', { user: payload.data.user.name, tier: 'T1', message: payload.data.text }));
                Bus.emit('alerts:subt1', payload);
                break;

            case "2000":
                //pushCard(new AlertCard('Sub', { user: payload.data.user.name, tier: 'T2', message: payload.data.text }));
                Bus.emit('alerts:subt2', payload);
                break;

            case "3000":
                //pushCard(new AlertCard('Sub', { user: payload.data.user.name, tier: 'T3', message: payload.data.text }));
                Bus.emit('alerts:subt3', payload);

                break;
            }
        } else {
            //pushCard(new AlertCard('Prime', { user: payload.data.user.name, message: payload.data.text }));
            Bus.emit('alerts:subPrime', payload);
        }*/
        Bus.emit('alerts:sub', parsed);
        break;

        case "GiftSub":
        //pushCard(new AlertCard('Gift', { user: payload.data.user.name, count: payload.data.cumlativeTotal }));
        Bus.emit('alerts:giftsub', parsed);
        break;

        case "Cheer":
       /* if (!payload.data.anonymous) {
            //pushCard(new AlertCard('Cheer', { user: payload.data.user.name, bits: payload.data.bits }));
            Bus.emit('alerts:bits', payload);
        } else {
            //pushCard(new AlertCard('Cheer', { user: 'Anonymous', bits: payload.data.bits }));
            Bus.emit('alerts:bitsanon', payload);
        }*/
       Bus.emit('alerts:bits', parsed)
        break;

        case "ReSub":
        //pushCard(new AlertCard('ReSub', { user: payload.data.user.name, months: payload.data.cumulativeMonths }));
        Bus.emit('alerts:resub', parsed);
        break;

        case "AdRun":
        //pushCard(new AlertCard('AdRun', { length: payload.data.length_seconds }));
        Bus.emit('ads:start', parsed);
        break;
    }
});