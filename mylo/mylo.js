import { getStudent } from "../student/student.js";
/*
TODO: 
- bot application commands need a cache, and need to basically handle guild == null
- add a Disconnect button to the connected embed
- /mylo disconnect
- do a sample /mylo grades command 
- /mylo status (shows connected or not)
- proactive bot sending dm on joining server if student not connected (and not notified before)

*/

export async function getMyLOConnectedEmbedForInteraction(interaction)
{
    var studentDiscordID = interaction.member.id;
    return await getMyLOConnectedEmbed(studentDiscordID);
}
export async function getMyLOConnectedEmbed(studentDiscordID)
{
    var student = getStudent(studentDiscordID);
    if (student)
    {
        var connectedEmbed = {
            title: "MyLO Account Connected",
            fields: [
                { name: "Student ID", value:student.studentID }
            ],
        };
        return connectedEmbed;
    }
    else
    {
        var notConnectedEmbed = {
            title: "MyLO Account Not Connected",
            description: "We've sent you a DM with a link to connect your account.",
            fields: [],
        };
        return notConnectedEmbed;
    }
}