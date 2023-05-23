import { getGuildProperty, getGuildPropertyConverted, GUILD_CACHE } from "../guild/guild.js";
import * as config from "../core/config.js";
import { renderFile } from "ejs";
import { getStats } from "../analytics/analytics.js";
import { getClient } from "../core/client.js";
import { hasRoleID, isAdmin } from "../roles/roles.js";
import { asyncFilter } from "../core/utils.js";

import fs from "fs";
import getStream from "get-stream";
import { parse } from "csv-parse";

export function loadClassList(req,res,next)
{
    return _loadClassList(req,res,next, false);//includeRemoved = false;
}
export function loadClassListWithRemoved(req,res,next)
{
    return _loadClassList(req,res,next, true);//includeRemoved = true;
}
export async function _loadClassList(req,res,next, includeRemoved)  
{
    //TODO: await ready?

    var members = await req.guild.members.cache;//fetch();
    var classList = members.map(m => (
    { 
        member: m,
        discordID: m.id, 
        discordName: m.displayName,
        username: 
            m.displayName.startsWith("Lindsay Wells") ? "lfwells" : 
            m.displayName.startsWith("Ian Lewis") ? "ij_lewis" :
            (m.displayName.match(/\(([^)]+)\)/) ?? []).length > 0 ? m.displayName.match(/\(([^)]+)\)/)[1] : ""
    }));
    
    //add in those with temporary roles, or those who were removed, by checking all posts
    //this takes time due to no cache (currently), so use wisely
    if (includeRemoved)
    {
        var stats = await getStats(req.guild);
        var a = new Set(classList.map(s => s.discordID));
        var b = new Set(Object.keys(stats.membersByID));
        var diff = Array.from(new Set([...b].filter(x=> !a.has(x))));
        await Promise.all(diff.map( async (s) => 
        { 
            var user = await getClient().users.fetch(s);
            classList.push({
                member:user,
                discordID: s,
                discordName: user.username
            });
        }));
    }

    //if a user filter is on, filter the class list
    if (res.locals && res.locals.filterByUser && res.locals.filterByUser() != "" && res.locals.filterByUser() != "__DISCORD_BOT_NONE__")
    {
        classList = classList.filter(m => m.discordID == res.locals.filterByUser());
    }

    //filter out admin
    classList = classList.filter(m => m.discordID != config.SIMPLE_POLL_BOT_ID /*&& m.discordID != config.IAN_ID && m.discordID != config.ROBO_LINDSAY_ID*/);

    //just some specific ian crap here lol, remove lindsay 
    if (req.guild.id != config.KIT109_S2_2021_SERVER && req.guild.id != config.TEST_SERVER_ID)
    {
        classList = classList.filter(m => m.discordID != config.LINDSAY_ID);
    }
    if (res.locals && res.locals.filterByRole && res.locals.filterByRole() != "" && res.locals.filterByRole() != "__DISCORD_BOT_NONE__")
    {
        if (res.locals.filterByRole().startsWith(config.SELECT_FIELD_NONE))
        {
            delete res.locals.filterByRole;
        }
        else
        {
            classList = classList.filter(m => m.member.roles != null && m.member.roles.cache.has(res.locals.filterByRole())); 
            //delete res.locals.current();
            //delete res.locals.includeAdmin();
        }
    }

    if (res.locals && res.locals.includeAdmin && res.locals.includeAdmin() == undefined)
    {
        console.log({includeAdmin:res.locals.includeAdmin()});

        classList = await asyncFilter(classList, async (m) => !(await isAdmin(m.member)) );
    }
    else if (res.locals && res.locals.current)
    {
        delete res.locals.current;
    }

    if (res.locals && res.locals.current && res.locals.current() == "on")
    {
        //delete res.locals.includeAdmin();
        //delete res.locals.filterByRole();

        var studentRoleID = await getGuildProperty("studentRoleID", req.guild, undefined, true);
        if (studentRoleID)
            classList = await asyncFilter(classList, async (m) => await hasRoleID(m.member, studentRoleID) );
            //classList = classList.filter(m => m.member.roles != null && m.member.roles.cache.has(studentRoleID)); 
        //else
            //classList = [];
    }

    req.classList = classList.sort((a,b) => a.discordName.localeCompare(b.discordName));
    res.locals.classList = req.classList;

    if (next != undefined) next(); 
}


//non express version
export async function getClassList(guild, includeRemoved)
{
    var req = { guild:guild };
    var res = { locals: { } };
    var next = ()=> {};
    await loadClassList(req, res, next, includeRemoved);

    return res.locals.classList;
}

export async function filterButtons(req,res,next)
{
    var studentRole = await getGuildPropertyConverted("studentRoleID", req.guild);
    res.locals.current = () => res.locals.query.current ?? req.body.current ?? false;
    res.locals.classListFilterCurrentStudentCheckbox = function()
    {
        if (studentRole)
        {
            return '<label><input type="checkbox" name="current" class="autosubmit" '+(res.locals.current() ? "checked" : "" )+'/> Filter By <b>@'+studentRole.name+'</b> Only</label>'
        }
    };

    var adminRole = await getGuildPropertyConverted("adminRoleID", req.guild);
    res.locals.includeAdmin = () => res.locals.query.includeAdmin ?? req.body.includeAdmin ?? false;
    res.locals.classListFilterAdminCheckbox = function()
    {
        if (adminRole) 
        {
            return '<label><input type="checkbox" name="includeAdmin" class="autosubmit" '+(res.locals.includeAdmin() ? "checked" : "" )+'/> Include <b>@'+adminRole.name+'</b>?</label>'
        }
        return "";
    };

    //TODO: multi select?
    res.locals.filterByRole = () => res.locals.query.filterByRole ?? req.body.filterByRole ?? "";
    var roleList = await renderFile("views/subViews/roleSelect.html", {
        name: "filterByRole",
        id: "filterByRole",
        guild: req.guild,
        className: "autosubmit",
        value: res.locals.filterByRole(),
        selectDefaultText: "- Select -"
    });
    res.locals.classListFilterByRoleList = function()
    {
        return "Filter By Role: "+roleList;
    }

    //TODO: multi select?
    res.locals.filterByUser = () => res.locals.query.filterByUser ?? req.body.filterByUser ?? "";
    var userList = await renderFile("views/subViews/userSelect.html", {
        name: "filterByUser",
        id: "filterByUser",
        guild: req.guild,
        className: "autosubmit",
        value: res.locals.filterByUser(),
        selectDefaultText: "- Select -"
    });
    res.locals.classListFilterByUserList = function()
    {
        return "Filter By User: "+userList;
    }

    var offTopicCategory = await getGuildPropertyConverted("offTopicCategoryID", req.guild, null);
    res.locals.includeOffTopic = () => res.locals.query.includeOffTopic ?? req.body.includeOffTopic ?? false;
    res.locals.classListFilterByOffTopicCheckbox = function()
    {
        if (offTopicCategory)
        {
            return '<label><input type="checkbox" name="includeOffTopic" class="autosubmit" '+((res.locals.includeOffTopic()) ? "checked" : "" )+'/> Include <b>'+offTopicCategory.name+'</b> Posts?</label>';
        }
        return "";
    };

    
    //TODO: multi select?
    res.locals.filterByChannel = () => res.locals.query.filterByChannel ?? req.body.filterByChannel ?? "";
    var channelList = await renderFile("views/subViews/channelSelect.html", {
        name: "filterByChannel",
        id: "filterByChannel",
        guild: req.guild,
        className: "autosubmit",
        value: res.locals.filterByChannel(),
        selectDefaultText: "- Select -"
    });
    res.locals.classListFilterByChannelList = function()
    {
        return "Filter By Channel: "+channelList;
    }
    
    

    res.locals.classlistFilters = function(includePostFilters, method, extraContent)
    {
        var all = '<form method="'+(method ?? "get")+'"><div class="filter">';
        //all += "<span>"+res.locals.classListFilterCurrentStudentCheckbox()+"</span>";
        all += "<span>"+res.locals.classListFilterAdminCheckbox()+"</span>";
        all += "<span>"+res.locals.classListFilterByRoleList()+"</span>";
        all += "<span>"+res.locals.classListFilterByUserList()+"</span>"; 
        if (includePostFilters)
        {
            all += "<span>"+res.locals.classListFilterByChannelList()+"</span>"; 
            all += "<span>"+res.locals.classListFilterByOffTopicCheckbox()+"</span>"; 
        }
        all += "</div>"+(extraContent??"")+"</form>";

        return all;
    }

    next();
}

export async function getUserFilterPredicate(req, res)
{
    var studentRoleID = await getGuildProperty("studentRoleID", req.guild);
    var adminRoleID = await getGuildProperty("adminRoleID", req.guild);
    return async function (user)
    {
        return await filterUserPredicate(user, req, res, studentRoleID, adminRoleID);
    };
}

export async function getPostsFilterPredicate(req, res)
{
    var offTopicCategory = await getGuildPropertyConverted("offTopicCategoryID", req.guild);
    return async function (post)
    {
        return await filterPostPredicate(post, req, res, offTopicCategory);
    };
}

async function filterUserPredicate(user, req, res, studentRoleID, adminRoleID)
{
    var member = await req.guild.members.cache.get(user.author);
    if (member == undefined) return false;

    if (res.locals.current() && res.locals.current() == "on")
    {
        //console.log("did this check current?",member.roles == undefined || member.roles.cache.has(studentRoleID) == false);
        if (member.roles == undefined || member.roles.cache.has(studentRoleID) == false) return false;
    }
    
    if (res.locals.includeAdmin() == false)
    {
        //console.log("did this check admin?",member.roles == undefined || member.roles.cache.has(adminRoleID) == true);
        if (member.roles == undefined || member.roles.cache.has(adminRoleID) == true) return false;
    }

    if (res.locals.filterByRole() && res.locals.filterByRole() != "" && res.locals.filterByRole() != "__DISCORD_BOT_NONE__")
    {
        //console.log("did this check role?",member.roles == undefined || member.roles.cache.has(res.locals.filterByRole()) == false);
        if (member.roles == undefined || member.roles.cache.has(res.locals.filterByRole()) == false) return false;
    }

    if (res.locals.filterByUser() && res.locals.filterByUser() != "" && res.locals.filterByUser() != "__DISCORD_BOT_NONE__")
    {
        //console.log("did this check user?",member.id == (res.locals.filterByUser()) == false);
        if (member.roles == undefined || member.id == (res.locals.filterByUser()) == false) return false;
    }

    return true;
}

async function filterPostPredicate(post, req, res, offTopicCategory)
{
    if (res.locals.includeOffTopic() == false && offTopicCategory)
    {
        if (offTopicCategory.children.some(c => c.id == post.channel)) return false;
    }

    
    if (res.locals.filterByChannel() && res.locals.filterByChannel() != "" && res.locals.filterByChannel() != "__DISCORD_BOT_NONE__")
    {
        if (post.channel != res.locals.filterByChannel()) return false;
    }


    return true;
}

export async function parseCSV(req, fileUpload)
{
    var unenaged = [];
    var content = await readCSVData(fileUpload.tempFilePath);

    //first line is headers
    var headers = content.shift();
    console.log(headers);
    content = content.map(function (row) {
        var obj = {};
        for (var i = 0; i < headers.length; i++)
        {
            obj[headers[i]] = row[i];
        }
        obj["Username"] = obj["Username"].substring(0, obj["Username"].indexOf("@"));
        return obj;
    });

    content.forEach(myLOStudent => {
        var foundOnDiscord = false;
        req.classList.forEach(discordStudent => {
            var username = discordStudent.username;
            if (username && username.toLowerCase() == myLOStudent["Username"].toLowerCase())
            {
                foundOnDiscord = true;
                discordStudent.myLOStudent = myLOStudent;
            }
        });
        if (foundOnDiscord == false)
            unenaged.push(myLOStudent);
    });

    return unenaged;
}
async function readCSVData (filePath) {
    const parseStream = parse({delimiter: ','});
    const data = await getStream.array(fs.createReadStream(filePath).pipe(parseStream));
    return data;
}