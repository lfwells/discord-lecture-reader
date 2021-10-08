import { getGuildProperty, getGuildPropertyConverted, GUILD_CACHE } from "../guild/guild.js";
import * as config from "./config.js";
import { renderFile } from "ejs";

export async function loadClassList(req,res,next)  
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

    //filter out admin
    classList = classList.filter(m => m.discordID != config.SIMPLE_POLL_BOT_ID /*&& m.discordID != config.IAN_ID && m.discordID != config.ROBO_LINDSAY_ID*/);

    //just some specific ian crap here lol, remove lindsay 
    if (req.guild.id != config.KIT109_S2_2021_SERVER)
    {
        classList = classList.filter(m => m.discordID != config.LINDSAY_ID);
    }

    if (req.query && req.query.filterByRole)
    {
        if (req.query.filterByRole.startsWith("-"))
        {
            delete req.query.filterByRole;
        }
        else
        {
            classList = classList.filter(m => m.member.roles.cache.has(req.query.filterByRole)); 
            delete req.query.current;
            delete req.query.includeAdmin;
        }
    }
    if (req.query && req.query.includeAdmin == undefined)
    {
        var adminRoleID = await getGuildProperty("adminRoleID", req.guild, undefined, true);
        if (adminRoleID)
            classList = classList.filter(m => m.member.roles.cache.has(adminRoleID) == false); 
    }
    else if (req.query)
    {
        delete req.query.current;
    }

    if (req.query && req.query.current && req.query.current == "on")
    {
        delete req.query.includeAdmin;
        delete req.query.filterByRole;

        var studentRoleID = await getGuildProperty("studentRoleID", req.guild, undefined, true);
        if (studentRoleID)
            classList = classList.filter(m => m.member.roles.cache.has(studentRoleID)); 
        else
            classList = [];
    }

    req.classList = classList.sort((a,b) => a.discordName.localeCompare(b.discordName));
    res.locals.classList = req.classList;
    next(); 

}

//non express version
export async function getClassList(guild)
{
    var req = { guild:guild };
    var res = { locals: { } };
    var next = ()=> {};
    await loadClassList(req, res, next);

    return res.locals.classList;
}

export async function filterButtons(req,res,next)
{
    var studentRole = await getGuildPropertyConverted("studentRoleID", req.guild);
    res.locals.classListFilterCurrentStudentCheckbox = function()
    {
        if (studentRole)
        {
            return '<label><input type="checkbox" name="current" class="autosubmit" '+(res.locals.query.current ? "checked" : "" )+'/> Filter By <b>@'+studentRole.name+'</b> Only</label>'
        }
    };

    var adminRole = await getGuildPropertyConverted("adminRoleID", req.guild);
    res.locals.classListFilterAdminCheckbox = function()
    {
        if (adminRole) 
        {
            return '<label><input type="checkbox" name="includeAdmin" class="autosubmit" '+(res.locals.query.includeAdmin ? "checked" : "" )+'/> Include <b>@'+adminRole.name+'</b>?</label>'
        }
    };

    //TODO: multi select?
    var roleList = await renderFile("views/subViews/roleSelect.html", {
        name: "filterByRole",
        id: "filterByRole",
        guild: req.guild,
        className: "autosubmit",
        value: res.locals.query.filterByRole,
        selectDefaultText: "- Select -"
    });
    res.locals.classListFilterByRoleList = function()
    {
        return "Filter By Role: "+roleList;
    }

    res.locals.classlistFilters = function()
    {
        var all = '<form method="get"><div class="filter">';
        //all += "<span>"+res.locals.classListFilterCurrentStudentCheckbox()+"</span>";
        all += "<span>"+res.locals.classListFilterAdminCheckbox()+"</span>";
        all += "<span>"+res.locals.classListFilterByRoleList()+"</span>";
        all += "</div></form>";

        return all;
    }

    next();
}

export async function getFilterPredicate(req)
{
    var studentRoleID = await getGuildProperty("studentRoleID", req.guild);
    var adminRoleID = await getGuildProperty("adminRoleID", req.guild);
    return async function (user)
    {
        var member = await req.guild.members.cache.get(user.author);
        if (member == undefined) return false;

        if (req.query.current && req.query.current == "on")
            if (member.roles == undefined || member.roles.cache.has(studentRoleID) == false) return false;
        
        if (req.query.includeAdmin == undefined)
            if (member.roles == undefined || member.roles.cache.has(adminRoleID) == true) return false;

        if (req.query.filterByRole)
            if (member.roles == undefined || member.roles.cache.has(req.query.filterByRole) == false) return false;

        return true;
    };
}