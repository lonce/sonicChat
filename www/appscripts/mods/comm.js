/*  Maps touch events to mouse events.
  To use:
    a) require this module,
    b) [yourObj].addEventListener("touchstart", touch2Mouse.touchHandler, true); 
*/

define(
	[],
	function () {

		var host = document.location.host;
		var ws = new WebSocket('ws://' + host);

		console.log("host is " + host);

		//List of messages we can handle from the server (and other clients via the server)
		var callbacks = {};
		var registerCallback = function (name, callback) {
			callbacks[name] = callback;
		};


		ws.addEventListener('message', function(e){receiveJSONmsg.call(ws, e.data)});

		var receiveJSONmsg = function (data, flags) {
			var obj;
			try {
				obj = JSON.parse(data);
			} catch (e) {
				return;
			}
			//console.log("received message ",  obj);
			// All messages can have 
			//	.n - name of method to call (this is the "message"),
			//	.d - the data payload (methods must know the data they exepct)
			//	.s - an id of the remote client sending the message

			if (!obj.hasOwnProperty('d') || !obj.hasOwnProperty('n') || callbacks[obj.n] === undefined)
				return;
			callbacks[obj.n].call(this, obj.d, obj.s);
		}

		// For sending local client events to the server
		var sendJSONmsg = function (name, data) {
			if (!(ws.readyState===1)){
				console.log("still waiting for connection");
				return;
			}
			console.log("sending data " + data);
			ws.send(JSON.stringify({n: name, d: data}));//, {mask: true});
		};

		return { 
			host: host,
			registerCallback: registerCallback,
			sendJSONmsg: sendJSONmsg
		};
	}
);


