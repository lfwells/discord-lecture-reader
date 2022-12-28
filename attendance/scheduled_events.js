import moment from "moment";

export async function schedule_test(req,res,next)
{
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

    res.json(result);
}