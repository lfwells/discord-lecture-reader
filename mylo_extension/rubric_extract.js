// Description: 
// This script will extract rubric data from a dropbox and output it as a csv file
//
// Disclaimer:
// This code was written quickly and is not guaranteed to work in all cases.
// This code is provided as-is and is not supported by the author.
// Despite this, this code interacts with rubrics in a read-only manner and should not cause any harm.
//
// Requirements:
// - MyLO Mate Chrome Extension (https://www.utas.edu.au/building-elearning/resources/mylo-mate)
//
// Usage:
// - Navigate to the dropbox (i.e. submissions list) of the assignment you want to get an output for
// - Open chrome inspector, open console tab
// - Paste in all of this code and press enter
//
// Limitations:
// - only works for one rubric per assignment
// - untested on all combinations of rubrics, outcomes, and dropbox settings

const ou = window.location.searchParams.ou;
const dropboxId = window.location.searchParams.db;

const grades = {};

const dropbox = (await api(`/d2l/api/le/1.48/${ou}/dropbox/folders/${dropboxId}`))[0];
const criteria = Object.fromEntries(dropbox.Assessment.Rubrics[0].CriteriaGroups.flatMap(group => group.Criteria).map(c => [c.Id, c.Name]));
console.log({criteria});

let classlist = await api(`/d2l/api/le/1.40/${ou}/classlist/`, { });
classlist = Object.fromEntries(classlist.map(s => [s.Identifier, s]));

const results = await Promise.all(Object.keys(classlist).map(userId => [userId, api(`/d2l/api/le/1.48/${ou}/dropbox/folders/${dropboxId}/feedback/user/${userId}`, {})]));
for (const r of results)
{
    let userId = r[0]
    let feedback = await r[1];
    feedback = feedback.length > 0 ? feedback[0] : null;
    if (feedback)
    {
        feedback = await feedback;
        grades[userId] = ["Username","OrgDefinedId","Email","FirstName","LastName"]
            .reduce((obj2, key) => (obj2[key] = classlist[userId][key], obj2), {});
        grades[userId].Score = feedback.Score

        //now parse the rubric
        let rubric = feedback.RubricAssessments[0];
        if (!rubric) continue;
        for (const outcome of rubric.CriteriaOutcome) {
            const rowID = criteria[outcome.CriterionId];
            const obj = {};
            obj[rowID] = outcome.Score;
            Object.assign(grades[userId], obj);
        }
    }
}

console.log({grades});

//export as csv and auto-download
let csvContent = "data:text/csv;charset=utf-8,";
csvContent += Object.keys(Object.values(grades)[0]).map(s => s.replace(",","").replace("\n"," ").replace("\r", "")).join(",")+"\n";
csvContent += Object.entries(grades).map((kvp) => [].concat(Object.values(kvp[1]))).map(r => r.join(",")).join("\n");

const encodedUri = encodeURI(csvContent);
const a = document.createElement('a');
a.style.display = 'none';
a.href = encodedUri;
// the filename you want
a.download = 'rubric_export.csv';
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(encodedUri);