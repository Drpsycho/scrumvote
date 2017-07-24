var myid = "0"; //TODO
var MeIsScrumMaster = false;

var msgparser = function(event) {

    var msg = JSON.parse(event.data);
    if (msg.Cmd === "update") {
        var mean = 0;
        var min = 99;
        var max = 0;
        var teamate = 0;
        var already_voted = 0;
        var ScrumMasterExist = false;
        for (var it = 0; it < msg.Users.length; it++) {
            if (!MeIsScrumMaster && msg.Users[it].ScrumMaster) {
                if (msg.Users[it].Id === myid) {
                    MeIsScrumMaster = true;
                    document.querySelector('#reset-btn').innerText = "Reset";
                } 
                ScrumMasterExist = true;
            }

            if (!msg.Users[it].Ghost) {
                var Value = msg.Users[it].Value;
                min = Math.min(min, Value);
                max = Math.max(max, Value);
                mean += Value;

                teamate++;
                if (Value != 0) {
                    already_voted++;
                }
            }
        }
        
        if( ScrumMasterExist && !MeIsScrumMaster ){
        	document.querySelector('#reset-btn').setAttribute('disabled', true);
        } else {
        	document.querySelector('#reset-btn').removeAttribute('disabled');
        }

        if (teamate === 0) {
            mean = 0
        } else {
            mean /= already_voted === 0 ? 1 : already_voted;
        }

        if (already_voted === teamate) {
            document.getElementById("minmax").innerHTML = "Min/max: " + min + "/" + max
            document.getElementById("result").innerHTML = "Res: " + Math.round(mean);
        } else {
            document.getElementById("minmax").innerHTML = "Min,max: " + 0;
            document.getElementById("result").innerHTML = "Res: voted " + already_voted + " from " + teamate;
        }
        document.getElementById("users").innerHTML = "Teamate: " + teamate;
    }

    if (msg.Cmd === "setid") {
        myid = msg.User.Id;
    }
};

var wsopen = function() {
    console.log("WS connected.");
};

var sendtoserver;
var socket;

var InitWS = function() {
    socket = new WebSocket("ws://127.0.0.1:9001/handler");
    socket.onopen = wsopen;
    socket.onmessage = msgparser;
    sendtoserver = function(_data_) {
        socket.send(_data_);
    };

    socket.onerror = function(error) {
        document.getElementById("result").innerHTML = 'ERROR !!!'
        document.getElementById("users").innerHTML = ' Try to reload page! '
        document.getElementById("minmax").innerHTML = 'error msg: ' + error.message
    };

    socket.onclose = function(event) {
        if (event.wasClean) {
            console.log('WS closed');
        } else {
            console.log('WS closed with problem');
        }

        document.getElementById("result").innerHTML = ' Connection closed!!! '
        document.getElementById("users").innerHTML = ' Try to reload page! '
        document.getElementById("minmax").innerHTML = 'Error code: ' + event.code + ' The reason: ' + event.reason
    };

    socket.onopen = function() {
        var response_ = {
            'Cmd': "reg",
            'User': {
                'Ghost': true
            }
        };
        sendtoserver(JSON.stringify(response_));
    };
}

$(window).ready(function() {
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
        var u = 0;
        var response_;
        if (this.innerText === "Reset") {
            response_ = {
                'Cmd': "reset"
            };
        } else {
            response_ = {
                'Cmd': "im_scrum_master"
            };
        }
        sendtoserver(JSON.stringify(response_));
    });

    $('#toggle-event').change(function() {
        var response_;
        if ($(this).prop('checked')) {
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