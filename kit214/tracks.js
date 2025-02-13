import { races, saveTracks, tracks } from "./data.js";
import { nextId, requireXApiKey, resultObject } from "./utils.js";
import { Router } from "express";
import { BASE_URI } from "./utils.js";
import fetch from "node-fetch";


//-------------tracks----------------
export default function() 
{
    var router = Router({ mergeParams: true });

    //guild home page (dashboard)
    router.get("/", getTracks);
    router.get("/scrape", getTracks);//scrapeTracks);
    router.get("/:id", getTrackObj, getTrack);

    router.get("/:id/races", getTrackObj, getTrackRaces);
    router.post("/:id/races", getTrackObj, createRaceFromTrack);
    
    router.post("/", requireXApiKey, handleTrackInput, createTrack);
    router.put("/:id", getTrackObj, requireXApiKey, handleTrackInput, updateTrack);
    router.delete("/:id", getTrackObj, requireXApiKey, deleteTrack);

    return router;
}
function getTrackObj(req,res,next)
{
    var track = tracks.find(d => d.id == req.params.id);
    if (track == null) return resultObject(res, 404, "Track not found");

    req.track = track;
    next();
}
function getTracks(req,res,next)
{
    resultObject(res, 200, tracks);
}
function getTrack(req,res,next)
{
    resultObject(res, 200, req.track);
}
function getTrackRaces(req,res,next)
{
    var r = races.filter(d => d.track == req.track.id);
    resultObject(res, 200, r);
}
async function createRaceFromTrack(req,res,next) 
{
    var url = BASE_URI + "/timing-api/race";
    var createResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': req.get('X-API-Key')
        },
        body: JSON.stringify({
            track: req.track.id
        })
    });
    var createResponse = await createResponse.json();
    resultObject(res, createResponse.code, createResponse.result);
}

function createTrack(req,res,next)
{
    req.track.id = nextId(tracks);
    tracks.push(req.track);
    saveTracks();

    resultObject(res, 200, "Track created");
}
function updateTrack(req,res,next)
{
    var trackIndex = tracks.findIndex(d => d.id == req.params.id);
    if (trackIndex == -1) return resultObject(res, 404, "Track not found");

    req.track.id = req.params.id;
    tracks[trackIndex] = req.track;
    saveTracks();

    resultObject(res, 200, "Track updated");
}
function deleteTrack(req,res,next)
{
    var trackIndex = tracks.findIndex(d => d.id == req.params.id);
    if (trackIndex == -1) return resultObject(res, 404, "Track not found");

    //don't allow a track to be deleted if a race uses it
    var raceWithThisTrack = races.findIndex(d => d.track == req.params.id);
    if (raceWithThisTrack != -1) return resultObject(res, 400, "Track is in use by a race, cannot delete");

    tracks.splice(trackIndex, 1);
    saveTracks();

    resultObject(res, 200, "Track deleted");
}

function handleTrackInput(req,res,next)
{
    var body = req.body;
    if (body == null) return resultObject(res, 400, "Missing body");
    if (body.name == null || body.name == "") return resultObject(res, 400, "Missing name");
    if (body.type == null || body.type == "") return resultObject(res, 400, "Missing type");
    if (body.type != "street" && body.type != "race") return resultObject(res, 400, "Invalid type");
    if (body.baseLapTime == null) return resultObject(res, 400, "Missing baseLapTime");
    body.baseLapTime = parseFloat(body.baseLapTime);
    if (isNaN(body.baseLapTime)) return resultObject(res, 400, "Invalid baseLapTime");
    if (body.laps == null) return resultObject(res, 400, "Missing laps");
    body.laps = parseInt(body.laps);
    if (isNaN(body.laps)) return resultObject(res, 400, "Invalid laps");
    
    req.track = body;
    next();
}

function scrapeTracks(req,res,next)
{
    //unimplemented
    resultObject(res, 405, "Not Implemented");
}
