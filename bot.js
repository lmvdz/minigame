const tmi = require('tmi.js');
const axios = require('axios');
require('dotenv').config();
// Define configuration options
const { v4: uuidv4 } = require('uuid');
const db = require('./db.js');

function BotOptions(channels, username, password, secure = true) {
  return {
    channels: channels,
    identity: {
      username: username,
      password: password
    },
    connection: {
      secure: secure
    }
  }
}

// 3
function Bot(username, password, secure, channels, connect = true) {
  // Create a client with our options
  this.client = new tmi.client(BotOptions(channels, username, password, secure));
  // setup commands
  this.commands = {
    coach(channel, { issuer, isModOrBroadcaster }, help = false) {
      if (!help) {
        this.client.say(channel, `Unfortunately ${issuer} is uncoachable.`);
      } else {
        this.client.say(channel, `$coach`);
      }
    },
    roll(channel, { issuer, isModOrBroadcaster }, help = false) {
      if (!help)
        this.client.say(channel, `/me rolled a ${this.functions.rollDice()}`);
      else
        this.client.say(channel, `$roll`);
    },
    help(channel, { issuer, isModOrBroadcaster }, help = false) {
      if (!help) {
        this.client.say(channel, `https://lmvdzandebot.herokuapp.com/help`);
      } else {
        this.client.say(channel, `$help`)
      }
    },
    cc(channel, { issuer, isModOrBroadcaster }, help = false) {
      if (isModOrBroadcaster) {
        if (!help) {
          this.client.clear(channel);
          this.client.say(channel, `@${issuer} cleared chat.`);
        } else {
          this.client.say('$cc');
        }
      } else {
        this.commands.nopermission.bind(this)(channel, { issuer, isModOrBroadcaster });
      }
    },
    points(channel, { issuer, amount, target, isModOrBroadcaster }, help = false) {
      if (!help) {
        db.points.get(issuer.toLowerCase() + channel).then(pointsDoc => {
          if (target === null) {
            this.client.say(channel, `@${issuer} has ${pointsDoc.points} points.`);
          } else {
            db.points.get(target.toLowerCase() + channel).then(targetPointsDoc => {
              this.client.say(channel, `@${target} has ${targetPointsDoc.points} points.`);
            }).catch(error => {
              console.error(error);
            });
          }
        }).catch(error => {
          console.error(error);
        });
      } else {
        this.client.say(channel, `$points [username]`)
      }
    },
    give(channel, { issuer, amount, target, isModOrBroadcaster }, help = false) {
      if (!help) {

      } else {
        this.client.say(channel, `$give <all|amount> <username>`);
      }
    },
    agive(channel, { issuer, amount, target, isModOrBroadcaster }, help = false) {
      if (isModOrBroadcaster) {
        if (!help) {

        } else {
          this.client.say(channel, `$agive <all|amount> <username>`);
        }
      } else {
        this.commands.nopermission.bind(this)(channel, { issuer, isModOrBroadcaster });
      }   
    },
    take(channel, { issuer, amount, target, isModOrBroadcaster }, help = false) {
      if (!help) {

      } else {
        this.client.say(channel, `$take <all|amount> <username>`);
      }
    },
    atake(channel, { issuer, amount, target, isModOrBroadcaster }, help = false) {
      if (isModOrBroadcaster) {
        if (!help) {

        } else {
          this.client.say(channel, `$atake <all|amount> <username>`);
        }
      } else {
        this.commands.nopermission.bind(this)(channel, { issuer, isModOrBroadcaster });
      }
    },
    gamble(channel, { issuer, amount, odds, isModOrBroadcaster }, help = false) {
      if (!help) {

      } else {
        this.client.say(channel, `$gamble <all|amount> [odds] --- default odds are 1/2`);
      }
    },
    duel(channel, { instigator, opponent, isModOrBroadcaster }, help = false) {
      if (!help && opponent !== null) {
        if (instigator !== opponent) {
          db.duels.put({ _id: uuidv4().split('-')[2], instigator: instigator, opponent: opponent }).then(duel => {
              this.client.say(channel, `@${instigator} has challenged @${opponent} to a duel! Place bets with '$bet ${duel.id} <wager> <amount>'. @${opponent} '$accept ${duel.id}'.`);
              let amount = 500;
              db.bets.put({
                _id: duel.id, 
                entries: [ { amount: amount, on: instigator.toLowerCase(), placedBy: this.client.getUsername().toLowerCase() } ], 
                instigator: instigator.toLowerCase(), 
                opponent: opponent.toLowerCase()
              }).then(placedBet => {
                this.client.say(channel, `@${this.client.getUsername()} bet ${amount} points on ${duel.id}`);
              }).catch(error => {
                console.error(error);
                console.log(`Bot failed to place a ${amount} point bet on @${instigator} vs @${opponent}`);
              });
          }).catch(error => {
            console.error(error);
            this.client.say(channel, `Failed to create duel.`);
          });
        } else {
          db.points.get(instigator.toLowerCase() + channel).then(pointsDoc => {
            let pointsLost = 500;
            if (pointsDoc.points < pointsLost) {
              pointsLost = pointsDoc.points;
            }
            pointsDoc.points -= pointsLost;
            let pointsRemaining = pointsDoc.points;
            db.points.put(pointsDoc).then(putPoints =>{
              this.client.say(channel, `@${instigator} dueled themself and lost ${pointsLost} points. @${instigator} has ${pointsRemaining} points remaining.`);
            }).catch(error => {
              console.error(error);
            });
          }).catch(error => {
            console.error(error);
          });
        }
      } else {
        this.client.say(channel, `$duel <username>`);
      }
    },
    accept(channel, { issuer, duelId }, help = false) {
      if (!help) {
        db.duels.get(duelId).then(duel => {
          if (duel.opponent === issuer.toLowerCase()) {
            duel.accepted = true;
            db.duels.put(duel).then(putDuel => {
              this.client.say(channel, `@${opponent} accepted duel ${putDuel.id}!`);
              axios.post(`/duel/${putDuel.id}`).then(response => {
                console.log('sent duel post request');
              }).catch(error => {
                console.error(error);
              });
            });
          } else {
            this.client.say(channel, `@${issuer}, you weren't challenged.`);
          }
        }).catch(error => {
          this.client.say(channel, `@${issuer}, duel ${duelId} not found.`);
        })
      } else {
        this.client.say(channel, `$accept <duelID>`);
      }
    },
    ff(channel, { issuer, duelId }, help = false) {
      if (!help) {
         db.duels.get(duelId).then(duel => {
          if (duel.opponent === issuer.toLowerCase() || duel.instigator === issuer.toLowerCase()) {
            if (duel.accepted) {
              duel.forfiet = true;
              duel.forfietedBy = issuer;
              db.duels.put(duel).then(putDuel => {
                this.client.say(channel, `@${opponent} forfieted duel ${putDuel.id}!`);
                axios.post(`/ff/${putDuel.id}`).then(response => {
                  console.log('sent ff post request');
                }).catch(error => {
                  console.error(error);
                });
              });
            } else {
              this.client.say(channel, `@${issuer}, duel hasn't been accepted yet.`);
            }
          } else {
            this.client.say(channel, `@${issuer}, None are brave enough to challenge you.`);
          }
        }).catch(error => {
          this.client.say(channel, `@${issuer}, duel ${duelId} not found.`);
        })
      } else {
        this.client.say(channel, `$ff <duelID> -- forfiet a started duel.`)
      }
    },
    bet(channel, { issuer, duelId, wager, amount }, help = false) {
      if (!help) {
        db.bets.get(duelId).then(bet => {
          let betPlacedOn = bet.opponent === wager ? bet.opponent : bet.instigator;
          let betPlacedAgainst = bet.opponent === wager ? bet.instigator : bet.opponent;
          db.points.get(issuer.toLowerCase() + channel).then( pointsDoc => {
            if (pointsDoc.points >= amount) {
              bet.entries.push({
                amount: amount,
                on: betPlacedOn.toLowerCase(),
                against: betPlacedAgainst.toLowerCase(),
                placedBy: issuer.toLowerCase()
              });
              db.bets.put(bet).then(placedBet => {
                this.client.say(channel, `@${issuer} placed ${amount} on @${betPlacedOn}`);
              }).catch(error => {
                this.client.say(channel, `Failed: place @${issuer}'s bet of ${amount} points.`);
              });
            } else {
              this.client.say(channel, `@${issuer}, you don't have that many points.`);
            }
          }).catch(error => {
            console.error(error);
            console.log(`Failed to find points for ${issuer + channel}`)
          })
        }).catch(error => {
          this.client.say(channel, `Duel '${duelId}' was not found.`);
        });
      } else {
        this.client.say(channel, `Use '$bet ${duelId} <wager> <amount>'. <wager> is the person you're betting on.`);
      }
    },
    nopermission( channel, { issuer, isModOrBroadcaster } ) {
      this.client.say(channel, `You don't have access to that command, @${issuer}`);
    }
  };
  // setup functions
  this.functions = {
    incrementPoints(pointsId) {
      return new Promise(function(resolve, reject) {
        db.points.get(pointsId.toLowerCase()).then(pointsDoc => {
          pointsDoc.points += 1;
          db.points.put(pointsDoc).then(putPoints => {
            resolve(pointsDoc.points);
          }).catch(error => {
            reject(error);
          });
        }).catch(error => {
          db.points.put({ _id: pointsId.toLowerCase(), points: 1000 }).then(function(putPoints) {
            resolve(1000);
          }).catch(error => {
            reject(error);
          });
        });
      });
    },
    onMessageHandler(channel, context, msg, self) {
      // Remove whitespace from chat message
      const trimmedMessage = msg.trim();
      let splitMessage = trimmedMessage.split(' ');
      let isCommand = Array.isArray(splitMessage) ? splitMessage.length >= 1 && splitMessage[0].startsWith('$') : splitMessage.startsWith('$');
      let command = Array.isArray(splitMessage) ? splitMessage[0].replace('$', "") : splitMessage.replace('$', "");
      let commandArgs = Array.isArray(splitMessage) ? splitMessage.splice(1) : '';

      this.functions.incrementPoints(context.username + channel).then((points) => {
        if (self) { return; } // Ignore bot
        // If the command is known, let's execute it
        if (isCommand) {
          let messageToLog = context.username + " " + splitMessage;
          db.logs.get(channel).then(function (log) {
            log.commands.push(messageToLog);
          }).catch(function (error) {
            db.logs.put({ _id: channel, log: { commands: [messageToLog] } }).catch(function (error) {
              console.error(error);
            });
          });
          if (command === 'roll' || command === 'help' || command === 'cc') {
            this.commands[command].bind(this)(
              channel, 
              { 
                issuer: context.username, 
                isModOrBroadcaster: context.mod || context.badges.broadcaster 
              }, 
              Array.isArray(commandArgs) && commandArgs.length > 0 ? commandArgs[0] !== undefined ? commandArgs[0] === 'help' : false : false
            );
          } else if (command === 'points' || command === 'take' || command === 'atake' || command === 'give' || command === 'agive' || command === 'gamble') {
            this.commands[command].bind(this)(
              channel, 
              { 
                issuer: context.username, 
                amount: Array.isArray(commandArgs) ? commandArgs[0] !== undefined ? commandArgs[0] : null : null, 
                target: Array.isArray(commandArgs) ? commandArgs[1] !== undefined ? commandArgs[1].replace('@', '') : commandArgs[0] !== undefined ? commandArgs[0].replace('@', '') : null : null,
                odds: Array.isArray(commandArgs) ? commandArgs[1] !== undefined ? commandArgs[1] : null : null,
                isModOrBroadcaster: context.mod || context.badges.broadcaster 
              }, 
              (Array.isArray(commandArgs) && commandArgs.length > 0 ? (commandArgs[1] !== undefined ? commandArgs[1] === 'help' : (commandArgs[0]  !== undefined ? commandArgs[0] === 'help' : false)) : false)
            );
          } else if (command === 'duel') {
            this.commands[command].bind(this)(
              channel, 
              { 
                instigator: context.username, 
                opponent: Array.isArray(commandArgs) ? commandArgs[0] !== undefined ? commandArgs[0].replace('@', '') : null : null, 
                isModOrBroadcaster: context.mod || context.badges.broadcaster 
              }, 
              Array.isArray(commandArgs) && commandArgs.length > 0 ? commandArgs[0] !== undefined ? commandArgs[0] === 'help' : false : false
            );
          } else if (command === 'bet') {
            this.commands[command].bind(this)(
              channel, 
              { 
                issuer: context.username, 
                duelId: Array.isArray(commandArgs) ? commandArgs[0] !== undefined ? commandArgs[0] : null : null, 
                wager: Array.isArray(commandArgs) ? commandArgs[1] !== undefined ? commandArgs[1].replace('@', '') : null : null, 
                amount: Array.isArray(commandArgs) ? commandArgs[2] !== undefined ? commandArgs[2] : null : null, 
                isModOrBroadcaster: context.mod || context.badges.broadcaster 
              }, 
              Array.isArray(commandArgs) && commandArgs.length > 0 ? commandArgs[0] !== undefined ? commandArgs[0] === 'help' : false : false
            );
          } else if (command === 'accept') {
            this.commands[command].bind(this)(
              channel,
              {
                issuer: context.username,
                duelId: Array.isArray(commandArgs) ? commandArgs[0] !== undefined ? commandArgs[0] : null : null,
              },
              Array.isArray(commandArgs) && commandArgs.length > 0 ? commandArgs[0] !== undefined ? commandArgs[0] === 'help' : false : false
            )
          } else {
            this.commands[command].bind(this)(channel, { issuer: context.username, ...commandArgs });
          }
        }
      }).catch(error => console.error(error));
    },
    onConnectedHandler(addr, port) {
      console.log(`* Connected to ${addr}:${port}`);
    },
    rollDice(){ return Math.floor(Math.random() * 6) + 1 }
  }
  // Register our event handlers (defined below)
  this.client.on('message', this.functions.onMessageHandler.bind(this));
  this.client.on('connected', this.functions.onConnectedHandler.bind(this));
  // Connect to Twitch:
  if(connect) this.client.connect();
}

module.exports = (username, password, secure, channels, connect) => new Bot(username, password, secure, channels, connect);