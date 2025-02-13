import fs from 'fs';
import path from 'path';

export function load()
{
    //read from a file cars.json, if it doesnt exist create it with empty array
    var file = path.resolve("kit214/json/cars.json");
    if (!fs.existsSync(file))
        fs.writeFileSync(file, "[]");
    cars = fs.readFileSync(file);
    cars = JSON.parse(cars);
    

    //read from a file drivers.json, if it doesnt exist create it with empty array
    file = path.resolve("kit214/json/drivers.json");
    if (!fs.existsSync(file))
        fs.writeFileSync(file, "[]");
    drivers = fs.readFileSync(file);
    drivers = JSON.parse(drivers);

    //read from a file tracks.json, if it doesnt exist create it with empty array
    file = path.resolve("kit214/json/tracks.json");
    if (!fs.existsSync(file))
        fs.writeFileSync(file, "[]");
    tracks = fs.readFileSync(file);
    tracks = JSON.parse(tracks);

    //read from a file races.json, if it doesnt exist create it with empty array
    file = path.resolve("kit214/json/races.json");
    if (!fs.existsSync(file))
        fs.writeFileSync(file, "[]");
    races = fs.readFileSync(file);
    races = JSON.parse(races);

    //get all teams apis as an array
    file = path.resolve("kit214/json/all_teams_apis.json");
    if (!fs.existsSync(file))
        fs.writeFileSync(file, "[]");
    all_teams_apis = fs.readFileSync(file);
    all_teams_apis = JSON.parse(all_teams_apis);


    console.log({cars, drivers, tracks, races, all_teams_apis});
}
export function saveCars()
{
    var file = path.resolve("kit214/json/cars.json");
    fs.writeFileSync(file, JSON.stringify(cars));
}
export function saveDrivers()
{
    var file = path.resolve("kit214/json/drivers.json");
    fs.writeFileSync(file, JSON.stringify(drivers));
}
export function saveTracks()
{
    var file = path.resolve("kit214/json/tracks.json");
    fs.writeFileSync(file, JSON.stringify(tracks));
}
export function saveRaces()
{
    var file = path.resolve("kit214/json/races.json");
    fs.writeFileSync(file, JSON.stringify(races));
}

export var cars = [];

export var drivers = [];

export var tracks = [];

export var races = [];

export var all_teams_apis = [];