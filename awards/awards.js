import { getClient } from '../core/client.js';
import * as config from '../core/config.js';
import { guildsCollection } from "../core/database.js";
import { showText } from "../lecture_text/routes.js";
import { pluralize } from '../core/utils.js';
import { send } from '../core/client.js';

var unified_emoji_ranges = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;//['\ud83c[\udf00-\udfff]','\ud83d[\udc00-\ude4f]','\ud83d[\ude80-\udeff]'];
var reg = new RegExp(unified_emoji_ranges);//.join('|'), 'g');

//giant lindsayys off topic "821597975166976030"
//kit109 IRL off topic "814020643711746068"
export async function handleAwardNicknames(client, offtopiclistschannel)
{  
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
      console.log("member", baseName(member.nickname ?? member.user.username));
      //setNickname(member, baseName(member.nickname ?? member.user.username)+" "+awards.join(""))
      //this way may look dumb, but we dont want to split the last emoji in two 
      var newNickname = baseName(member.nickname ?? member.user.username);
      for (var a in awards)
      {
        var emoji = awards[a];
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
      setNickname(client, member, newNickname);
    }
  }
  return awardedMembers;
}
async function setNickname(client, member, nickname)
{
  //console.log(nickname.length); 
  console.log("Set nickname of", (member.nickname ?? member.user.username), "to", nickname, "(length = " ,nickname.length, ")");
  //we can only set the nickname if the role is lower than us
  var us = await member.guild.members.cache.get(client.user.id);
  var ourHighestRole = us.roles.highest;
  var theirHighestRole = member.roles.highest;
  if (ourHighestRole.position >= theirHighestRole.position)
  {
    if (!config.getTestMode())
    {
      await member.setNickname(nickname);
    }
  }
}
export function baseName(nickname)
{
  return nickname.replace(reg, "").trim(); 
  while ((result = reg.exec(nickname)) !== null) {
    return nickname.substr(0, result.index-1).trim();
  }
  return nickname;
}

export async function isAwardChannelID(fromInChannel)
{
    var channel = await fromInChannel.fetch();
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
  var awards = {};
  var awardChannel = await getAwardChannel(guild);
  var messages = await awardChannel.messages.fetch();
  messages.forEach(award => 
  {
    var emoji = getAwardEmoji(award);
    //check that they have the award
    if (!member || award.mentions.users.has(member.user.id))
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

  var messages = await awardChannel.messages.fetch();
  messages.forEach(award => 
  {
    var emoji = getAwardEmoji(award);
    var name = getAwardName(award);
    var awardData = {
      emoji:emoji,
      name:name,
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
  var awardNameForShow = getAwardName(award);
  if (awardNameForShow.lastIndexOf("*") > 0)
      awardNameForShow = awardNameForShow.substring(0, awardNameForShow.lastIndexOf("*")).replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "").replace("*", "");
  if (awardNameForShow.length > 32)
      awardNameForShow = awardNameForShow.substring(0, 32)+"...";
  showText({ guild: guild }, { text: baseName(member.displayName)+" earned\n"+getAwardEmoji(award)+" "+awardNameForShow+"!", style:"yikes" });

  var achievementEmbed = {
      title: baseName(member.displayName) + " just earned "+getAwardEmoji(award)+" "+getAwardName(award)+"!",
      description: "<@"+member.id+"> now has "+pluralize(awardCount, "achievement")+".",
      thumbnail: { 
        url:member.user.displayAvatarURL()
      }
  };
  console.log(achievementEmbed);

  return achievementEmbed;

}