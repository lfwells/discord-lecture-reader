# A slightly-less basic teaching tool for Discord
This node.js app can:
- Read a lecture chat for polls and display in HTML for OBS
- Post saved polls
- Track attendance
- Respond snarkily to those who @ it (later will see if people are @ing ian or lindsay when they are away)

It will hopefullys be so much more ;)

## Installation
Requires node.js

Dependencies

`npm install`

`sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080`

Add bot to your server with invite link
[https://discord.com/api/oauth2/authorize?client_id=811958340967071745&permissions=8&redirect_uri=https%3A%2F%2Fplayur.io&scope=bot]

In the root directory, you will need a token.txt file containing your discord token.
In the root directory, you will need a `users.js` file with the users and passwords. It should look like:
`module.exports = {
    users: { 'username': 'password' },
    challenge: true 
}`

## Usage
`sudo forever start -o out.log -e err.log discord/discord.js`

```
screen -S <process description>	start a session
Ctrl+A Ctrl+D				detach from a session
screen -ls				list sessions
screen -r <process description>	        reattach a session
```

```
npm install pm2 -g
pm2 start discord.js --watch
pm2 monit
```
https://pm2.keymetrics.io/docs/usage/quick-start/#:~:text=Restart%20application%20on%20changes&text=This%20will%20watch%20%26%20restart%20the,check%20for%20restarted%20app%20logs.

You can monitor the log with:
`tail -n 15 -F out.log`

### Triggering a pre-defined poll via URL
Navigate to:

`http://131.217.172.176/guild/<guild_id>/poll/<poll info here>`

e.g.

`http://131.217.172.176/guild/<guild_id>/poll/%22Test%20Scheduled%20Polls%20are%20great?%22%20%22yes%22%20%22no%22%20%22maybe%22`

(if making this link in powerpoint etc, you don't need to write `%20` or `%25` yourself, these are just spaces and double-quotes that will get automatically changed)

Use simple-poll format for polls. See [https://top.gg/bot/simplepoll].

You can clear the poll on this page by clicking the button or navigating to `http://131.217.172.176/guild/<guild_id>/clearpoll`.

Note: for sessions to work, you will need a `sessions` subdirectory with write permissions.

## TODO
For fun: "latest vote: XX for YY" (actually is hard -- unless we do a robo lindsay version)

- a button for enabling/disabling breakout rooms
- a button for clearing a channel, or posting an announcement or all sorts of cool shit


TODO:
- lecturechannel can be set with extra query string junk on end
- fix header to look nicer
- add invites link
- detect when new roles are made / refresh cache on load page
