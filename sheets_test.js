import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";

var sheets;
var drive;
export async function init_google()
{
    // If modifying these scopes, delete token.json.
    const SCOPES = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ];
    const auth = new GoogleAuth({
        keyFile: 'carers-care-service-account.json',
        scopes: SCOPES
    });

    // set auth as a global default
    google.options({
        auth: auth
    });
    sheets = google.sheets({version: 'v4', auth});
    drive = google.drive('v3');

    console.log("init google sheets");
}


export async function sheets_test(req,res,next)
{
    /*
    const resource = {
        properties: {
          title:"test",
        },
      };
     var spreadsheet = await sheets.spreadsheets.create({
        resource,
        fields: 'spreadsheetId',
      });
      var spreadsheetId = spreadsheet.data.spreadsheetId;
      console.log(spreadsheet);*/
      var spreadsheetId = "10ap_ObmCnHFdHuNBYDq8lQO7K6awsfVBrZzjIV4nQ3k";
        console.log(`Spreadsheet ID: ${spreadsheetId}`);
        var permission = 
            {
              'type': 'user',
              'role': 'writer',
              'emailAddress': 'mickayrex@gmail.com'
            }
          ;
       var result = await drive.permissions.create({
            resource: permission,
            fileId: spreadsheetId,
            fields: 'id',
          });
          console.log(result);
        
          //test out some writing
          let values = [
            [
              "a", "b","c"
            ],
            // Additional rows ...
          ];
          const resource2 = {
            values,
          };
          var range = "A1";
          var writeResult = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption:'USER_ENTERED', resource:resource2});

    res.json({done:true, spreadsheet:spreadsheet, writeResult:writeResult});
}