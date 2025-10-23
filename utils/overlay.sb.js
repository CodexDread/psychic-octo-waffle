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
        //console.log('Twitch Event Received:', payload);

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
                Bus.emit('alerts:follow', parsed);
                break;

            case "Raid":
                Bus.emit('alerts:raid', parsed);
                break;

            case "Sub":
                Bus.emit('alerts:sub', parsed);
            break;

            case "GiftSub":
                Bus.emit('alerts:giftsub', parsed);
            break;

            case "Cheer":
                Bus.emit('alerts:bits', parsed)
            break;

            case "ReSub":
                Bus.emit('alerts:resub', parsed);
            break;

            case "AdRun":
                Bus.emit('ads:start', parsed);
            break;
        }
    });
})();