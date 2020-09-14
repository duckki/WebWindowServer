const http = require('http');
const fs = require('fs');
const { createCanvas } = require('canvas')
const reverseHttp = require('reverse-http')

console.log( "app:", "initializing." )

function debugLog()
{
    console.log( "debug:", ...arguments )
}

// Test HTML page
const index_page = "<html><body>"
                 + "<p>Test client index page"
                 + "<p>Date: " + new Date().toDateString()
                 + "<p>Time: " + new Date().toTimeString()
                 + "<p><img src=\"test.jpg\">"
                 + "</body></html>"

// Returns a Buffer with a PNG image.
function createTestPngImage()
{
    const width = 600
    const height = 250

    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')

    context.fillStyle = '#999'
    context.fillRect(0, 0, width, height)

    const text = 'Generated\nTest\nImage\n'
               + new Date().toDateString() + "\n"
               + new Date().toTimeString()
    context.font = 'bold 20pt Verdana'
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillStyle = '#000'
    context.fillText(text, 20, 20)

    return canvas.toBuffer('image/png')
}

// Connection options
const opts = {
    hostname: 'localhost',
    port: 6078,
    method: 'GET',
    path: '/'
}

// Open an HTTP connection to example.com and accept reverse HTTP
// requests back to this machine
const conn = reverseHttp(opts, function (req, res) {
    console.log( 'incoming request:', req.method, req.url)

    if( req.url == "/" ) {
        res.writeHead(200, {
            'Content-Type': 'text/html'
        })

        res.end(index_page)
    }
    else if( req.url == "/test.jpg" ) {
        const img_buf = createTestPngImage()
        res.setHeader('Content-Type', 'image/png');
        res.end(img_buf);
    }
    else {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 404;
        res.end('Not found');
    }
})

// This is necessary to keep the connection alive (maybe one of them).
conn.keepAliveTimeout = 0
conn.timeout = 0

conn._socket.on('end', () => {
    console.log( "app:", "connection ended" )
    process.exit(0)
})

conn._socket.on('close', () => {
    console.log( "app:", "connection closed" )
    process.exit(0)
})

console.log( "app:", "started." )
