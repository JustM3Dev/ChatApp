const http = require('http').createServer();
const io = require('socket.io')(http, {
    cors: { origin: "*" }
});
const db = require('./db.js');

io.on('connection', (socket) => {

    /* db.clearDB(); */
    /* (Made for flushing both of the DB's) */

    /* Initialize */
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

    /* Messaging */
    socket.on('message', (data) => {
        if (typeof data.author != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'author' has to be type of string" }); return; }
        if (typeof data.uuid != 'number') { io.emit('error', { 'code': 500, 'message': "The argument 'uuid' has to be type of number" }); return; }
        if (typeof data.message != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'message' has to be type of string" }); return; }
        if (typeof data.message.length > 256) { io.emit('error', { 'code': 500, 'message': 'Internal Server Error' }); return; }

        io.emit('message', { 'uuid': data.uuid, 'author': data.author, 'message': data.message, 'timestamp': data.timestamp });
        db.newMessage(0, data.message, parseInt(data.uuid));
    });

    /* Authentication */
    socket.on('registerAuth', (data) => {
        console.log("A unknown user is in the register queue.")
    });

    socket.on('registerUser', (data) => {
        if (typeof data.secret != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'secret' has to be type of string" }); return; }
        if (typeof data.refresh.value != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'refresh.value' has to be type of string" }); return; }
        if (typeof data.displayName != 'string') { io.emit('error', { 'code': 500, 'message': "The argument 'displayName' has to be type of string" }); return; }
        if (typeof data.uuid != 'number') { io.emit('error', { 'code': 500, 'message': "The argument 'uuid' has to be type of number" }); return; }
        if (data.displayName.length > 9 || data.displayName.length < 3) { io.emit('error', { 'code': 500, 'message': "The argument 'displayName' has to be longer then 3 chars and shorter then 9 chars" }); return; }
        if (!data.secret.match(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/g)) { io.emit('error', { 'code': 500, 'message': "The uuid for 'secret' has to be in the uuid4 format." }); return; }
        
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