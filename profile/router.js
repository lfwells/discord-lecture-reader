import { Router } from "express";
import { load, profile_home, toggle_public_profile } from "./routes.js";
import { isUTASBotAdminCached } from "../core/permissions.js";

async function checkAllowLoadProfile(req,res,next)
{
    //not logged in users must go through the login process
    console.log("req.discord user here 3 =",req.discordUser);
    if (req.discordUser == null)
    {
        res.redirect("/login?path=" + req.originalUrl);
        return;
    }   
    
    //rules:
    // 1. if the user is the profile owner, allow
    // 2. if the profile is public, allow
    // 3. if the user is an admin, allow
    let allow = req.discordUser.id == req.params.discordID || (req.profile.public ?? false) || await isUTASBotAdminCached(req.permissions);
    if (allow)
    {
        next();
        return;
    }

    res.render("profile/accessDenied");
}

export function profileRouter()
{
    var router = Router({ mergeParams: true });

    router.use(load);

    //middleware check that this is one of "our" servers 
    router.use(checkAllowLoadProfile);

    router.get("/", profile_home);
    router.post("/public", toggle_public_profile);

    return router;
}