
const { Bus } = window.overlayKit;
const conn = false;

function setConnection(ok){
    conn = ok;
    Bus.emit('sb:conn', { ok });
 }

// Youtube
// Kick
// Twitch
//Connect to Streamer.bot Instance
const client = new StreamerbotClient({
    logLevel: 'debug',
    onConnect: (payload) => {
        console.log('Streamer.bot Instance', payload);
        setConnection(true);
    }
});

client.on('Twitch.*', (payload) => {
    console.log('Twitch Event Received:', payload);
    //Set Payload Type to Variable
    const alertType = payload.event.type;
    //console.log(alertType);

    switch (alertType) {
        case "Follow":
            //console.log("User $[alertUser] has followed");
            // Old System
            //pushCard(new AlertCard('Follow', { user: payload.data.user_name, note: 'uplink joined' }));
            Bus.emit('alerts:follow', payload);
            break;

        case "Raid":
            //pushCard(new AlertCard('Raid', { user: payload.data.from_broadcaster_user_name, viewers: payload.data.viewers }));
            Bus.emit('alerts:raid', payload);
            break;

        case "Sub":
        if (!payload.data.is_prime) {
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
        }
        break;

        case "GiftSub":
        //pushCard(new AlertCard('Gift', { user: payload.data.user.name, count: payload.data.cumlativeTotal }));
        Bus.emit('alerts:giftsub', payload);
        break;

        case "Cheer":
        if (!payload.data.anonymous) {
            //pushCard(new AlertCard('Cheer', { user: payload.data.user.name, bits: payload.data.bits }));
            Bus.emit('alerts:bits', payload);
        } else {
            //pushCard(new AlertCard('Cheer', { user: 'Anonymous', bits: payload.data.bits }));
            Bus.emit('alerts:bitsanon', payload);
        }
        break;

        case "ReSub":
        //pushCard(new AlertCard('ReSub', { user: payload.data.user.name, months: payload.data.cumulativeMonths }));
        Bus.emit('alerts:resub', payload);
        break;

        case "AdRun":
        //pushCard(new AlertCard('AdRun', { length: payload.data.length_seconds }));
        Bus.emit('alerts:AdRun');
        break;
    }
});