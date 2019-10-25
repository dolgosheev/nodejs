function divEscapedContentElement(message,_msg){
  var msg = $('<div></div>').text(message);
  if(_msg !== undefined){
    var msg_cnf = $(msg).prepend( "<b>"+$("#you").text()+" </b> ["+showData()+"] : " );
  }
  return msg_cnf ? msg_cnf : msg;
}

function divSystemContentElement(message){
  return $('<div></div>').html('<i>'+message+'</i>');
}

function zero(i){
        i < 10  ?  result ="0"+i  :  result = i  ;
        return result ;
}

function showData(){
        var data = new Date(),
            h = zero(data.getHours()),
            min = zero(data.getMinutes()),
            s = zero(data.getSeconds()),
            d = zero(data.getDate()),
            mon = zero(data.getMonth()+1),
            y = data.getFullYear();
        return fullData = d+"."+mon+"."+y+" | "+h+":"+min+":"+s;
}

function processUserInput(chatApp, socket){
  var message = $('#send-message').val();
  var systemMessage;

  if(message.charAt(0) == "/"){
    systemMessage = chatApp.processCommand(message);
    if(systemMessage){
      $('#messages').append(divSystemContentElement(systemMessage));
    }
  } else {
    chatApp.sendMessage( $('#room').text() , message);
    $('#messages').append(divEscapedContentElement(message,true));
    $('#messages').scrollTop( $('#messages').prop('scrollHeight') );
  }

  $('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function(){

  var chatApp = new Chat(socket);

  socket.on('nameResult',function(result){
    var message;

    if(result.success){
      message = 'Ваше имя сейчас '+result.name;
    } else {
      message = result.message;
    }

    $('#messages').append(divSystemContentElement(message));
    $('#you').text(result.name);
  });

  socket.on('joinResult',function(result){
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('Вы зашли в комнату ['+result.room+'] !'));
  });

  socket.on('message',function(message){
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  socket.on('rooms',function(rooms){
    $('#room-list').empty();

    for(var room in rooms){
      room = room.substring(1,room.length);
      if(room !=''){
        $('#room-list').append(divEscapedContentElement(room));
      }
    }

    $('#room-list div').on('click',function(){
      chatApp.processCommand('/join '+$(this).text());
      $('#send-message').focus();
    });

  });

  setInterval(function(){
    socket.emit('rooms');
  },1000);

  $('#send-message').focus();

  $('#send-form').submit(function(){
    processUserInput(chatApp,socket);
    return false;
  });

});