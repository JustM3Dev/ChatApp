//const socket = io('ws://localhost:8080', { 'connect timeout': 5000 });
var socket = io.connect('ws://192.168.120.240:8088', { reconnectionAttempts: 5 });
var id = getID();
var name = checkName();
var auth = checkAuth();

$(document).ready(() => {
    if (getParameterByName('toast') != null) showToast(getParameterByName('toast'));

    setTimeout(() => {
        if (!socket.connected) {
            showToast("Our servers seem to be down... Please try again later.");
        }
    }, 1000);

    let disconnect = 0;
    let discInt = setInterval(() => {
        if (!socket.connected) {
            disconnect++;
            if (disconnect == 5) {
                $('#reconnectionModal').modal('show');
                clearInterval(discInt);
            }
        } else { disconnect = 0 }
    }, 6000);
});

console.log('Connecting...');
socket.on('connect', function () {
    console.log("Connected to server.");
    showToast('Connection successful!')
    console.log('Syncing messages with server...');

    console.log("connect socket id", id);
    socket.emit('init', { 'author': name, 'uuid': id })
    socket.emit('userExists', { uuid: id });
});

socket.on('disconnect', function () {
    console.log("You disconnected.");
    showToast('You got disconnected!');
    setTimeout(() => {
        window.location.reload();
    }, 2000)
});

socket.on('userExists', (data) => {
    console.log("uExists", data);
    if (data.uuid != id) return;
    if (!data.result) window.location.href = "/login";
});

socket.on('sync', (data) => {
    if (data.uuid != id) return;

    const box = $('#cbcontent');
    var content;

    for (msg of data.messages) {
        date = [new Date(msg.timestamp).getHours(), new Date(msg.timestamp).getMinutes()];
        for (i in date) {
            if (parseInt(date[i]) < 10) {
                date[i] = '0' + date[i];
            }
        }

        msg.displayTimestamp = `${date[0]}:${date[1]}`;

        if (msg.author_uuid == id) {
            content = $(`
                <div class="outgoing">
                    <div class="float-start">
                        You: ${msg.message}
                    </div>
                    <div class="float-end timestamp">${msg.displayTimestamp}</div>
                </div>
            `);
            /* <input type="image" class="float-end" onclick="messageMenu()" src="/menu.svg"></input> <-- 3dots menu */
        } else {
            content = $(`
                <div class="ingoing">
                    <div class="float-start">
                        ${msg.author_name}: ${msg.message}
                    </div>
                    <div class="float-end timestamp">${msg.displayTimestamp}</div>
                </div>
            `);
            /* <input type="image" class="float-end" onclick="messageMenu()" src="/menu.svg"></input> <-- 3dots menu */
        }
        box.append(content);
    }
    $('#cbcontent').removeClass('blur');
    $('#loader').hide();
});

socket.on('message', (data) => {
    const box = $('#chatbox');
    const boxContent = $('#cbcontent');
    var content;
    var date = [new Date(data.timestamp).getHours(), new Date(data.timestamp).getMinutes()];
    for (i in date) {
        if (parseInt(date[i]) < 10) {
            date[i] = '0' + date[i];
        }
    }

    data.displayTimestamp = `${date[0]}:${date[1]}`;
    if (data.uuid == id) {
        content = $(`
            <div class="outgoing">
                <div class="float-start">
                    You: ${data.message}
                </div>
                <div class="float-end timestamp">${msg.displayTimestamp}</div>
            </div>

            `);
    } else {
        content = $(`
            <div class="ingoing">
                <div class="float-start">
                    ${data.author}: ${data.message}
                </div>
                <div class="float-end timestamp">${msg.displayTimestamp}</div>
            </div>
            `);
    }
    boxContent.append(content);
    box.scrollTop(box[0].scrollHeight);
});

socket.on('error', (data) => {
    window.location.href = `/error/?code=${data.code}&message=${data.message}`;
});

$(document).on('keydown', function (e) {
    if (e.which == 13) {
        if ($('#msgInput').is(':focus')) {
            sendMsg();
        }
    }
});

$(document).submit(function () {
    sendMsg();
});

$(document).on('keyup', function (e) {
    if (e.which == 13) {
        if ($('#msgInput').is(':focus')) {
            sendMsg();
        }
    }
});

$(window).resize((e) => { $('#chatbox').scrollTop($('#chatbox')[0].scrollHeight); });

function sendMsg() {
    const msgInput = $('#msgInput');
    const msg = msgInput.val().trim();
    if (!msg.match(/^[.\n]*$/g)) {
        if (msg.length <= 257) {
            $('#msgInput').val('');
            socket.emit('message', { 'uuid': id, 'author': name, 'message': msg, 'timestamp': new Date() })
            msgInput.focus();
        } else {
            showToast('This message is too long. Max is 256.')
        }
    } else {
        return;
    }
}

function checkName() {
    var name = localStorage.getItem('displayName');
    if (name == null) {
        window.location.href = '/login/';
    } else {
        return name;
    }
}

function getID() {
    var uuid = localStorage.getItem('uuid');
    console.log("uuid getID()", uuid);
    if (uuid == null) {
        window.location.href = '/login/';
    }

    return parseInt(uuid, 10);
}

function genID() {
    return Math.floor(Math.random() * Math.floor(Math.random() * Date.now())) * 2;
}

function checkAuth() {
    var name = localStorage.getItem('displayName'),
    uuid = localStorage.getItem('uuid'),
    secret = localStorage.getItem('clientSecret'),
    refresh = localStorage.getItem('refreshToken');

    if (name == null || uuid == null || secret == null || refresh == null) {
        console.log("checkAuth null", name, uuid, secret, refresh);
        window.location.href = "/login";
    }
}

function showToast(message) {
    let toastID = Math.floor(Math.random() * 1000);
    let template = `<div id="toast-${toastID}" class="toast text-white bg-primary border-0 mt-2 me-2"><div class="d-flex"><div class="toast-body" id="toast-body-${toastID}">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div></div>`;

    $("#toasts").append(template)

    $(`#toast-body-${toastID}`).html(message);
    $(`#toast-${toastID}`).toast('show');
}

function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
