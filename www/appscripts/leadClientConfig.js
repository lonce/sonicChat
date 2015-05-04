/*  Mapps touch events to mouse events.
Just include this file in a require module, no need to call anything. 
*/

define(
  ["mods/utils"],
  function(utils){

    var uconfig = {
      "room": undefined
    };

//    uconfig.report = function(c_id) {
      var form = document.createElement("form", "report_form");
      form.id = "report_form";
      form.method = "post";
      form.action = "index.php?mode=post_comment";
   
      var reply_place = document.createElement("div");
      reply_place.id = "overlay";
      var inner_div = document.createElement("div"), button_close = document.createElement("button");
      button_close.id = "upprev_close";
      button_close.innerHTML = "x";
      button_close.onclick = function () {
          var element = document.getElementById('overlay');
          element.parentNode.removeChild(element);
      };
      inner_div.appendChild(button_close);
   
      var legend = document.createElement("legend");
      legend.id="legend";
      legend.innerHTML = "Choose one:";
      form.appendChild(legend);


      var roomdiv = document.createElement("roomdiv");
      roomdiv.type="div";
      roomdiv.id="roomdiv";
      roomdiv.innerHTML="Share a lightSwarm named:";


      var input3 = document.createElement("input");
      input3.type="text";
      input3.id="roomSelect";

      input3.addEventListener('change', function(e) {
          uconfig.room  = e.currentTarget.value;
          console.log("uconfig.room = " + uconfig.room);
      });

      roomdiv.appendChild(input3);



   
      var submit_btn = document.createElement("input", "the_submit");
      submit_btn.type = "submit";
      submit_btn.className = "submit";
      submit_btn.value = "Submit";
      form.appendChild(submit_btn);
   
      submit_btn.onclick = function () {
          var checked = false, formElems = this.parentNode.getElementsByTagName('input');
          for (var i = 0; i < formElems.length; i++) {
              if (formElems[i].type == 'radio' && formElems[i].checked == true) {
                  checked = true;
                  var el = formElems[i];
                  break;
              }
          }
          // if (!checked) return false; // prevents submission without having a radio button selected


          var element = document.getElementById('overlay');
          element.parentNode.removeChild(element);
          
          //c_id(); // call the callback when we have our info

          //var poststr = "c_id=" + c_id + "&reason=" + encodeURI(el.value);
          //alert(poststr);


          uconfig.fire("submit");
          return false;
      }
   
      form.appendChild(roomdiv);
      inner_div.appendChild(form);
      reply_place.appendChild(inner_div);

   
      // Here, we must provide the name of the parent DIV on the main HTML page
      var attach_to = document.getElementById("wrap"), parentDiv = attach_to.parentNode;
      parentDiv.insertBefore(reply_place, attach_to);

      var b=document.getElementById('roomSelect');
      b.style.userSelect="text";
      b.style.webkitUserSelect="text";
      b.style.MozUserSelect="text";
      b.style.userSelect="text";
      //b.setAttribute("unselectable", "off");
      b.focus();
   
//    }

  utils.eventuality(uconfig); // so that we can fire an event when the SUBMIT button is pushed  
  return uconfig;

  }
);
