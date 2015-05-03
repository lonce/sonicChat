/*  Mapps touch events to mouse events.
Just include this file in a require module, no need to call anything. 
*/
require.config({
});
define(
  ["jsaSound/jsaModels/jsaMp3", "mods/gateKeeperFactory", "mods/utils"],
  function(sndFactory, loadGateFactory, utils){

    // object to be returned by this module
    var uconfig = {
      "player": undefined,
      "room": undefined,
      "gatekey": (gateKeeperFactory(["resourceLoaded"], // after all keys are set(), function will execute
          function(){
            // replace "loading" with "All ready" and make the submit button available
            legend.innerHTML = uconfig.room + ": All loaded and ready to go!";
            inner_div.appendChild(submit_btn);
          })),
      "report": function(){}
    };


    var msgbox = document.getElementById("msg");
    var overlay_div = document.createElement("div");
      overlay_div.id = "overlay";
    var inner_div = document.createElement("div");
    var button_close = document.createElement("button");
    var submit_btn = document.createElement("input");
      submit_btn.type = "button";
      submit_btn.className = "submit";
      submit_btn.value = "Submit";
    var legend = document.createElement("legend");
 

    // The real reason for this sound is that Apple devices require a user-initiated sound before the program can generate sound on its own
    var okSound=sndFactory();
    
    //uconfig.report = function(c_id) {
      button_close.id = "upprev_close";
      button_close.innerHTML = "x";
      button_close.onclick = function () {
          var element = document.getElementById('overlay');
          element.parentNode.removeChild(element);
      };
      inner_div.appendChild(button_close);
   
      legend.id="legend";
      legend.innerHTML = "Performance <br> Loading ...";
      inner_div.appendChild(legend);

      utils.getJSON("/roomList", function(data){
          if (data.jsonItems.length > 0){
            uconfig.room=data.jsonItems[0]; // There will be either none or 1, depending on whether "conductor" client is running
          } else{
           alert("Sorry - there is no performance to connect to.<br> Try reloading page.");           
          }
          return;
        }, function (e){alert("some kind of room server error " + e);});

    // This is a click sound which get the iOs sound flowing
    okSound.on("resourceLoaded",  function(){
      uconfig.gatekey.set("resourceLoaded");
    });
    okSound.setParam("Sound URL", "resources/click.mp3");


/*
      var buttTimer=setTimeout(function(){
        console.log("autoclick submit button");
        submit_btn.click()}, 3000);
*/

      submit_btn.onclick = function () {
          //if (buttTimer) {clearTimeout(buttTimer);}
          //var checked = false, formElems = this.parentNode.getElementsByTagName('input');

          //alert("click");
          okSound.setParam("Gain", 1);
          okSound.setParam("play", 1);
          //msgbox.value="click played";

          var element = document.getElementById('overlay');
          if (! element) {
            console.log("got click on nonexistent element .... autoclick?");
            return;
          }
          element.parentNode.removeChild(element);

          uconfig.fire("submit");
          //c_id(); // call the callback when we have our info
          return false;
      }
   
      overlay_div.appendChild(inner_div);
      
      // Here, we must provide the name of the parent DIV on the main HTML page
      var attach_to = document.getElementById("wrap"), parentDiv = attach_to.parentNode;
      parentDiv.insertBefore(overlay_div, attach_to);
   
//    }
  
  utils.eventuality(uconfig); // so that we can fire an event when the SUBMIT button is pushed
  return uconfig;

  }
);
