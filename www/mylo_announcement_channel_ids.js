const MYLO_UNIT_ORGS_TO_DISCORD_SERVERS = {

    //KIT109 Semester 2 2024
    "674786": "1257333713528950855",

    //KIT214 Semester 2 2024
    "641208": "1257333482028535935"
};

function getDiscordServerID()
{
    if (typeof(DISCORD_CHANNEL_ID) !== "undefined") return DISCORD_CHANNEL_ID;


    let url = window.top.document.location.href.replace("d2l", "");
    //extract numbers from the url
    let orgID = url.match(/\d+/g);
    orgID = orgID ? orgID[0] : null;

    if (MYLO_UNIT_ORGS_TO_DISCORD_SERVERS[orgID])
    {
        return MYLO_UNIT_ORGS_TO_DISCORD_SERVERS[orgID];
    }
    return "";
}
