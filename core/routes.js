import * as award_routes from '../awards/routes.js';
export default function(app)
{
    app.get("/namesTest/", award_routes.namesTest); 
    app.get("/namesBackup/", award_routes.namesBackup); 
}
