import { guildsCollection } from "../core/database.js";

async function logAudit(guild, data)
{
    var auditCollection = guildsCollection.doc(guild.id).collection("audit");
    await auditCollection.doc().set(data);
    console.log(data);
}
export default async function(client)
{
    client.on('messageUpdate', async (message, newMessage) => {
        console.log('messageUpdate');
        // Ignore direct messages
        if (!message.guild) return;

        var toLog = {
            type:"edit",
            id: message.id,
            originalAuthor: message.author.id,
            originalContent: message.content,
            newContent: newMessage.content,
            dump: JSON.stringify(message)
        }; 
//console.log(newMessage.content);
        const fetchedLogs = await message.guild.fetchAuditLogs({
            limit: 1,
            type: 'MESSAGE_EDIT',
        });
        // Since there's only 1 audit log entry in this collection, grab the first one
        const deletionLog = fetchedLogs.entries.first();
        // Perform a coherence check to make sure that there's *something*
        if (!deletionLog)
        {
        await logAudit(message.guild, toLog);
          return console.log(`A message by ${message.author.tag} was edited, but no relevant audit logs were found.`);
        }
    
        // Now grab the user object of the person who deleted the message
        // Also grab the target of this action to double-check things
        const { executor, target } = deletionLog;
    
        try
        {
            // Update the output with a bit more information
            // Also run a check to make sure that the log returned was for the same author's message
    //console.log(target);
            if (target.id === message.author.id) {
                toLog.editedBy = executor.id;
                console.log(`A message by ${message.author.tag} was edited by ${executor.tag}.`);
            } else {
                console.log(`A message by ${message.author.tag} was edited, but we don't know by who.`);
            }
        }
        catch (TypeError) { console.log("caught a type error during an audit event", {target}, {author: message.author});}

        await logAudit(message.guild, toLog);
    });

    //these next three:
    https://discordjs.guide/popular-topics/audit-logs.html#some-quick-background

    client.on('messageDelete', async message => {
        // Ignore direct messages
        if (!message.guild) return;

        var toLog = {
            type:"delete",
            id: message.id,
            originalAuthor: message.author.id,
            content: message.content,
            dump: JSON.stringify(message)
        }; 


        const fetchedLogs = await message.guild.fetchAuditLogs({
            limit: 1,
            type: 'MESSAGE_DELETE',
        });
        // Since there's only 1 audit log entry in this collection, grab the first one
        const deletionLog = fetchedLogs.entries.first();
    
        // Perform a coherence check to make sure that there's *something*
        if (!deletionLog) {
            await logAudit(message.guild, toLog);
            return console.log(`A message by ${message.author.tag} was deleted, but no relevant audit logs were found.`);
        }
    
        // Now grab the user object of the person who deleted the message
        // Also grab the target of this action to double-check things
        const { executor, target } = deletionLog;
    
        // Update the output with a bit more information
        // Also run a check to make sure that the log returned was for the same author's message
        if (target.id === message.author.id) {
            toLog.deletedBy = executor.id;
            console.log(`A message by ${message.author.tag} was deleted by ${executor.tag}.`);
        } else {
            console.log(`A message by ${message.author.tag} was deleted, but we don't know by who.`);
        }
        await logAudit(message.guild, toLog);
    });client.on('messageDeleteBulk', async message => {
        // Ignore direct messages
        if (!message.guild) return;

        var toLog = {
            type:"delete",
            id: message.id,
            originalAuthor: message.author.id,
            content: message.content,
            dump: JSON.stringify(message)
        }; 


        const fetchedLogs = await message.guild.fetchAuditLogs({
            limit: 1,
            type: 'MESSAGE_DELETE',
        });
        // Since there's only 1 audit log entry in this collection, grab the first one
        const deletionLog = fetchedLogs.entries.first();
    
        // Perform a coherence check to make sure that there's *something*
        if (!deletionLog) {
            await logAudit(message.guild, toLog);
            return console.log(`A message by ${message.author.tag} was deleted, but no relevant audit logs were found.`);
        }
    
        // Now grab the user object of the person who deleted the message
        // Also grab the target of this action to double-check things
        const { executor, target } = deletionLog;
    
        // Update the output with a bit more information
        // Also run a check to make sure that the log returned was for the same author's message
        if (target.id === message.author.id) {
            toLog.deletedBy = executor.id;
            console.log(`A message by ${message.author.tag} was deleted by ${executor.tag}.`);
        } else {
            console.log(`A message by ${message.author.tag} was deleted, but we don't know by who.`);
        }
        await logAudit(message.guild, toLog);
    });

    client.on('guildMemberRemove', async member => {

        
        var toLog = {
            type:"kick",
            id: member.id,
            dump: JSON.stringify(member)
        }; 

        const fetchedLogs = await member.guild.fetchAuditLogs({
            limit: 1,
            type: 'MEMBER_KICK',
        });
        // Since there's only 1 audit log entry in this collection, grab the first one
        const kickLog = fetchedLogs.entries.first();
    
        // Perform a coherence check to make sure that there's *something*
        if (!kickLog) {
            await logAudit(member.guild, toLog);
            return console.log(`${member.user.tag} left the guild, most likely of their own will.`);
        }
    
        // Now grab the user object of the person who kicked the member
        // Also grab the target of this action to double-check things
        const { executor, target } = kickLog;
    
        // Update the output with a bit more information
        // Also run a check to make sure that the log returned was for the same kicked member
        if (target.id === member.id) {
            toLog.kickedBy = executor.id;
            console.log(`${member.user.tag} left the guild; kicked by ${executor.tag}?`);
        } else {
            console.log(`${member.user.tag} left the guild, audit log fetch was inconclusive.`);
        }
        await logAudit(member.guild, toLog);
    });

    client.on('guildBanAdd', async ban => { //this event doesnt fire...
        var toLog = {
            type:"ban",
            id: ban.id,
            dump: JSON.stringify(ban)
        }; 

        const fetchedLogs = await ban.guild.fetchAuditLogs({
            limit: 1,
            type: 'MEMBER_BAN_ADD',
        });
        // Since there's only 1 audit log entry in this collection, grab the first one
        const banLog = fetchedLogs.entries.first();
    
        // Perform a coherence check to make sure that there's *something*
        if (!banLog) {
            await logAudit(member.guild, toLog);
            return console.log(`${ban.user.tag} was banned from ${ban.guild.name} but no audit log could be found.`);
        } 
    
        // Now grab the user object of the person who banned the member
        // Also grab the target of this action to double-check things
        const { executor, target } = banLog;
    
        // Update the output with a bit more information
        // Also run a check to make sure that the log returned was for the same banned member
        if (target.id === ban.user.id) {
            toLog.banned = executor.id;
            console.log(`${ban.user.tag} got hit with the swift hammer of justice in the guild ${ban.guild.name}, wielded by the mighty ${executor.tag}`);
        } else {
            console.log(`${ban.user.tag} got hit with the swift hammer of justice in the guild ${ban.guild.name}, audit log fetch was inconclusive.`);
        }
        await logAudit(member.guild, toLog);
    });

    client.on('guildMemberLeave ', async member => {
        var toLog = {
            type:"leave",
            id: member.id,
            dump: JSON.stringify(member)
        }; 

        await logAudit(member.guild, toLog);
        return console.log(`${ban.user.tag} left from ${ban.guild.name}.`);
    
    });
}