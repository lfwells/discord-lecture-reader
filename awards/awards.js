import { getClient } from '../core/client.js';
import * as config from '../core/config.js';
import { guildsCollection } from "../core/database.js";
import { showText } from "../lecture_text/routes.js";
import { pluralize } from '../core/utils.js';
import { send } from '../core/client.js';
import { botRoleHigherThanMemberRole } from '../roles/roles.js';
import { getGuildDocument, getGuildProperty, getGuildPropertyConverted, setGuildProperty } from '../guild/guild.js';
import * as admin from 'firebase-admin';
import { getAwardsData } from './routes.js';

var unified_emoji_ranges = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;//['\ud83c[\udf00-\udfff]','\ud83d[\udc00-\ude4f]','\ud83d[\ude80-\udeff]'];
var reg = new RegExp(unified_emoji_ranges);//.join('|'), 'g');

//giant lindsayys off topic "821597975166976030"
//kit109 IRL off topic "814020643711746068"
export async function handleAwardNicknames(client, offtopiclistschannel)
{  
  if (!(await useLegacyAwardsSystem(offtopiclistschannel.guild))) return await updateAwardPosts(offtopiclistschannel);

  var awardedMembers = {}; 
  
  var messages = await offtopiclistschannel.messages.fetch();
  messages.forEach(message => 
  {
    var content = message.cleanContent;
    content = content.substr(0, content.indexOf("@"));

    var emoji;
    if (content.match(reg)) {
      emoji = content.match(reg)[0];
      //console.log(emoji, emoji.length);
    
      var mentions = message.mentions.members;
      mentions.forEach(member => {
        var key = member.id;//baseName(member.nickname ?? member.user.username);
        //console.log("'",key,"'");
        //console.log(key); 
        //console.log(member.nickname);
        if (awardedMembers[key] == undefined)
        {
          awardedMembers[key] = [];
        }
        if (awardedMembers[key].indexOf(emoji) <= 0)
        {
          awardedMembers[key].push(emoji);
        }
      });
    }
  });
  var guild = offtopiclistschannel.guild;
  for (var memberID in awardedMembers) {
    if (memberID == guild.ownerID) continue; //cannot modify guild owner nickname

    var member = await guild.members.cache.get(memberID);
    var awards = awardedMembers[memberID]; 
    //console.log("awards", awards);
    if (member)
    {
      applyAwardsToNickname(member, awards);
      //console.log("member", baseName(member.nickname ?? member.user.username));
      //setNickname(member, baseName(member.nickname ?? member.user.username)+" "+awards.join(""))
      //this way may look dumb, but we dont want to split the last emoji in two 
      
    }
  }
  return awardedMembers;
}
function applyAwardsToNickname(member, emojiArray)
{
  var newNickname = baseName(member.nickname ?? member.user.username);
  for (var emoji of emojiArray)
  {
    var newLengthAfterAddingEmoji = newNickname.length+emoji.length;
    if (newLengthAfterAddingEmoji < 32)
    {
      newNickname = newNickname + emoji;
    }
    else {
      //console.log(emoji, emoji.length, newNickname.length, newLengthAfterAddingEmoji);
      break;
    }
  }
  setNickname(getClient(), member, newNickname);
}
async function setNickname(client, member, nickname)
{
  //console.log(nickname.length); 
  console.log("Set nickname of", (member.nickname ?? member.user.username), "to", nickname, "(length = " ,nickname.length, ")");

  //we can only set the nickname if the role is lower than us
  if (await botRoleHigherThanMemberRole(member))
  {
    if (!config.getTestMode())
    {
      await member.setNickname(nickname);
    }
  }
}
export function baseName(nickname)
{
  return stripEmoji(nickname); 
  while ((result = reg.exec(nickname)) !== null) {
    return nickname.substr(0, result.index-1).trim();
  }
  return nickname;
}
export function stripEmoji(txt)
{
  return txt.replace(reg, "").trim();
}

export async function isAwardChannelID(fromInChannel)
{
    var channel = await fromInChannel.fetch();
    if (channel.guild == undefined) return false;
    var awardChannelID = await getAwardChannelID(channel.guild.id);
    return channel.id == awardChannelID;
}
export async function getAwardChannelID(forGuildID)
{
  var guildSnapshot = await guildsCollection.doc(forGuildID).get();
  var awardChannelID = await guildSnapshot.get("awardChannelID");
  return awardChannelID;
}
export async function getAwardChannel(guild)
{
  var awardChannelID = await getAwardChannelID(guild.id);
  var awardChannel = await guild.client.channels.cache.get(awardChannelID);
  return awardChannel;
}

export async function getAwardList(guild, member) //optionally get award list for member
{
  if (!(await useLegacyAwardsSystem(guild)))
  {
    if (member) return await getAwardsForMember(member);
    else return await getAwardsDatabase(guild);
  }

  var awards = {};
  var awardChannel = await getAwardChannel(guild);
  var messages = await awardChannel.messages.fetch();
  messages.forEach(award => 
  {
    var emoji = getAwardEmoji(award);
    //check that they have the award
    if (!member || award.mentions.members.has(member.id))
    {
      awards[emoji] = getAwardName(award);
    }
  });
  return awards;
}
//this function will populate the class list with a leaderboard
export async function getAwardListFullData(guild, classList) //optionally get award list for member
{
  var awards = [];
  var awardChannel = await getAwardChannel(guild);
  if (awardChannel == undefined) return [];

  for (var i in classList)
  {
    classList[i].awards = [];
  }

  if (await useLegacyAwardsSystem(guild))
  {
    var messages = await awardChannel.messages.fetch();
    messages.forEach(award => 
    {
      var emoji = getAwardEmoji(award);
      var name = getAwardName(award);
      var awardData = {
        emoji:emoji,
        title:title,
        students:[]
      };
      for (var i in classList)
      {
        var student = classList[i];
        var member = student.member;
        if (member.user && award.mentions.users.has(member.user.id))
        {
          awardData.students.push(student);
          student.awards.push(awardData);
        }
      }
      awards.push(awardData);
    });
  }
  else
  {
    awards = await getAwardsDatabase(guild);
    for (var i in classList)
    {
      var student = classList[i];
      var member = student.member;
      student.awards = await getAwardsForMember(member, awards);
    }
    awards = awards.docs.map(function(award) {
      var d = award.data();
      d.id = d.emoji = award.id;
      return d;
    });
  }
  return awards;
}
export async function getLeaderboard(guild, classList)
{
  await getAwardListFullData(guild, classList);
  classList = classList.sort((a,b) =>  b.awards.length - a.awards.length);
  return classList;
}
export async function getAwardByEmoji(guild, emoji)
{
  if (await useLegacyAwardsSystem(guild))
  {
    var result;
    var awardChannelID = await getAwardChannelID(guild.id);
    var awardChannel = await guild.client.channels.cache.get(awardChannelID);
    var messages = await awardChannel.messages.fetch();
    messages.forEach(award => 
    {
      var thisEmoji = getAwardEmoji(award);
      if (emoji == thisEmoji)
      {
        result = award;
      }
    });
    return result;
  }
  else
  {
    return await getAwardDocument(guild, emoji);
  }
}
export function getAwardEmoji(award)
{
  var content = award.cleanContent;
  var newLinePos = content.indexOf("\n");
  if (newLinePos > 0)
      content = content.substr(0, newLinePos);
  var match = content.match(reg);
  if (match)
  {
    var emoji = match[0];
    return emoji;
  }
  return "";
}
export function getAwardName(award)
{
  var content = award.cleanContent;
  var newLinePos = content.indexOf("\n");
  if (newLinePos > 0)
      content = content.substr(0, newLinePos);
  return content.replace(getAwardEmoji(award), "").trim();
}

export async function giveAward(guild, award, member)
{
  var awardNameForShow;
  var emoji;
  var achievementEmbed = {};
  if (paramIsDoc(award))
  {
    var awardDoc = award;
    var snapshot = await awardDoc.get();
    var earned = snapshot.data()?.earned ?? {};
    earned[member.id] = Date.now();

    await awardDoc.set({
      earned
    }, { merge: true });

    await handleAwardNicknames(getClient(), await getAwardChannel(guild));

    var awardCount = (await getAwardsForMember(member)).length;
    achievementEmbed = {
        title: baseName(member.displayName) + " just earned "+(await getAwardDisplayName(awardDoc))+"!",
        description: "<@"+member.id+"> now has "+pluralize(awardCount, "achievement")+".",
        thumbnail: { 
          url:member.user.displayAvatarURL()
        }
    };

    awardNameForShow = await getAwardDisplayName(awardDoc);
    emoji = awardDoc.id;
  }
  else
  {
    var client = getClient();
    var content = award.content+"\n<@"+member.id+">";
    //found the award, just append the name 
    if (award.author != client.user)
    {
        await award.delete();
        var awardChannel = await getAwardChannel(guild);
        await send(awardChannel, content);
    }
    else
    {
        await award.edit(content);
    }

    var awardCount = Object.keys(await getAwardList(guild, member)).length;
    achievementEmbed = {
      title: baseName(member.displayName) + " just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!",
      description: "<@"+member.id+"> now has "+pluralize(awardCount, "achievement")+".",
      thumbnail: { 
        url:member.user.displayAvatarURL()
      }
    };
    
    awardNameForShow = getAwardName(award);
    emoji = getAwardEmoji(award);
  }

  //console.log(achievementEmbed);
  
  if (awardNameForShow.lastIndexOf("*") > 0)
      awardNameForShow = awardNameForShow.substring(0, awardNameForShow.lastIndexOf("*")).replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "");
  if (awardNameForShow.length > 32)
      awardNameForShow = awardNameForShow.substring(0, 32)+"...";
  showText({ guild: guild }, { text: baseName(member.displayName)+" earned\n"+emoji+" "+awardNameForShow+"!", style:"yikes" });

  return achievementEmbed;

}

//new database-based stuff
function paramIsDoc(emojiOrDoc)
{
  return typeof(emojiOrDoc) !== "string";
}
export async function getAwardsCollection(guild) 
{
  return (await getGuildDocument(guild.id)).collection("awards");
}
export async function getAwardsDatabase(guild) {
  var collection = await getAwardsCollection(guild);
  var awards = await collection.get();
  return awards;
}
export async function getAwardDocument(guild, emoji)
{
  return (await getAwardsCollection(guild)).doc(emoji);
}
async function getAwardData(awardDoc)
{
  var snapshot = await awardDoc.get();
  return snapshot.data();
}
export async function getAwardDisplayName(doc) 
{
  var data = await getAwardData(doc);
  return `${doc.id} ***${data.title}*** -  ${data.description}`;
}
export async function hasAward(awardDoc, member) 
{
  var data = await getAwardData(awardDoc);
  return data.earned != null && data.earned[member.id] != undefined;
}
//note the second param for caching
export async function getAwardsForMember(member, awards) //TODO award count cross-servers
{
  var awards = awards ?? await getAwardsDatabase(member.guild);
  return awards.docs.filter((award) => award.data().earned != null && award.data().earned[member.id] != undefined);
}

export async function getAwardNominationsCount(awardDoc, member) 
{
  var snapshot = await awardDoc.get();
  var nominations = snapshot.data().nominations ?? {};
  return nominations[member.id]?.length ?? 0;
}
export async function nominateForAward(interaction, awardDoc, member, nominatedByMember) 
{
  var nominatedSelf = member.id == interaction.member.id;

  if (!(await getAwardCanNominate(awardDoc, interaction.guild))) return { message: "Nominations have been disabled for this award.", success: false };
  if (await hasAward(awardDoc, member)) return { message: nominatedSelf ? 
      "You already have this award." :
      "This user already has this award.",
    success: false };

  var snapshot = await awardDoc.get();
  var nominations = snapshot.data()?.nominations ?? {};
  if (nominations[member.id] == undefined) nominations[member.id] = [];
  if (nominations[member.id].indexOf(nominatedByMember.id) == -1)
  {
    nominations[member.id].push(nominatedByMember.id);

    await awardDoc.set({
      nominations
    }, { merge: true });
  }
  else
  {
    return { message: nominatedSelf ? 
      "You've already nominated yourself for this award." : 
      "You've already nominated this person for this award.", 
    success: false };
  }

  //now time to check if they have enough nominations
  var nominationsCount = await getAwardNominationsCount(awardDoc, member);
  var requiredCount = await getAwardRequiredNominations(awardDoc, interaction.guild);
  if (nominationsCount >= requiredCount)
  {
    if (await getAwardAutoPop(awardDoc, interaction.guild))
    {
      //note success is false if nominatedSelf, we don't need the "nominated self" popup, I don't think
      return { message: "Nomination recieved. The award has been given automatically as enough nominations have been recieved.", success: nominatedSelf == false, pop: true };
    }
    else
    {
      //TODO: a list of awards with enough nominations
      return { message: "Nomination recieved. This award can't be automatically given out, so admin will verify this nomination and give the award later.", success: true, pop: false };
    }
  }
  else
  {
    return { message: `Nomination recieved. ${pluralize(requiredCount, "nomination")} needed for this award.`, success: true, pop: false };
  }
}

export async function awardExists(awardDoc) {
  if(awardDoc == null) return false;
  return (await awardDoc.get()).exists;
}

export async function getAwardCanNominate(award, guild) {
  return (await getAwardData(award)).canNominate ?? await getGuildProperty("awardsDefaultCanNominate", guild, true);
}
export async function getAwardRequiredNominations(award, guild) {
  return (await getAwardData(award)).requiredNominations ?? await getGuildProperty("awardsDefaultRequiredNominations", guild, 1);
}
export async function getAwardAutoPop(award, guild) {
  return (await getAwardData(award)).autoPop ?? await getGuildProperty("awardsDefaultAutoPop", guild, true);
}

export async function useLegacyAwardsSystem(guild) { 
  return await getGuildProperty("useNewAwardsSystem", guild, false) == false;
}

async function updateAwardPosts(awardChannel)
{
  console.log("\n\nupdateAwardPosts");

  var guild = awardChannel.guild;

  //find the post by saved id, or create it (or if the saved id is invalid, also create it)
  var awardPost = await getGuildProperty("awardPost", awardChannel.guild);
  if (awardPost == undefined)
  {
    awardPost = await awardChannel.send({content: "Loading Awards..."});
    await setGuildProperty(guild, "awardPost", awardPost.id);
  }
  else
  {
    try
    {
      awardPost = await awardChannel.messages.fetch(awardPost);
    }
    catch (DiscordAPIError) 
    {
      awardPost = await awardChannel.send({content: "Loading Awards..."});
      await setGuildProperty(guild, "awardPost", awardPost.id);
    }
  }

  var collection = await getAwardsCollection(guild);
  var awards = await collection.get();
  var currentEmbedIndex = -1;
  var postData = { content:null, embeds: [] };
  for (var i = 0; i < awards.docs.length; i++)
  {
    if (i % 25 == 0) //need a new post every 25 thingys
    {
      postData.embeds.push({
        title: "Awards",
        fields: []
      });
      currentEmbedIndex = postData.embeds.length - 1;
    }

    var data = awards.docs[i].data();
    postData.embeds[currentEmbedIndex].fields.push(getAwardAsField(awards.docs[i].id, data));
  }

  await awardPost.edit(postData);

  //now do the actual nicknames...
  var awardsDB = await getAwardsDatabase(guild);
  for (var member of Array.from(guild.members.cache.values())) {
    if (member.id == guild.ownerID) continue; //cannot modify guild owner nickname

    var awards = await getAwardsForMember(member, awardsDB);
    //console.log("awards", awards);
    if (member)
    {
      applyAwardsToNickname(member, awards.map(award => award.id));   
    }
  }
}

export function getAwardAsField(id, award)
{
  return {
    name: id +" "+ award.title,
    value: award.description,
  }
}