
var myid = "0";//TODO

var msgparser = function(event) {

	var msg = JSON.parse(event.data);
    if (msg.Cmd === "update"){
    	var mean = 0;
    	var min = 99;
    	var max = 0;
    	var teamate = 0;
    	var already_voted = 0;
    	for (var it = 0 ; it < msg.Users.length; it++){
    		if (!msg.Users[it].Ghost){
    			var Value = msg.Users[it].Value;
    			min = Math.min(min, Value);
    			max = Math.max(max, Value);
    			mean += Value;
    			
    			teamate++;
    			if (Value != 0){
    				already_voted ++;
    			}
    		}
    	}
    	if(teamate === 0){
    		mean = 0
    	} else {
    		mean /= already_voted === 0 ? 1 : already_voted;
    	}
    	if ($('#toggle-event').prop('checked')){
    		if (already_voted === teamate){
				document.getElementById("minmax").innerHTML = "Min,max: " + min + "," + max 
		    	document.getElementById("result").innerHTML = "Res: "+ Math.round(mean);
	    	} else {
	    		document.getElementById("minmax").innerHTML = "Min,max: " + 0; 
		    	document.getElementById("result").innerHTML = "Res: voted "+ already_voted + " from " + teamate;
	    	}
		    document.getElementById("users").innerHTML = "Users(t:gh): "+ teamate + ":" + (msg.Users.length - teamate);
    	} else {
			document.getElementById("minmax").innerHTML = "Min,max: " + min + "," + max 
	    	document.getElementById("users").innerHTML = "Users(t:gh): "+ teamate + ":" + (msg.Users.length - teamate);
	    	document.getElementById("result").innerHTML = "Res: "+ Math.round(mean);
    	}
    }
};

var wsopen = function() {
        console.log("Соединение установлено.");
};

var sendtoserver;
var socket;
  
var InitWS = function() {
    // socket = new WebSocket("ws://kharisov.me:9001/handler");
    socket = new WebSocket("ws://127.0.0.1:9001/handler");
    socket.onopen = wsopen; 
    socket.onmessage = msgparser;
    sendtoserver = function(_data_){
    	socket.send(_data_);
    };

    socket.onerror = function(error) {
        console.log("Ошибка " + error.message);
    };

    socket.onclose = function(event) {
        if (event.wasClean) {
           	console.log('Соединение закрыто чисто');
        } else {
            console.log('Обрыв соединения'); // например, "убит" процесс сервера
        }
        console.log('Код: ' + event.code + ' причина: ' + event.reason);
    };
    
    socket.onopen = function () {
    	var response_ = {
				'Cmd': "reg",
				'User': {
					'Ghost': true
				}
		};
		sendtoserver(JSON.stringify(response_));
    };
} 

$(window).ready(function(){
	var elements = document.querySelectorAll('#vote_btn');
	for (var i = 0; i < elements.length; i++) {
		elements[i].addEventListener("click", function() {
			$('#toggle-event').prop('checked', true).change();
			var response_ = {
				'Cmd': "update",
				'User': {
					'Id': myid,
					'Value': Number($(this).context.innerText),
					'Ghost': false
				}
			};
			sendtoserver(JSON.stringify(response_));
	 	});
	}
	
	document.querySelector('#reset-btn').addEventListener("click", function() {
		var response_ = {
				'Cmd': "reset"
		};
		sendtoserver(JSON.stringify(response_));
	});

	$('#toggle-event').change(function() {
		var response_;
		if ( $(this).prop('checked') ){
			response_ = {
				'Cmd': "chage_state",
				'User': {
					'Ghost': false
				}
			};
		} else {
			response_ = {
				'Cmd': "chage_state",
				'User': {
					'Ghost': true
				}
			};	
		}
		sendtoserver(JSON.stringify(response_));
	})

});

$(window).ready(InitWS());
