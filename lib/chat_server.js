var socketio = require('socket.io'),
    io,
    guestNumber = 1,
    nickNames    = {},
    namesUsed    = [],
    currentRoom  = {};

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

function assignGuestName(socket,guestNumber,nickNames,namesUsed){
  var name = 'Гость_' + guestNumber;
  nickNames[socket.id] = name;

  socket.emit('nameResult',{
    success : true,
    name    : name
  });

  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket,room){
  socket.join(room);

  currentRoom[socket.id] = room;
  socket.emit('joinResult',{
    room    : room
  });

  socket.broadcast.to(room).emit('message',{
    text   : nickNames[socket.id] + ' зашел в комнату [' + room + '] в : '+showData()
  });

  var usersInRoom = io.sockets.clients(room);

  if (usersInRoom.length > 1){
    var usersInRoomSummary = 'Участники комнаты ['+ room + '] : ';

    for(index in usersInRoom){
      var userSocketId = usersInRoom[index].id;

      if (userSocketId != socket.id){
        if(index > 0){
          usersInRoomSummary += ', '+nickNames[userSocketId];
        } else {
          usersInRoomSummary += nickNames[userSocketId];
        }
      }
    }
    usersInRoomSummary += ' !';
    socket.emit('message',{
        text : usersInRoomSummary
    });

  }
}

function handleNameChangeAttempts(socket,nickNames,namesUsed){
  socket.on('nameAttempt',function(name){
    if( name.indexOf('Гость') == 0){
      socket.emit('nameResult',{
        success  : false,
        message : 'Имя не может начинаться со слова "Гость". Выберите другое! '
      });
    } else {
      if(namesUsed.indexOf(name) == -1){
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];

        socket.emit('nameResult',{
          success : true,
          name    : name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message',{
          text    : previousName + ' поменял имя на ' + name + ' в : '+showData()
        });

      } else {
        socket.emit('nameResult',{
          success  : false,
          message : 'Такое имя уже используется! Выберите другое! '
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket){
  socket.on('message',function(message){
    socket.broadcast.to(message.room).emit('message',{
      text   : '#'+nickNames[socket.id] + ' ['+showData()+'] : '+ message.text
    });
  });
}

function handleRoomJoining(socket){
  socket.on('join',function(room){
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket){
  socket.on('disconnect',function(){

    socket.broadcast.to(currentRoom[socket.id]).emit('message',{
      text   : nickNames[socket.id] + ' вышел! Из комнаты ['+currentRoom[socket.id]+']'
    });

    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
    namesUsed = namesUsed.filter(function(e){return e});


    /*setTimeout(function(){
      console.log(nickNames,namesUsed);
    },1000);*/

  });
}

exports.listen = function(server){
  io = socketio.listen(server);
  io.set('log level',1);

  io.sockets.on('connection',function(socket){
    guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);
    joinRoom(socket,'Лобби');
    handleMessageBroadcasting(socket,nickNames);
    handleNameChangeAttempts(socket,nickNames,namesUsed);
    handleRoomJoining(socket);

    socket.on('rooms',function(){
      socket.emit('rooms', io.sockets.manager.rooms);
    });

    handleClientDisconnection(socket,nickNames,namesUsed);

  });
};