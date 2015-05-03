var express = require("express")
, app = express()
, server = require('http').createServer(app)
, WebSocketServer = require('ws').Server
, wss = new WebSocketServer({server: server})
, fs = require('fs');


var k_portnum = process.argv[2] || 7000+Math.floor(2000*Math.random());

var id = 1; // Given out incrementally to room joining clients
// Room list, each with an array of members (socket connections made by clients)
var rooms = {'': []};

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// message handling - functions.called to pass in 'this' (socket) contexts
var callbacks = {};
function registerCallback(name, callback) {
    callbacks[name] = callback;
}

// client messages the server needs to intercept to take action
registerCallback('subscribe', subscribe);
registerCallback('unsubscribe', unsubscribe);
registerCallback('startTime', startTime);



// Note: for all functions used as callbacks, "this" will be a socket passed to the .call()
function subscribe(rm) {
    this.room = rm;
    if (rooms[rm] === undefined){
        console.log("creating rm " + rm);
        rooms[rm] = [this];
    }
    else
        rooms[rm].push(this);

    console.log("subscribe: room = " + rm + ", and the room now has " + rooms[rm].length + " members.");
    roomBroadcast(this.room, this, 'newmember', [this.id]);
    console.log("new subscription to room " + rm);

     sendJSONmsg(this, 'roommembers', (function(){
        var rmids=[];
        for(var i=0;i<rooms[rm].length;i++){
            rmids.push(rooms[rm][i].id);
        }
        return rmids;
    }()));
}


function unsubscribe(rm) {
    var ws = this;
    console.log("unsubscribe from room = " + rm);
    if ((rm != '') && (rm != undefined) && (rooms[rm] != undefined)){
        console.log("Unsubscribe at time="  + Date.now() + ",  with " + rooms[rm].length + " members");
        rooms[rm] = rooms[rm].filter(function (s) {return s !== ws;});
        if ((rooms[rm] != undefined) && (rooms[rm].length===0)){ // if nobody is in the room
            console.log("deleting room " + rm);
            delete rooms[rm];
        }
        room = '';

        console.log(ws.id + " is gone..." );
    }
}


// When  a client sends this message, the server sends out a new time to all room members
function startTime() {
    var JStime = Date.now();
    roomBroadcast(this.room, 0, 'startTime', [JStime]); // 0 sender sends to all members in a room
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
function genericBroadcast(m, data) {
    roomBroadcast(this.room, this, m, data);
}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
function roomBroadcast(room, sender, name, data) {
    if (rooms[room] === undefined)
        return;

    var src = sender ? sender.id : 0;
    //if (sender !== null) console.log(name, 'from', src);
    rooms[room].forEach(function (ws) {
        if (ws !== sender) {
            if (ws.readyState === 1){
                sendJSONmsg(ws, name, data, src);
            } else {
                console.log( "roomBroadcast: ws" + ws + " with ws.id =" + ws.id + " is not in ready state");
            }
        }
    });
}

function sendJSONmsg(ws, name, data, source) {
    ws.send(JSON.stringify({n: name, d: data, s:source}));
}

function receiveJSONmsg(data, flags) {
    var obj;
    try {
        obj = JSON.parse(data);
    } catch (e) {
        return;
    }
    
    if (!obj.hasOwnProperty('d') || !obj.hasOwnProperty('n'))
        return;
    //console.log("object.d: " + object.d + ", object.n:"+ object.n);

    if (callbacks[obj.n]){
        console.log("callback: " + obj.n);
        callbacks[obj.n].call(this, obj.d);
    } else {
        genericBroadcast.call(this, obj.n, obj.d);
    }
}
//****************************************************************************
// Server activity code (other than it's simple message-relay duties)

// Sends a pulse to all members of all rooms at the pulsePeriod
var pulsePeriod=1000;
function emitPulse() {
    var JStime = Date.now();
    var rm;
    for (rm in rooms){
        rooms[rm].forEach(function (ws) {

            if (ws.readyState === 1){
                sendJSONmsg(ws, 'metroPulse', [JStime], 0);
            } else {
                console.log( "pulse: ws" + ws + " with ws.id =" + ws.id + " is not in ready state");
            }
        });
    }
}
setInterval(emitPulse, pulsePeriod);


//****************************************************************************
//app.use(logger("SonicLightSwarm"));
app.use(express.static(__dirname + "/www"));
server.listen(k_portnum);
console.log("Connected and listening on port " + k_portnum);

wss.on('connection', function (ws) {
    ws.id = id++;
    console.log("got a connection at time " + Date.now() + ", assigning ID = " + ws.id);
    ws.on('message', receiveJSONmsg.bind(ws));
    ws.room = '';
    sendJSONmsg(ws, 'init', [ws.id, Date.now()]);

    ws.on('close', function() {        
        callbacks['unsubscribe'].call(ws, ws.room);
    });
});

function getRoomList(){
    rlist=[];
    for (r in rooms){
        if (r==='') continue;
        if(rooms.hasOwnProperty(r)){
            rlist.push(r);
        }
    }
    console.log("getRoomList: " + rlist);
    return rlist;
}

app.get(["/roomList"],function(req, res){
  var jsonObj;
  var jsonList=[];
  console.log("got request for roomlist, so send it")
  res.send({"jsonItems":   getRoomList()  }); // returns an array of room names
});

exports.server = server;

