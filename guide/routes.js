import { beginStreamingRes } from "../core/server.js";

export async function postRules(req,res,next)
{
    beginStreamingRes(res);

    res.write("post rules!");

    res.end();
}