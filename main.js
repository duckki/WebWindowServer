// Web Window Server

//////////////////////////////////////////////////////////////////////////////
// Module imports

console.log( "app: initializing." );

const { app, protocol, session, BrowserWindow } = require('electron')
const http = require('http');
const url = require('url');
const { HTTPParser } = require('http-parser-js');


//////////////////////////////////////////////////////////////////////////////
// Debugging

verbose = false

function debugLog()
{
    console.log( "debug:", ...arguments )
}


//////////////////////////////////////////////////////////////////////////////
// WSession - Per-session data

class WSession {
    constructor( partition, sock ) {
        this.partition = partition
        this.socket = sock
        this.responseCallbackQueue = []
    }

    toString() {
        return "[" + this.socket.remoteAddress + ":" + this.socket.remotePort
             + " " + this.partition
             + "]"
    }

    queueCallback( callback ) {
        this.responseCallbackQueue.push( callback )
    }

    onMessage( arg ) {
        const callback = this.responseCallbackQueue[0]
        callback( arg )
        this.responseCallbackQueue.shift()
    }
}

// translate the `ptth://` request into a HTTP request
function handlePtthProtocol( wws_session, req, callback ) {
    debugLog( wws_session + " handlePtthProtocol: " + req.url )
    const url_obj = new url.URL( req.url )
    const req_path = url_obj.pathname

    const socket = wws_session.socket
    socket.write('GET ' + req_path + ' HTTP/1.1\r\n\r\n')

    // TODO: check the return value from `write`

    wws_session.queueCallback( callback )
}

function initSocketDataHandler( wws_session )
{
    // per-session data
    const parser = new HTTPParser(HTTPParser.RESPONSE)
    var contentType
    var contentBody

    parser.onHeadersComplete = function(res) {
        contentType = "text/plain" // default
        contentBody = Buffer.alloc(0)

        debugLog( wws_session + " receiving response: " + res.statusCode + " " + res.statusMessage )
        if( verbose ) {
            for( var k in res ) {
                debugLog( "  " + k + ": " + res[k] )
            }
        }
        //debugLog("headers:")
        for( var i=0; i<res.headers.length; i+=2 ) {
            const header_key = res.headers[i]
            const header_val = res.headers[i+1]
            //debugLog( "  " + header_key + ": " + header_val )
            if( header_key == "Content-Type" ) {
                contentType = header_val
            }
        }
    }

    parser.onBody = function(chunk, offset, length) {
        const data = Buffer.from( chunk.buffer, offset, length )
        contentBody = Buffer.concat( [contentBody, data] )
    }

    parser.onMessageComplete = function() {
        debugLog( wws_session + " completed response message (" + contentType + ", size: " + contentBody.length + ")" )
        wws_session.onMessage( { mimeType: contentType, data: contentBody } )
    }

    wws_session.socket.on( 'data', function(data) {
        parser.execute( data )
    })
}

function createSessionWindow( wws_session ) {
    console.log( wws_session + " creating session window." );

    // Create the browser window.
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            worldSafeExecuteJavaScript: true,
            partition: wws_session.partition
        }
    })

    if( verbose ) {
        win.webContents.openDevTools();
    }

    const sock = wws_session.socket
    sock.on( 'end', () => {
        console.log( wws_session + " connection ended." );
        if( ! win.isDestroyed() ) {
            win.destroy()
        }
    })
    sock.on( 'close', () => {
        console.log( wws_session + " connection closed." );
        if( ! win.isDestroyed() ) {
            win.destroy()
        }
    })

    win.on( 'closed', () => {
        wws_session.socket.destroy()
    })

    console.log( wws_session + " loading initial page" )
    win.loadURL('ptth://localhost/') // default url
}

function initSession( socket )
{
    // create a new partition & session object
    const partition = Math.random().toString(36).substring(2, 15)
    const wws_session = new WSession( partition, socket )

    // "ptth" protocol handler
    const ses = session.fromPartition( partition )
    ses.protocol.registerBufferProtocol('ptth', (req, callback) => {
        handlePtthProtocol( wws_session, req, callback );
    })

    // setup socket data handlers
    initSocketDataHandler( wws_session )

    // create a new session window
    createSessionWindow( wws_session );
}


//////////////////////////////////////////////////////////////////////////////
// Reverse-HTTP server

function socketName(socket)
{
    return "[" + socket.remoteAddress + ':' + socket.remotePort + "]"
}

const server = http.createServer(function (req, res) {
    debugLog( socketName(req.socket), 'unexpected HTTP request: ' + req.method + " " + req.url )
    req.destroy()
})

server.keepAliveTimeout = 0
server.timeout = 0

server.on( 'connection', ( socket ) => {
    debugLog( socketName(socket), 'incoming connection' )
})

server.on( 'upgrade', function( req, socket, head ) {
    debugLog( socketName(socket), "upgrade requested: " + req.method + " " + req.url )

    // TODO: verify request

    // acknowledge upgrade
    socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: PTTH/1.0\r\n' +
        'Connection: Upgrade\r\n' +
        '\r\n')

    initSession( socket );
})


//////////////////////////////////////////////////////////////////////////////
// Main window
// - Currently, this is just a splash window.
// - In future, this may be used for window management (hidden by default).

function createMainWindow() {
    console.log( "app: creating main window." );

    // Create the browser window.
    const win = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            worldSafeExecuteJavaScript: true,
            nodeIntegration: false
        }
    })

    if( verbose ) {
        win.webContents.openDevTools();
    }

    win.loadFile('main-window.html')
}


//////////////////////////////////////////////////////////////////////////////
// Initialization

protocol.registerSchemesAsPrivileged([
    {
        scheme: 'ptth',
        privileges: {
            standard: true // allow relative URLs
        }
    }
])

const ServerPort = 6078 // An unassigned port number
// For current assignments, see https://www.iana.org/assignments/service-names-port-numbers

function startServer()
{
    console.log( "app: starting http server." );
    // Binding interface is "localhost" for security reasons.
    server.listen( ServerPort, "localhost" )
}

app.whenReady().then(createMainWindow)
               .then(startServer)

console.log( "app: finished initialization." );


//////////////////////////////////////////////////////////////////////////////
// Copyright 2020 Duckki Oe
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
