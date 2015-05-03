/*  Maps touch events to mouse events.
  To use:
    a) require this module,
    b) [yourObj].addEventListener("touchstart", touch2Mouse.touchHandler, true); 
*/

define(
  [],
  function(){

    var touch2Mouse={};

    touch2Mouse.touchHandler = function (event) { 
      var touches = event.changedTouches,
          first = touches[0],
          type = "";
           switch(event.type)
      {
          case "touchstart": type = "mousedown"; break;
          case "touchmove":  type="mousemove"; break;        
          case "touchend":   type="mouseup"; break;
          default: return;
      }

      var simulatedEvent = document.createEvent("MouseEvent");
      simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                first.screenX, first.screenY, 
                                first.clientX, first.clientY, false, 
                                false, false, false, 0, null); // second to last arg is "left"
                                                                      
      first.target.dispatchEvent(simulatedEvent);
      event.preventDefault();
    }

    return touch2Mouse;

  }
);
