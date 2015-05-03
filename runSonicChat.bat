START /MIN /B CMD /C CALL "node" sonicChatServer.js 8080
START "" "http://localhost:8080/leadClient.html"
echo "Hello from SonicChat - server started, and leadClient fired up."
