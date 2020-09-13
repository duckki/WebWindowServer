# Web Window Server

## Overview
Web Window Server ("WWS" for short) is a desktop app that accepts incoming network connections from remote client applications and display their web pages. Once connected, WWS sends HTTP requests to clients and clients can serve dynamic web pages. In other words, WWS acts like a web browser and clients act like web servers except the orientation of connection is reversed.

It's similar to X Window System where an X display server accepts network connections from remote client applications, except that X Window clients sends pixels to the display server and receives keyboard/mouse events.

The main usage is for applications running on a remote server to display dynamic web pages on local desktop just like launching a X Window application, but more efficiently.


## Protocol

The current proposal is to use Reverse-HTTP protocol. In this scheme, WWS runs a HTTP server, and clients can request to upgrade the protocol to Reverse-HTTP. Once upgraded, the request-response direction is reversed. WWS sends requests to the client using the same underlying TCP connection and the client can serve web content.

Reverse-HTTP spec: https://tools.ietf.org/id/draft-lentczner-rhttp-00.html

For security, some authentication mechanism (similar to X-Auth) will be needed to ensure all network connections are initiated by the WWS user (TBD).


## Implenentation

WWS is currently implemented in JavaScript using Electron/Node.js.

### Plan to reach the minimum viable product status
- [Done] Proof-of-Concept UI
- [Done] Reverse-HTTP connection
- OpenSSH port forwarding
- Network authentication
- Improve protocol so clients can configure window size and other UI settings
- Window/connection manager
- Build installers for major platforms
- Implement a stock client app for various immediate use
    - Ability to serve a static web content in a file or in a directory.
    - And more

### Plan for future enhancement
- Upgrade to HTTP/2
