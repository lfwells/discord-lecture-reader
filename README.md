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

`sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080`

```
npm install pm2 -g
pm2 start ecosystem.config.cjs
pm2 monit
```
https://pm2.keymetrics.io/docs/usage/quick-start/#:~:text=Restart%20application%20on%20changes&text=This%20will%20watch%20%26%20restart%20the,check%20for%20restarted%20app%20logs.

See the built-in user guid for more info on how to use the actual bot.

## Renew SSL
- Set `server.js` to `app.use('/', express.static(path.join(__dirname, 'www')))`
- `pm2 restart all`
- `sudo certbot certonly --force-renew -d utasbot.dev --http-01-port=8080`
- Choose 2 webroot
- Enter webroot `discord/www`
- Change the `server.js` back to   `app.use('/static', express.static(path.join(__dirname, 'www')))`
- `pm2 restart all`