(() => {
    const { Bus } = window.overlayKit;
    let connected = false;

    function setConnection(ok){
        connected = ok;
        Bus.emit('sb:connected', { ok });
    }

    Bus.addEventListener('sb:ping', () => {
        Bus.emit('sb:connected', { ok: connected });
    });

    //Connect to Streamer.bot Instance
    const client = new StreamerbotClient({
        //logLevel: 'debug',
        onConnect: (payload) => {
            //console.log('Streamer.bot Instance', payload);
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
                return 'Prime';
            }
            switch (payload.data.sub_tier){
                case '1000': return "T1";
                case '2000': return "T2";
                case '3000': return "T3";
                default:     return 'null';
            }
        };
        // Parse username path
        function getUsername(payload) {
            return payload.data.user_name
                || payload.data.user.name 
                || payload.data.from_broadcaster_user_name
                || 'null';
        };

        function getCounts(payload) {
            return payload.data.cumlativeTotal
            || payload.data.bits
            || 'null';
        };

        function getAdTimer(alertType, payload) {
            return payload.data.length_seconds
            || 'null';
        };

        function getUserMessage (payload) {
            return payload.data.text
            || 'null';
        };

        function getMonthsSubbed (payload) {
            return payload.data.cumulativeMonths
            || 'null';
        };

        // Alert Payload Builder
        function buildSub(payload) {
            return {
                version: 1,
                type: alertType,
                user: getUsername(payload),
                tier: tierLabel(payload),
                message: getUserMessage(payload),
                months: getMonthsSubbed(payload),
                count: getCounts(payload),
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
            console.log('SB Parsed Output:', parsed);
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
})();