
require.config({
	paths: {
		"jsaSound": (function(){
			if (! window.document.location.hostname){
				alert("This page cannot be run as a file, but must be served from a server (e.g. animatedsoundworks.com:8001, or localhost:8001)." );
			}
				// hardcoded to read sounds served from jsaSound listening on port 8001 (on the same server as the AnticipatoryScore server is running)
				//var host = "http://"+window.document.location.hostname + ":8001";
				// get sound models from the cloud
				host = "http://"+"animatedsoundworks.com" + ":8001";
				//alert("Will look for sounds served from " + host);
				return (host );
			})()
	}
});
require(
	["mods/comm", "mods/utils", "mods/touch2Mouse",  "soundbank", "agentPlayer", "config", "leadClientConfig"],

	function (comm, utils, touch2Mouse,  soundbank, agentPlayer, config, leadClientConfig) {

		var mouse_down=false;
		var m_agent = agentPlayer();

		leadClientConfig.on("submit", function(){
			// unsubscribe to previous room, join new room
			if (myRoom != undefined) comm.sendJSONmsg("unsubscribe", [myRoom]);
    		myRoom  = leadClientConfig.room;
			if (myRoom != undefined) {
				console.log("leadClientConfig.report: joing a room named " + myRoom); 
				comm.sendJSONmsg("subscribe", [myRoom]);
				// Tell everybody in the room to restart their timers.
				comm.sendJSONmsg("startTime", []);
			} 
		});


		// Button Handlers ----------------------------------------------------------
		var ahButton = window.document.getElementById("ahButton");
		ahButton.onclick=function(){
			if (m_agent!=undefined){
				m_agent=undefined;
			} else{
				m_agent=agentPlayer();
			}
		}

		var playButton = window.document.getElementById("playButton");
		var stopButton = window.document.getElementById("stopButton");

		playButton.onclick=function(){
			console.log("play");
			comm.sendJSONmsg("play", []);
		}

		stopButton.onclick=function(){
			console.log("stop");
			comm.sendJSONmsg("stop", []);
		}
//------------------------------------------------------------------------

        var myrequestAnimationFrame = utils.getRequestAnimationFrameFunc();

		var timeOrigin=Date.now();
		var serverTimeOrigin=0;
		var serverTime=0;
		var myID=0;
		var myRoom=undefined;


		var g_selectModeP = false;
		var m_selectedElement = undefined;

		var m_lastDisplayTick=0;
		var m_tickCount=0;
		var k_timeDisplayElm=window.document.getElementById("timeDisplayDiv");

		var last_mousemove_event={
			"x":0,
			"y":0
		}; // holds the last known position of the mouse over the canvas (easier than getting the position of a mouse that hasn't moved even though the score underneath it has....)

		var k_minLineThickness=1;
		var k_maxLineThickness=16; // actually, max will be k_minLineThickness + k_maxLineThickness



		//---------------------------------------------------------------------------
		// init is called just after a client navigates to the web page
		// 	data[0] is the client number we are assigned by the server.
		comm.registerCallback('init', function(data) {
			//pong.call(this, data[1]);
			myID=data[0];
			console.log("Server acknowledged, assigned me this.id = " + myID);


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
			m_agent && m_agent.reset();
			
			timeOrigin=Date.now();
			serverTimeOrigin=data[0];
			m_lastDisplayTick=0;
		});
		//---------------------------------------------------------------------------
		comm.registerCallback('newmember', function(data, src) {
			console.log("new member : " + src);
		});
		//---------------------------------------------------------------------------
		// src is meaningless since it is this client
		comm.registerCallback('roommembers', function(data, src) {
			if (data.length > 1) 
					console.log("there are other members in this room!");
		});


		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		// Client activity
		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var theCanvas = document.getElementById("score");
		var context = theCanvas.getContext("2d");
		var mouseX;
		var mouseY;

		numXcells=54;
		numYcells=30;
		cellSizeX=theCanvas.width/numXcells;
		cellSizeY=theCanvas.height/numYcells;

		console.log("canvas width = "+ theCanvas.width + ", theCanvas.height = "+ theCanvas.height);

		var m_cell=new Array(numXcells);
		for(var i=0;i<numXcells;i++){
			m_cell[i]=new Array(numYcells);
			for(var j=0;j<numYcells;j++){
				m_cell[i][j]={};
				m_cell[i][j].x=(i*theCanvas.width)/numXcells;
				m_cell[i][j].y=(j*theCanvas.height)/numYcells;
				//console.log("cell["+i+"]["+j+"]  x="+m_cell[i][j].x + ", y="+m_cell[i][j].y);
			}
		}

		var lastDrawTime=0;
		var t_sinceOrigin;


		theCanvas.addEventListener("mousedown", onMouseDown, false);
		theCanvas.addEventListener("mouseup", onMouseUp, false);
		theCanvas.addEventListener("mousemove", onMouseMove, false);

		theCanvas.addEventListener("touchstart", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchmove", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchend", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchcancel", touch2Mouse.touchHandler, true);    


		drawScreen(0);

		var dispElmt;


		function drawCell(cell, b){
			b=Math.max(0,1-b);
			var hx=utils.d2h(Math.floor(255*b));
			context.fillStyle = "#" + hx+"00"+hx;

			context.fillRect(cell.x,cell.y,b*cellSizeX,b*cellSizeY);
		}


		var deg = 0;

		function drawScreen(elapsedtime) {

			context.clearRect(0, 0, 1*theCanvas.width, 1*theCanvas.height);

			var center=last_mousemove_event;
			if (m_agent != undefined){		
				center.x=Math.floor(theCanvas.width*(1+m_agent.x)/2);
				center.y=Math.floor(theCanvas.height*(1+m_agent.y)/2);
				//console.log("center.x="+center.x + ", center.y="+center.y);
			}

			comm.sendJSONmsg("beginGesture", {"d":[[center.x,center.y,0]], "type": "mouseContourGesture", "cont": true});


			for (var i=0;i<numXcells;i++){
				for (var j=0;j<numYcells;j++){
					d=utils.distance(center,m_cell[i][j]);
					drawCell(m_cell[i][j], d/theCanvas.width);
				}
			}


			lastDrawTime=elapsedtime;

		}

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

	
		// Record the time of the mouse event on the scrolling score
		function onMouseDown(e){
			event.preventDefault();
			var m = utils.getCanvasMousePosition(theCanvas, e);

			console.log("mouse down, x= " + m.x + ", y=", + m.y);

			last_mousemove_event=m;
			mouse_down=true;

		}

		function onMouseUp(e){
			var m = utils.getCanvasMousePosition(theCanvas, e);
		}

		function onMouseMove(e){
			if (mouse_down){
				last_mousemove_event=utils.getCanvasMousePosition(theCanvas, e);
				var m = last_mousemove_event;

				comm.sendJSONmsg("contGesture", {"d":[[m.x,m.y,0]]});
			}
		}


		//	++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var t_myMachineTime;
		var t_count=0;
		var timerLoop = function(){

			t_myMachineTime = Date.now();
			t_sinceOrigin = t_myMachineTime-timeOrigin;
			
			drawScreen(t_sinceOrigin);

			m_agent && m_agent.tick(t_sinceOrigin/1000.0);


			//--------------------------------------------------------

			myrequestAnimationFrame(timerLoop);
		};

		timerLoop();  // fire it up


		window.onbeforeunload = function (e) {
			comm.sendJSONmsg("stop", []);
		}

	}
);