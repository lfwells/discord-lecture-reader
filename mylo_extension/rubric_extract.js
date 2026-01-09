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

const searchParams = new URLSearchParams(window.location.search);
const ou = searchParams.get("ou");
const dropboxId = searchParams.get("db");



    /* eslint-disable no-unused-vars */
    const TimeScale = {
        SECONDS: 1000,
        MINUTES: 1000 * 60,
        HOURS: 1000 * 60 * 60,
    };
    
    const DISABLE_CACHE = false;

    
    
    class APICache {
        constructor(timeUntilStale = 10 * TimeScale.SECONDS) {
        this.ver = 1;
        this.expiry = timeUntilStale;
    
        let resolve;
        let reject;
        let db = null;
    
        this.db = new Promise((res, rej) => {
            if (db != null) {
            res(db);
            } else {
            resolve = res;
            reject = rej;
            }
        });
    
        const createStore = ref => {
            if (!ref.objectStoreNames.contains('cache')) {
            ref.createObjectStore('cache');
            }
        };
    
        const req = indexedDB.open('api-cache', this.ver, createStore);
        req.onsuccess = () => {
            db = req.result;
            db.onerror = err => reject(err);
            resolve(db);
        };
    
        req.onupgradeneeded = e => createStore(e.target.result);
        }
    
        get(key) {
        return new Promise(async res => {
            const db = await this.db;
            const result = db.transaction('cache', 'readonly').objectStore('cache').get(key);
            result.onerror = e => {
            console.error(e);
            res(null);
            };
            result.onsuccess = e => {
            const payload = e.target.result;
            if (payload && Date.now() <= payload.expired) res(payload.value);
            else res(null);
            };
        });
        }
    
        async set(key, value, expiry = this.expiry) {
        const db = await this.db;
        const tx = db.transaction('cache', 'readwrite');
        const store = tx.objectStore('cache');
        const payload = { value, expired: Date.now() + expiry };
        store.put(payload, key);
        return tx.complete;
        }
    }
    
    const db = new APICache();
    
    const SafeURL = url => {
        const parts = url.split('/');
        const file = parts.pop();
        const bits = file.split('?');
        bits[0] = encodeURIComponent(bits[0]);
        return parts.concat(bits.join('?')).join('/');
    };
    const fn = () => {};
    
    const ajax = async (url, { mode = 'GET', token = '', type = 'text', cb = fn } = {}) => {
        const href = SafeURL(url);
        const headers = { method: mode };
        if (token && token.trim().length > 0) {
        headers.headers = { Authorization: `Bearer ${token}` };
        }
    
        const res = await fetch(href, headers).catch(v => null);
        if (res == null) {
        // Something went wrong with the network request.
        console.warn('Error communicating with API endpoint "%s"', url);
        return;
        }
        if (res.ok) {
        const data = type === 'text' ? await res.text() : type === 'blob' ? await res.blob() : await res.json();
        cb(data);
        return data;
        } else {
        return;
        // throw new Error(`${res.status}: ${res.statusText} - ${await res.text()}`);
        }
    };
    
    const APIRequest = (
        url,
        {
        fresh = false,
        first = false,
        token,
        type = 'json',
        passthrough,
        callback = () => {},
        callbackPerLoop = false,
        expiry = 10 * TimeScale.SECONDS,
        cacheOnly = false,
        } = {}
    ) => {
        const page = url =>
        new Promise(async (resolve, reject) => {
            let stack = [];
    
            async function getStack(url, done = fn, bookmark = '') {
            try {
                const href = url + bookmark;
                const cached = await db.get(href);
                let res = null;
    
                const request = async () => {
                try {
                    res = await ajax(href, { token, type });
                    db.set(href, res, expiry);
                } catch (e) {
                    res = null;
                    console.error(e);
                }
                };
    
                if (cacheOnly) {
                res = cached;
                }
    
                // const start = performance.now();
                if (!DISABLE_CACHE && !fresh && cached != null) {
                if (cached.Errors) {
                    await request();
                } else {
                    res = cached;
                }
                } else {
                await request();
                }
    
                // console.log(`Fetched ${href} in ${performance.now() - start}ms`);
                if (!res) {
                done();
                return false;
                } else if (res.Items) {
                stack = stack.concat(res.Items);
                if (callbackPerLoop) callback();
                if (res.PagingInfo && res.PagingInfo.HasMoreItems)
                    getStack(url, done, `${url.includes('?') ? '&' : '?'}bookmark=${res.PagingInfo.Bookmark}`);
                else done();
                } else if (res.Objects) {
                stack = stack.concat(res.Objects);
                if (callbackPerLoop) callback();
                if (res.Next) getStack(res.Next, done);
                else done();
                } else if (res) {
                stack = stack.concat(res);
                if (callbackPerLoop) callback();
                done();
                return true;
                }
            } catch (e) {
                console.error('error');
                reject(e);
            }
            }
            try {
            getStack(url, () => resolve(passthrough ? [stack, passthrough] : stack));
            } catch (e) {
            throw e;
            }
        });
        if (!callbackPerLoop) callback();
        if (first) return page(url).then(e => e[0]);
        else return page(url);
    };
    
    
    // const api = (url, ...params) => APIRequest(url, { ...params });
    const api = APIRequest;

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
