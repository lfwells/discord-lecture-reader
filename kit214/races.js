import fetch from "node-fetch";
import { races, drivers, tracks, cars, saveRaces } from "./data.js";
import { nextId, resultObject, truncateLapTime } from "./utils.js";
import { Router } from "express";
import { BASE_URI } from "./utils.js";
import { getAllCarsArray } from "./cars.js";

//-------------races----------------
export default function()
{
    var router = Router({ mergeParams: true });

    
    router.get("/createMegaRace", createMegaRace);

    //guild home page (dashboard)
    router.get("/", getRaces);
    router.post("/", createRace);
    router.get("/:id", getRaceObj, getRace);

    router.delete("/:id", getRaceObj, deleteRace);

    router.get("/:id/entrant", getRaceObj, getRaceEntrants);
    router.post("/:id/entrant", getRaceObj, createRaceEntrant);

    router.post("/:id/qualify", getRaceObj, qualify);
    router.post("/:id/lap", getRaceObj, getTrackObjForRace, lap);

    router.get("/:id/leaderboard", getRaceObj, setLeaderboardToCurentLap, getLeaderboard);
    router.get("/:id/lap/:lap", getRaceObj, getLeaderboard);

    return router;
}
function getRaceObj(req,res,next)
{
    var race = races.find(d => d.id == req.params.id);
    if (race == null) return resultObject(res, 404, "Race not found");

    req.race = race;
    next();
}
function getTrackObjForRace(req,res,next)
{
    var trackId = req.race.track;
    console.log({trackId});
    

    var track = tracks.find(d => d.id == trackId);
    if (track == null) return resultObject(res, 404, "Track not found for race");

    req.track = track;
    next();
}
function getRaces(req,res,next)
{
    resultObject(res, 200, races.map(processRaceObj));
}
function getRace(req,res,next)
{
    var race = processRaceObj(races.find(d => d.id == req.params.id));
    if (race == null) return resultObject(res, 404, "Race not found");
    resultObject(res, 200, race);
}
function createRace(req,res,next)
{
    var body = req.body;
    if (body == null) return resultObject(res, 400, "Missing body");
    if (body.track == null) return resultObject(res, 400, "Missing track");

    //auto-append id
    body.id = nextId(races);

    races.push(body);
    saveRaces();
    resultObject(res, 200, "Race added");

    return body.id;
}
function deleteRace(req,res,next)
{
    var raceIndex = races.findIndex(d => d.id == req.params.id);
    if (raceIndex == -1) return resultObject(res, 404, "Race not found");

    races.splice(raceIndex, 1);
    saveRaces();

    resultObject(res, 200, "Race deleted");
}


function getRaceEntrants(req,res,next)
{
    resultObject(res, 200, req.race.entrants ?? []);
}
async function createRaceEntrant(req,res,next)
{
    if (req.race.entrants == null) req.race.entrants = [];

    //check if qualifying has already been done
    if (req.race.startingPositions != null) return resultObject(res, 400, "Qualifying already complete");

    //check if already in list
    if (req.race.entrants.find(d => d == req.body.entrant) != null) return resultObject(res, 400, "Entrant already added");

    //query the car, and if not 200 OK, don't add the car, citing it's error message
    var url = req.body.entrant;
    var carResponse = await fetch(url);
    if (carResponse.status != 200) return resultObject(res, 400, `Car Response was ${carResponse.status} ${carResponse.statusText}`);

    //and if the driver is null, return an error
    var car = await carResponse.json();
    car = car.result;
    if (car.driver == null) return resultObject(res, 400, "Car has no driver");
    var driverNumber = car.driver.number;

    //check all the other cars and get their driver numbers, and if it's a match, return an error
    var driverNumbers = [];
    for (var i = 0; i < req.race.entrants.length; i++)
    {
        var url = req.race.entrants[i];
        var carResponse = await fetch(url);
        var car = await carResponse.json();
        car = car.result;
        var driverResponse = await fetch(car.driver.uri);
        var driver = await driverResponse.json();
        driver = driver.result;
        var number = driver.number;
        driverNumbers.push(number);
    }
    if (driverNumbers.find(d => d == driverNumber) != null) return resultObject(res, 400, "Driver number already in use");

    req.race.entrants.push(req.body.entrant);
    saveRaces();

    resultObject(res, 200, "Entant added");

}
async function qualify(req,res,next)
{
    if (req.race.startingPositions == null) 
    {
        req.race.startingPositions = [];
        for (var i = 0; i < req.race.entrants.length; i++)
        {
            var url = req.race.entrants[i];
            var carResponse = await fetch(url);
            var car = await carResponse.json();
            car = car.result;
            var driverResponse = await fetch(car.driver.uri);
            var driver = await driverResponse.json();
            driver = driver.result;
            var skill = driver.skill;
            req.race.startingPositions[i] = {i, skill};
        }

        //sort by skill then reduce back to the entrant index
        req.race.startingPositions.sort((a,b) => a.skill - b.skill);
        req.race.startingPositions = req.race.startingPositions.map(d => d.i);

        saveRaces();
        resultObject(res, 200, "Qualifying complete");
    }
    else
    {
        resultObject(res, 400, "Qualifying already complete");
    }
}
async function lap(req,res,next)
{
    if (req.race.startingPositions != null) 
    {
        if (req.race.laps == null) req.race.laps = [];

        //if we have hit the total number of laps for this track, return an error
        if (req.race.laps != null && req.race.laps.length >= req.track.laps) return resultObject(res, 400, "Hit maximum laps");

        var lapResult = {number: req.race.laps.length+1, lapTimes:[]};
        for (var i = 0; i < req.race.entrants.length; i++)
        {
            //first check if they have previously crashed
            var crashed = req.race.laps.find(d => d.lapTimes.find(l => l.entrant == i && l.crashed)) != null;
            if (crashed) 
            {
                lapResult.lapTimes.push({entrant:i, time:0, crashed:true});
                continue;
            }

            var lapResponse = await fetch(req.race.entrants[i]+"/lap?trackType="+req.track.type+"&baseLapTime="+req.track.baseLapTime);
            //if the response is anything other than 200just push a 0 time crashed
            if (lapResponse.status != 200)
            {
                lapResult.lapTimes.push({entrant:i, time:0, crashed:true});
                continue;
            }
            var lap = await lapResponse.json();
            lap = lap.result;
            console.log({lap});
            
            lapResult.lapTimes.push({entrant:i, time:lap.crashed ? 0 : truncateLapTime(parseFloat(lap.time)+parseFloat(lap.randomness)), crashed:lap.crashed});
        }
        req.race.laps.push(lapResult);

        saveRaces();
        resultObject(res, 200, "Lap recorded");
    }
    else
    {
        resultObject(res, 400, "Qualifying not complete");
    }
}

function processRaceObj(r)
{
    if (r == null) return null;
    var race = Object.assign({}, r);

    var track = tracks.find(d => d.id == race.track);
    if (track != null) race.track = {name:track.name, uri: BASE_URI + "/timing-api/track/" + track.id};
    else race.track = null;
    return race;
}

function setLeaderboardToCurentLap(req,res,next)
{
    if (req.race.laps == null) return resultObject(res, 400, "No laps recorded");
    var maxLap = req.race.laps.length;
    req.params.lap = maxLap;
    next();
}
async function getLeaderboard(req,res,next)
{
    var laps = req.race.laps;
    if (laps == null) return resultObject(res, 404, "No laps recorded");

    var entrants = []; //store for each one {time, lap count }
    var crashedList = [];
    for (var i = 0; i < req.params.lap; i++)
    {
        laps[i].lapTimes.forEach(lapTime => {
            if (entrants[lapTime.entrant] == null) {
                //time should be equal to the starting position of this entrant
                var time = req.race.startingPositions.indexOf(lapTime.entrant) * 5;
                entrants[lapTime.entrant] = {time:time, laps:0, entrant:lapTime.entrant};
            }
            entrants[lapTime.entrant].time += parseFloat(lapTime.time);
            if (lapTime.crashed)
            {
                if (crashedList.indexOf(lapTime.entrant) == -1) crashedList.push(lapTime.entrant);
            }
            if (crashedList.find(d => d == lapTime.entrant) == null)
            {
                entrants[lapTime.entrant].laps++;
            }
        });
    }
    
    //now sort by lap count, then lap time if equal
    entrants.sort(function(a,b){
        if (a.laps == b.laps) return a.time - b.time;
        return b.laps - a.laps;
    });

    //for each entrant, populate their driver and car
    for (var i = 0; i < entrants.length; i++)
    {
        var carUri = req.race.entrants[entrants[i].entrant];
        var carResponse = await fetch(carUri);
        var car = await carResponse.json();
        car = car.result;
        if (car.driver == null) 
        {
            entrants[i].number = null;
            entrants[i].name = null;
            entrants[i].shortName = null;
            entrants[i].uri = carUri;
            continue;
        }
        var driverResponse = await fetch(car.driver.uri);
        var driver = await driverResponse.json();
        driver = driver.result;
        entrants[i].number = driver.number;
        entrants[i].name = driver.name;
        entrants[i].shortName = driver.shortName;
        entrants[i].uri = carUri;
    }

    resultObject(res, 200, {lap:req.params.lap, entrants});
}

async function createMegaRace(req,res,next)
{
    req.body.track = 16;
    var id = await createRace(req,res,next);
    var race = races.find(d => d.id == id);
    if (race.entrants == undefined || race.entrants == null) race.entrants = [];

    var allDrivers = await getAllCarsArray();
    for (var i = 0; i < allDrivers.length; i++)
    {
        var driver = allDrivers[i];
        var uri = driver.uri;
        race.entrants.push(uri);
    }
    console.log({entrants: race.entrants});

    saveRaces();
}