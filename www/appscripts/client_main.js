/* This application does simple "event chat". Here, events are mouse clicks on a canvas. 
	There is also a metronome tick that comes the server (totally unrelated to the event chat functionality).
	We register for the following messages:
		init - sent by the server after the client connects. Data returned is an id that the server and other clients will use to recognizes messages from this client.
		mouseContourGesture - sent when select chatroom member generates a mouse click. Data is x, y of their mouse position on their canvas.
		metroPulse - sent by the server evdispPxery second to all chatroom members. Data is the server Date.now.
		startTime  - sent when another chatroom member requests a new time origin. Data is the server Date.now.
*/

require.config({
	paths: {
		"jsaSound": (function(){
			if (! window.document.location.hostname){
				alert("This page cannot be run as a file, but must be served from a server (e.g. animatedsoundworks.com:8001, or localhost:8001)." );
			}
				// hardcoded to read sounds served from jsaSound listening on port 8001 (on the same server as the AnticipatoryScore server is running)
				//var host = "http://"+window.document.location.hostname + ":8001";
				// get  models from the cloud
				 host = "http://"+"animatedsoundworks.com" + ":8001";
				//alert("Will look for sounds served from " + host);
				return (host );
			})()
	}
});
require(
	["mods/comm", "mods/utils", "mods/touch2Mouse",  "soundbank",   "slsPlayer/soundPlayer", "config", "clientConfig"],

	function (comm, utils, touch2Mouse,  soundbank,  soundPlayer,  config, clientConfig) {

		var mouse_down=false;
		var isPlayingP=false;

		var k_soundFlag=true;
		        var latitude=0;
		        var longitude=0;
		        var accuracy=0;

		m_soundPlayer = soundPlayer();
		m_soundPlayer.init(250, 1.6);

		clientConfig.on("submit", function(){
			// unsubscribe to previous room, join new room
			if (myRoom != undefined) comm.sendJSONmsg("unsubscribe", [myRoom]);
    		myRoom  = clientConfig.room;
			if (myRoom != undefined) {
				console.log("clientConfig.report: joing a room named " + myRoom); 
				comm.sendJSONmsg("subscribe", [myRoom]);
				// Tell everybody in the room to restart their timers.
				comm.sendJSONmsg("startTime", []);
			} 
		}, {maximumAge:600000, timeout:5000, enableHighAccuracy: false}
		);



        var myrequestAnimationFrame = utils.getRequestAnimationFrameFunc();

		var timeOrigin=Date.now();
		var serverTimeOrigin=0;
		var serverTime=0;
		var myID=0;
		var myRoom=undefined;
		var displayElements = [];  // list of all items to be displayed on the score
		var colorIDMap=[]; // indexed by client ID
		var current_remoteEvent=[]; // indexed by client ID



		var m_lastDisplayTick=0;
		var m_tickCount=0;
		var k_timeDisplayElm=window.document.getElementById("timeDisplayDiv");

		var current_mgesture=undefined;
		var last_mousemove_event; // holds the last known position of the mouse over the canvas (easier than getting the position of a mouse that hasn't moved even though the score underneath it has....)
		var current_mgesture_2send=undefined; // used to send line segments being drawn before they are completed by mouse(finger) up. 

		var lastSendTimeforCurrentEvent=0; 
		var sendCurrentEventInterval=100;  //can't wait till done drawing to send contour segments

		var k_minLineThickness=1;
		var k_maxLineThickness=16; // actually, max will be k_minLineThickness + k_maxLineThickness


		//initialize sound band
		if(config.webkitAudioEnabled){
				soundbank.create(12); // max polyphony 
		}


		var radioSelection = "contour"; // by default

		window.addEventListener("keydown", keyDown, true);

		function keyDown(e){
         		var keyCode = e.keyCode;
         		switch(keyCode){
         			case 83:
         				if (e.ctrlKey==1){
         					//alert("control s was pressed");
         					e.preventDefault();
         					if(config.webkitAudioEnabled){
								soundbank.create(12); // max polyphony 
							}
							
         				}
				}
		}



		//---------------------------------------------------------------------------
		// init is called just after a client navigates to the web page
		// 	data[0] is the client number we are assigned by the server.
		comm.registerCallback('init', function(data) {
			//pong.call(this, data[1]);
			myID=data[0];
			console.log("Server acknowledged, assigned me this.id = " + myID);
			colorIDMap[myID]="#00FF00";

		});
		
		//---------------------------------------------------------------------------
		// data is [timestamp (relative to "now"), x,y] of contGesture, and src is the id of the clicking client
		comm.registerCallback('contGesture', function(data, src) {
			if (data.length === 0) console.log("Got contour event with 0 length data!");

			console.log("got continue gesture with data x=" + data.d[0][0] + ", and y=" + data.d[0][1]);
			m_sls.x=data.d[0][0];
			m_sls.y=data.d[0][1];
	
		});
				//---------------------------------------------------------------------------
		// data is [timestamp (relative to "now"), x,y] of mouseContourGesture, and src is the id of the clicking client
		comm.registerCallback('beginGesture', function(data, src) {
			var fname;

			m_sls.x=data.d[0][0];
			m_sls.y=data.d[0][1];

			//console.log("got begin gesture with data x=" + data.d[0][0] + ", and y=" + data.d[0][1]);

		});


		//---------------------------------------------------------------------------
		comm.registerCallback('metroPulse', function(data, src) {
			serverTime=data;
			// check server elapsed time again client elapsed time
			//console.log("on metropulse, server elapsed time = " + (serverTime-serverTimeOrigin) +  ", and client elapsed = "+ (Date.now() - timeOrigin ));
		});
		//---------------------------------------------------------------------------
		comm.registerCallback('startTime', function(data) {
			console.log("server startTime = " + data[0] );

			clearScore();

			
			timeOrigin=Date.now();
			lastSendTimeforCurrentEvent= -Math.random()*sendCurrentEventInterval; // so time-synched clients don't all send their countour chunks at the same time. 
			serverTimeOrigin=data[0];
			m_lastDisplayTick=0;
			displayElements=[];		

			m_soundPlayer.init(250, 1.6); // because time gets reset
		});
		//---------------------------------------------------------------------------
		// Just make a color for displaying future events from the client with the src ID
		comm.registerCallback('newmember', function(data, src) {
			console.log("new member : " + src);
			colorIDMap[src]=utils.getRandomColor1(100,255,0,120,100,255);

			m_soundPlayer.init(250, 1.6);
		});
		//---------------------------------------------------------------------------
		// src is meaningless since it is this client
		comm.registerCallback('roommembers', function(data, src) {
			if (data.length > 1) 
					console.log("there are other members in this room!");
			for(var i=0; i<data.length;i++){
				if (data[i] != myID){
					colorIDMap[data[i]]=utils.getRandomColor1(100,255,0,120,100,255);
				}
			}
		});

		//----------------------------------------

		comm.registerCallback('play', function(data, src) {
			isPlayingP=true;
			console.log('got play message');
			m_soundPlayer.start();
		});

		//----------------------------------------
		comm.registerCallback('stop', function(data, src) {
			isPlayingP=false;
			console.log('got stop message');
			m_soundPlayer.stop();
		});



		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		// Client activity
		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var theCanvas = document.getElementById("score");
		var context = theCanvas.getContext("2d");
		var mouseX;
		var mouseY;
		context.font="9px Arial";

		var scoreWindowTimeLength=20000; //ms
		var pixelShiftPerMs=1*theCanvas.width/(scoreWindowTimeLength);
		var pxPerSec=pixelShiftPerMs*1000;
		var nowLinePx=1*theCanvas.width/3;
		var pastLinePx=-20; // after which we delete the display elements

		var sprocketHeight=2;
		var sprocketWidth=1;
		var sprocketInterval=1000; //ms

		var numTracks = 1;
		var trackHeight=1*theCanvas.height / numTracks;
		var trackY =[]; // array of y-values (pixels) that devide each track on the score
		for (var i=0;i<numTracks;i++){
			trackY[i]=i*trackHeight;
		}

		var my_pos={
			"x": theCanvas.width/2,
			"y": theCanvas.height/2
		}

		var m_sls={
			"onP": false,
			"x": theCanvas.width/2,
			"y": theCanvas.height/2
		}



		var time2PxOLD=function(time, elapsedTime){ // time measured since timeOrigin
			return nowLinePx+(time-elapsedTime)*pixelShiftPerMs;
		}
		var time2Px=function(time){ // time measured since timeOrigin
			return nowLinePx+(time-t_sinceOrigin)*pixelShiftPerMs;
		}
		var px2Time=function(px){  // relative to the now line
			return (px-nowLinePx)/pixelShiftPerMs;
		}
		var pxTimeSpan=function(px){  //units of ms
			return (px/pixelShiftPerMs);
		}

		var lastDrawTime=0;
		var t_sinceOrigin;
		var nowishP = function(t){
			if ((t > lastDrawTime) && (t <= t_sinceOrigin)) return true;
		}


		theCanvas.addEventListener("mousedown", onMouseDown, false);
		theCanvas.addEventListener("mouseup", onMouseUp, false);
		theCanvas.addEventListener("mousemove", onMouseMove, false);

		theCanvas.addEventListener("touchstart", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchmove", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchend", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchcancel", touch2Mouse.touchHandler, true);    


		drawScreen(0);

		var dispElmt;

		function explosion(x, y, size1, color1, size2, color2) {
			var fs=context.fillStyle;
			var ss = context.strokeStyle;

			context.beginPath();
			context.fillStyle=color1;
			context.arc(x,y,size1,0,2*Math.PI);
			context.closePath();
			context.fill();
									
			context.beginPath();
			context.strokeStyle=color2;
			context.lineWidth = size2;
			context.arc(x,y,size1,0,2*Math.PI);
			context.stroke();
			context.lineWidth = 1;

			context.fillStyle=fs;
			context.strokeStyle=ss;
		}

		function drawPosition(x,y){
			context.strokeStyle = "#00FF00";	
			context.lineWidth =2;			

			context.beginPath();
			context.moveTo(x-3, y-3);
			context.lineTo(x+3, y+3);
			context.moveTo(x-3, y+3);
			context.lineTo(x+3, y-3);
			context.stroke();

		}


function d2h(d) {
  var hex = Number(d).toString(16);
  hex = "00".substr(0, 2 - hex.length) + hex; 
  return hex;
}


		function drawScreen(elapsedtime) {

			context.clearRect(0, 0, 1*theCanvas.width, 1*theCanvas.height);
         		//var capa = document.getElementById("footer");
         		//capa.innerHTML = "latitud: " + latitude + " longitud: " + longitude + "   precisio en metres  :  " + accuracy;  


			var ndistance = Math.sqrt((my_pos.x-m_sls.x)*(my_pos.x-m_sls.x) + (my_pos.y-m_sls.y)*(my_pos.y-m_sls.y))/theCanvas.width;
			
			var ndistance=utils.distance(my_pos, m_sls)/theCanvas.width; // can still be > 1

			m_soundPlayer.tick(elapsedtime,ndistance);

			var brightness=Math.floor(255*(1-Math.min(1,ndistance)));
			//console.log("brightness is " + brightness);

			var hx=d2h(brightness);
			context.fillStyle = "#" + hx+hx+hx;

			//console.log("distance = " + ndistance + ", brightness = " + brightness+ ", and hex = " + context.fillStyle);
			context.fillRect(0,0,theCanvas.width,theCanvas.height);

			drawPosition(my_pos.x, my_pos.y);



			/*
			if (mouse_down){
				explosion(last_mousemove_event.x, last_mousemove_event.y, 4, "white", 6, "red");
			}
			*/

			lastDrawTime=elapsedtime;

		}






//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


		function clearScore(){
			for(dispElmt=displayElements.length-1;dispElmt>=0;dispElmt--){
				displayElements[dispElmt].stopSound();
			}
			current_mgesture=undefined;
			current_mgesture_2send=undefined;
		}

	
		// Record the time of the mouse event on the scrolling score
		function onMouseDown(e){
			event.preventDefault();
			var m = utils.getCanvasMousePosition(theCanvas, e);


			my_pos.x=m.x;
			my_pos.y=m.y;

			mouse_down=true;

			if (k_soundFlag === true){
				m_soundPlayer.playonenote(.4);  // iOS needs to play at least one sound from user input before it will play anything else
				//m_soundPlayer.start();
			}

		}

		function onMouseUp(e){
			var m = utils.getCanvasMousePosition(theCanvas, e);
			my_pos.x=m.x;
			my_pos.y=m.y;
			mouse_down=false;

		}

		function onMouseMove(e){
			var m = utils.getCanvasMousePosition(theCanvas, e);
			if (mouse_down){
				my_pos.x=m.x;
				my_pos.y=m.y;
			}
			last_mousemove_event=m;

		}


		//	++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var t_myMachineTime;
		var t_count=0;
		var timerLoop = function(){

			t_myMachineTime = Date.now();
			t_sinceOrigin = t_myMachineTime-timeOrigin;
			
			drawScreen(t_sinceOrigin);


			//-----------  if an event is in the middle of being drawn, send it every sendCurrentEventInterval
			// send current event data periodically (rather than waiting until it is complete)
			//console.log("time since origin= " + t_sinceOrigin + ", (t_sinceOrigin-lastSendTimeforCurrentEvent) = "+ (t_sinceOrigin-lastSendTimeforCurrentEvent));
			if ((current_mgesture_2send!=undefined) && ((t_sinceOrigin-lastSendTimeforCurrentEvent) > sendCurrentEventInterval)){
				//console.log("tick " + t_sinceOrigin);
				if (myRoom != undefined) {
					//console.log("sending event");
					if (current_mgesture_2send.d.length > 0)
						comm.sendJSONmsg("contGesture", current_mgesture_2send.d);
				}
				current_mgesture_2send.d=[];
 				lastSendTimeforCurrentEvent=t_sinceOrigin;
			}
			
			//--------------------------------------------------------

			myrequestAnimationFrame(timerLoop);
		};

		timerLoop();  // fire it up

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		// callback from html


		window.onbeforeunload = function (e) {
			m_soundPlayer.stop();
			if (myRoom != undefined) comm.sendJSONmsg("unsubscribe", [myRoom]);
		}

	}
);