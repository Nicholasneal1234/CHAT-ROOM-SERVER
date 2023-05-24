const app = require("express")();
const server = require("http").createServer(app);
const SocketServer = require("ws").Server;
// onlineUsersArr 正在線上的使用者
const onlineUsersObj = {};
// typingUsersArr 正在輸入文字的使用者
const typingUsersArr = [];

// 建立一個 wsServer 並且將其狀態存入 wss
const wss = new SocketServer({server});

// client side connection
wss.on("connection", (ws) => {
  console.log("client connected");

  ws.on("message", (data) => {
    const clientData = JSON.parse(data);
    if (!clientData) {
      return;
    }

    if (!clientData.toggleEvent) {
      console.log("沒有事件名稱，請再傳入的資料裡加上 toggleEvent 欄位");
      return;
    }

    wss.emit(clientData.toggleEvent, clientData);
  });

  // notice user who join in chat
  wss.on("addUser", (data) => {
    const { userName, userId } = data;
    
    console.log(`${userName}已連線`);  
    
    // talk client side who join in chat room
    const userInfo = {
      toggleEvent: "addUser",
      userName,
    };
    ws.send(JSON.stringify(userInfo));

    // update onlineUsersObj and talk client side who is online
    onlineUsersObj[userId] = data;
    const onlineUsers = {
      toggleEvent: "updateOnlineUsers",
      onlineUsersObj,
    };

    ws.send(JSON.stringify(onlineUsers));
  });

  // notice user who leave out chat
  wss.on("removeUser", (data) => {
    const { userName, userId } = data;
    
    console.log(`${userName}已離線`);
    
    // talk client side who leave out chat room
    const userInfo = {
      toggleEvent: "removeUser",
      userName,
    };
    ws.send(JSON.stringify(userInfo));
    
    // check users typing state before leave chat
    wss.emit("updateTypingUsersState", data);
    
    // update onlineUsersObj and talk client side who is online
    delete onlineUsersObj[userId];
    const onlineUsers = {
      toggleEvent: "updateOnlineUsers",
      onlineUsersObj,
    };

    ws.send(JSON.stringify(onlineUsers));
  });

  wss.on("getMessage", (data) => {
    ws.send(JSON.stringify(data));
  });

  // update users who are typing the text
  wss.on("updateTypingUsersState", (data) => {
    const userInfo = {
      toggleEvent: "updateTypingUsersState",
      userName: data.userName,
    };

    const matchIdx = typingUsersArr.findIndex((item) => item.userId === data.userId);
    
    // 如果有存在的 userId 代表使用者已經結束打字了
    if (matchIdx !== -1) {
      typingUsersArr.splice(matchIdx, 1, data);
      userInfo.typingUsersArr = typingUsersArr;
      ws.send(JSON.stringify(userInfo));
      return;
    }

    // 如果沒有則代表使用者正要打字
    typingUsersArr.push(data);
    userInfo.typingUsersArr = typingUsersArr;
    ws.send(JSON.stringify(userInfo));
    return;
  });

  ws.on("close", () => {
    console.log("close connected");
  });
});

server.listen('8080', function () {  
  console.log('server start on http://localhost:8080 port');
});