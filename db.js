const PouchDB = require("pouchdb");
module.exports = {
	channels: new PouchDB('clients'),
	duels: new PouchDB('duels'),
	bets: new PouchDB('bets'),
	points: new PouchDB('points'),
	users: new PouchDB('users')
}