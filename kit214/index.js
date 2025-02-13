import { Router } from "express";
import { drivers, cars, tracks, races, load } from "./data.js";
import bodyParser from "body-parser";
import express  from 'express';
import path from 'path';

import driversRouter from "./drivers.js";
import carsRouter from "./cars.js";
import tracksRouter from "./tracks.js";
import racesRouter from "./races.js";
import { ejs } from "./utils.js";

export default function(app)
{  
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    load();

    const __dirname = path.resolve(); //todo put in export
    app.use('/formula-flutter', express.static(path.join(__dirname, 'formula-flutter')))
    app.use("/kit214", bodyParser.json() ); 
    app.use("/kit214", kit214Router());
}

function kit214Router() 
{
    var router = Router({ mergeParams: true });

    //guild home page (dashboard)
    router.get("/front-end", ejs("index"));
    router.get("/front-end/drivers", ejs("drivers"));
    router.get("/front-end/cars", ejs("cars"));
    router.get("/front-end/tracks", ejs("tracks"));
    router.get("/front-end/race/:id", ejs("race"));

    router.use("/teams-api/driver", driversRouter());
    router.use("/teams-api/car", carsRouter());
    router.use("/timing-api/track", tracksRouter());
    router.use("/timing-api/race", racesRouter());

    return router;
}