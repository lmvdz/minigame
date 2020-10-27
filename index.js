const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const axios = require('axios');

const db = require('./db.js');
// Object.keys(db).forEach(database => db[database].destroy());

const Bot = require('./bot.js');
// db.channels.put({ _id: 'lmvdzande', config: { bot: { connect: true }, prefix: '$' }});
var lmvdzandebot;
const REDIRECT_URI= !process.env.PRODUCTION ? "http://localhost:3000/" : 'https://lmvdzandebot.herokuapp.com/'
app.use(bodyparser.json());

app.use(express.static('public'));

const validate = (authorization) => axios.get('https://id.twitch.tv/oauth2/validate', { headers: { 'Authorization': authorization }});
const revoke = (token) => axios.post(`https://id.twitch.tv/oauth2/revoke?client_id=${process.env.CLIENTID}&token=${token}`);
const refresh = (token) => axios.post(`https://id.twitch.tv/oauth2/token?grant_type=refresh_token&refresh_token=${token}&client_id=${process.env.CLIENTID}&client_secret=${process.env.CLIENTSECRET}`);
const client_credentials = () => axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENTID}&client_secret=${process.env.CLIENTSECRET}&grant_type=client_credentials`);
const jwtKey = () => axios.get('https://id.twitch.tv/oauth2/keys');
const oidc_implicit = (req, res) => {
	res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${process.env.CLIENTID}&redirect_uri=${REDIRECT_URI}&response_type=token%20id_token&scope=openid`);
}
let clientCredentials = null;

app.get('/login', (req, res) => oidc_implicit(req, res));

app.get('/', (req, res) => {
	res.sendFile('index.html');
});

app.get('/validate', (req, res) => {
	validate(req.header('Authorization')).then(response => {
		res.status(200).send({ status: 'success' });
	}).catch(error => {
		res.status(401).send(error);
	})
});


app.get('/user', (req, res) => {
	validate(req.header('Authorization')).then(function(response) {
		axios.get(`https://api.twitch.tv/helix/users`, {
			headers: {
				'Authorization': req.header('Authorization'),
				'Client-Id': process.env.CLIENTID
			}
		}).then(function(response) {
			res.send(response.data);
		}).catch(function(error) {
			console.error(error);
		})
	}).catch(function(error) {
		res.redirect('/login');
		console.error(error);
	})
});

app.get('/user/:name', (req, res) => {
	axios.get(`https://api.twitch.tv/helix/users?login=${req.params.name}`, {
		headers: {
			'Authorization': `Bearer ${clientCredentials.access_token}`,
			'Client-Id': process.env.CLIENTID
		}
	}).then(function(response) {
		res.send(response.data);
	}).catch(function(error) {
		console.error(error);
	})
});

/*
 bot connect
 - force recreate the bot with all channels from db.
 - only happens if the bot isn't currently connected to the channel which requested the bot to connect
*/
app.post('/bot/:channel/connect', (req, res) => {
	validate(req.header('Authorization')).then(function(response) {
		if (req.params.channel !== undefined && req.params.channel !== null) {
			if (!lmvdzandebot.client.channels.includes(req.params.channel)) {
				db.channels.allDocs().then(function(result) {
					lmvdzandebot = Bot(process.env.USERNAME, process.env.PASSWORD, true, result.rows.filter(row => row.doc.config.bot.connect).map(row => row.doc._id));
				}).catch(function(error) {
					res.send('failed to connect');
					console.error(error);
				});
			} else {
				res.send('already connected to that channel');
			}
		} else {
			res.send('invalid channel');
		}
	}).catch(function(error) {
		res.redirect('/login');
		console.error(error);
	});
});

app.post('/bot/:channel', (req, res) => {
	validate(req.header('Authorization')).then(function(response) {
		if (req.params.channel !== undefined && req.params.channel !== null && req.params.channel === response.data.login) {
			db.channels.get(req.params.channel).then(function(channel) {
				db.channels.put(req.body).catch(error => console.error(error))
			}).catch(function(error) {
				let channel = { _id: req.params.channel, config: req.body.config || { prefix: '$' } };
				db.channels.put(channel).then(function() {
					res.send(channel);
				}).catch(function(error) {
					res.send('error');
					console.error(error);
				});
			});
		} else {
			res.send('invalid channel');
		}
	}).catch(function(error) {
		res.redirect('/login');
		console.error(error);
	});
});

app.get('/bot/:channel', (req, res) =>  {
	validate(req.header('Authorization')).then(function(response) {
		if (req.params.channel !== undefined && req.params.channel !== null) {
			db.channels.get(req.params.channel).then(function(channel) {
				res.send(channel);
			}).catch(function(error) {
				res.send(null);
			});
		} else {
			res.send('invalid channel');
		}
	}).catch(function(error) {
		res.redirect('/login');
		console.error(error);
	})
})

app.post('/duel', (req, res) =>  {
	validate(req.header('Authorization')).then(function(response) {
		res.send(true);
	}).catch(function(error) {
		res.redirect('/login');
		console.error(error);
	})

	
});

app.post('/ff', (req, res) =>  {
	validate(req.header('Authorization')).then(function(response) {
		res.send(true);
	}).catch(function(error) {
		res.redirect('/login');
		console.error(error);
	})
});

app.get('/bots', (req, res) => {
	validate(req.header('Authorization')).then(function(response) {
		db.channels.allDocs().then(function(result) {
			res.send(result.rows.map(x => x.id));
		}).catch(function(error) {
			console.error(error);
			res.send(error);
		});
	}).catch(function(error) {
		res.redirect('/login');
		console.error(error);
	});
});

app.listen(process.env.PORT, () => { 
	console.log(`listening on port ${process.env.PORT}.`);
	client_credentials().then(response => {
		clientCredentials = response.data;
		lmvdzandebot = Bot(process.env.USERNAME, process.env.PASSWORD, true, [ ]);
	}).catch(error => console.error(error));
});