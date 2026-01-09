import { beginStreamingRes } from "../core/server.js";
import { scheduleAllSessions } from "./sessions.js";

export async function schedule_test(req,res,next)
{
    /*
    var guild = req.guild;

    var result = await guild.scheduledEvents.create({
        name:"test",
        scheduledStartTime:moment().add(7, 'days').toISOString(),
        description: "description",
        reason: "reason",
        channel: "813152606359650320",
        entityType: "VOICE",
        privacyLevel: "GUILD_ONLY"
    });
    console.log(result);

    res.json(result);*/

    beginStreamingRes(res);

    await scheduleAllSessions(res, req.guild, {
        semester: "sem1_2022",
        types: [
            {
                type:"Lecture",
                weeks:[1,2],//[1,2,3,4,5,6,7,8,9,10,11,12,13],
                day:2, //tuesday
                hour:13,
                minute:0,
                duration:120, //mins
                channelID: "813152606359650320",
                description: "http://google.com", //this one appears on all, above the sub-description (great for zoom links etc)
                descriptions:
                [
                    "Intro",
                    "Game Objects",
                    "Disecting Frogs"
                ]
            },
            {
                type:"Tutorial",
                weeks:[2,3],//[2,3,4,5,6,7,8,9,10,11,12,13],
                day:3, //wednesday
                hour:15,
                minute:0,
                duration:120, //mins
                location: "Cent139" //can also be a zoom link etc
            },
        ]
    });

    res.write("\nDone!");
    res.end();

}