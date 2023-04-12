import { Router } from "express";
import { load, profile_home } from "./routes.js";

async function checkAllowLoadProfile(req,res,next)
{
    let allow = true;
    if (allow)
    {
        next();
        return;
    }

    res.render("accessDenied");
}

export function profileRouter()
{
    var router = Router({ mergeParams: true });

    router.use(load);

    //middleware check that this is one of "our" servers 
    router.use(checkAllowLoadProfile);

    router.get("/", profile_home);

    return router;
}