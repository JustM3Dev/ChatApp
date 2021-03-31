const http = require('http').createServer();
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
const db = require('./db.js');

io.on('connection', (socket) => {

    /* db.clearDB(); */
    /* (Made for flushing both of the DB's) */

    socket.on('init', (data) => {
        if (typeof data.author != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'author' has to be type of string" }); return; }
        if (typeof data.uuid != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'uuid' has to be type of string" }); return; }
        if (typeof data.amount != 'number') { data.amount = 50 }

        console.log(`${data.author} (${data.uuid}) connected. Syncing messages...`);

        db.getMessages().then((res) => {
            db.getUsers().then((res) => {
                var users = [];
                for (user of res) {
                    users.push({
                        uuid: user['user_id'],
                        name: user['display_name']
                    });
                }

                handle(users);
            });

            function handle(users) {
                var msgs = [];
                for (i of res) {
                    var user = {};
                    for (usr of users) {
                        if (usr.uuid == i['author_id']) {
                            user = usr;
                        }
                    }

                    msgs.push({
                        id: i['id'],
                        chat_id: i['chat_id'],
                        message: i['message'],
                        author_uuid: i['author_id'],
                        author_name: user['name'],
                        timestamp: i['timestamp']
                    });
                }
                if (msgs.length > 50) msgs = msgs.slice(msgs.length - data.amount, msgs.length);
                io.emit('sync', { uuid: data.uuid, messages: msgs, timestamp: data.timestamp });
            }
        });
    });

    socket.on('message', (data) => {
        if (typeof data.author != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'author' has to be type of string" }); return; }
        if (typeof data.uuid != 'number') { io.emit('error', { 'code': 500, 'message': "The argument 'uuid' has to be type of number" }); return; }
        if (typeof data.message != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'message' has to be type of string" }); return; }
        if (typeof data.message.length > 256) { io.emit('error', { 'code': 500, 'message': 'Internal Server Error' }); return; }

        io.emit('message', { 'uuid': data.uuid, 'author': data.author, 'message': data.message, 'timestamp': data.timestamp });
        db.newMessage(0, data.message, parseInt(data.uuid));
    });

    socket.on('registerUser', (data) => {
        if (typeof data.secret != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'secret' has to be type of string" }); return; }
        if (typeof data.refresh != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'refresh' has to be type of string" }); return; }
        if (typeof data.displayName != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'displayName' has to be type of string" }); return; }
        if (typeof data.uuid != 'number') { io.emit('error', { 'code': 500, 'message': "The argument 'uuid' has to be type of number" }); return; }

        db.getUser(data.uuid).then((exists) => {
            if (exists != null) return;
            else {
                db.createUser(parseInt(data.uuid), data.displayName, data.secret, data.refresh).then(() => {
                    io.emit('registeredUser', { uuid: data.uuid });
                    console.log('registered user successfully')
                }).catch((err) => {
                    console.log(err.stack);
                    socket.emit('error', { code: 500, message: 'Internal Server Error' });
                });
            }
        });
    });

    socket.on('userExists', (data) => {
        if (typeof data.uuid != 'number') { io.emit('error', { 'code': 500, 'message': "The argument 'uuid' has to be type of number" }); return; }

        db.getUser(data.uuid).then((exists) => {
            if (exists == null) io.emit('userExistsResult', { uuid: data.uuid, result: false });
            else io.emit('userExistsResult', { uuid: data.uuid, result: true });
        });
    });
});

http.listen(8080, "192.168.4.48", () => console.log('listening on http://192.168.0.48:8080'));